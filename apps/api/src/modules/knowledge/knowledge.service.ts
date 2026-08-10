import type { UserRole } from '@longeviq/shared';
import type { KnowledgeDocument as KnowledgeDocumentModel } from '@prisma/client';
import type {
  CreateKnowledgeDocumentInput,
  KnowledgeDocumentDetail,
  KnowledgeDocumentListResult,
  KnowledgeSearchResult,
  UpdateKnowledgeDocumentInput,
} from '@longeviq/shared';
import { AppError } from '../../utils/app-error.js';
import { chunkMarkdown, type TextChunk } from './chunking/text-chunker.js';
import type {
  AuditSink,
  KnowledgeDocumentWithChunks,
  KnowledgeRepository,
} from './knowledge.repository.types.js';

export interface RequestContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class KnowledgeService {
  constructor(
    private readonly repository: KnowledgeRepository,
    private readonly audit?: AuditSink,
    private readonly maxContentChars = 1_000_000,
  ) {}

  async search(query: {
    q: string;
    limit: number;
    category?: string;
  }): Promise<{ results: KnowledgeSearchResult[] }> {
    const results = await this.repository.search({
      query: query.q,
      limit: query.limit,
      category: query.category as CreateKnowledgeDocumentInput['category'] | undefined,
    });
    return { results };
  }

  async listDocuments(
    role: UserRole,
    query: {
      page: number;
      limit: number;
      category?: string;
      status?: string;
    },
  ): Promise<KnowledgeDocumentListResult> {
    const isAdmin = role === 'ADMIN';
    const { items, total } = await this.repository.listDocuments({
      page: query.page,
      limit: query.limit,
      category: query.category as CreateKnowledgeDocumentInput['category'] | undefined,
      // Non-admins can only browse published documents.
      status: isAdmin
        ? (query.status as CreateKnowledgeDocumentInput['status'] | undefined)
        : 'PUBLISHED',
    });

    return {
      items: items.map(serializeDocument),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getDocument(role: UserRole, id: string): Promise<KnowledgeDocumentDetail> {
    const document = await this.repository.findDocumentByIdWithChunks(id);
    if (!document) {
      throw AppError.notFound('Knowledge document not found.');
    }
    if (role !== 'ADMIN' && document.status !== 'PUBLISHED') {
      throw AppError.notFound('Knowledge document not found.');
    }
    return serializeDocumentDetail(document);
  }

  async createDocument(
    userId: string,
    role: UserRole,
    input: CreateKnowledgeDocumentInput,
    ctx: RequestContext = {},
  ): Promise<KnowledgeDocumentDetail> {
    this.requireAdmin(role);
    if (input.content.length > this.maxContentChars) {
      throw AppError.badRequest('Content is too large.');
    }

    const existing = await this.repository.findDocumentBySlug(input.slug);
    if (existing) {
      throw AppError.conflict('A knowledge document with this slug already exists.');
    }

    const document = await this.repository.createDocument({
      slug: input.slug,
      title: input.title,
      summary: input.summary ?? null,
      category: input.category,
      source: input.source ?? null,
      status: input.status,
      language: input.language,
      createdBy: userId,
    });

    const chunks = chunkMarkdown(input.content).map((chunk) => ({
      chunkIndex: chunk.index,
      title: chunk.title,
      content: chunk.content,
    }));
    await this.repository.replaceChunks(document.id, chunks);

    await this.audit?.recordAudit({
      userId,
      action: 'DATA.KNOWLEDGE_CREATE',
      entity: 'KnowledgeDocument',
      entityId: document.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { slug: document.slug, category: document.category, chunkCount: chunks.length },
    });

    const detail = await this.requireDocumentDetail(document.id);
    return serializeDocumentDetail(detail);
  }

  async updateDocument(
    userId: string,
    role: UserRole,
    id: string,
    input: UpdateKnowledgeDocumentInput,
    ctx: RequestContext = {},
  ): Promise<KnowledgeDocumentDetail> {
    this.requireAdmin(role);
    const existing = await this.requireDocument(id);

    let chunks: TextChunk[] | undefined;
    if (input.content !== undefined) {
      if (input.content.length > this.maxContentChars) {
        throw AppError.badRequest('Content is too large.');
      }
      chunks = chunkMarkdown(input.content);
    }

    const updated = await this.repository.updateDocument(id, {
      title: input.title ?? existing.title,
      summary: input.summary === undefined ? existing.summary : input.summary,
      category: input.category ?? existing.category,
      source: input.source === undefined ? existing.source : input.source,
      status: input.status ?? existing.status,
    });
    if (!updated) {
      throw AppError.notFound('Knowledge document not found.');
    }

    if (chunks) {
      await this.repository.replaceChunks(
        updated.id,
        chunks.map((chunk) => ({
          chunkIndex: chunk.index,
          title: chunk.title,
          content: chunk.content,
        })),
      );
    }

    await this.audit?.recordAudit({
      userId,
      action: 'DATA.KNOWLEDGE_UPDATE',
      entity: 'KnowledgeDocument',
      entityId: updated.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { slug: updated.slug, chunkCount: chunks?.length },
    });

    const detail = await this.requireDocumentDetail(updated.id);
    return serializeDocumentDetail(detail);
  }

  async deleteDocument(
    userId: string,
    role: UserRole,
    id: string,
    ctx: RequestContext = {},
  ): Promise<void> {
    this.requireAdmin(role);
    await this.requireDocument(id);
    await this.repository.deleteDocument(id);

    await this.audit?.recordAudit({
      userId,
      action: 'DATA.KNOWLEDGE_DELETE',
      entity: 'KnowledgeDocument',
      entityId: id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  }

  private requireAdmin(role: UserRole): void {
    if (role !== 'ADMIN') {
      throw AppError.forbidden('Only administrators can manage the knowledge base.');
    }
  }

  private async requireDocument(id: string) {
    const document = await this.repository.findDocumentById(id);
    if (!document) {
      throw AppError.notFound('Knowledge document not found.');
    }
    return document;
  }

  private async requireDocumentDetail(id: string): Promise<KnowledgeDocumentWithChunks> {
    const document = await this.repository.findDocumentByIdWithChunks(id);
    if (!document) {
      throw AppError.notFound('Knowledge document not found.');
    }
    return document;
  }
}

function serializeDocument(document: KnowledgeDocumentModel) {
  return {
    id: document.id,
    slug: document.slug,
    title: document.title,
    summary: document.summary,
    category: document.category,
    source: document.source,
    status: document.status,
    language: document.language,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

export function serializeDocumentDetail(
  document: KnowledgeDocumentWithChunks,
): KnowledgeDocumentDetail {
  return {
    ...serializeDocument(document),
    chunks: document.chunks.map((chunk) => ({
      id: chunk.id,
      documentId: chunk.documentId,
      chunkIndex: chunk.chunkIndex,
      title: chunk.title,
      content: chunk.content,
      createdAt: chunk.createdAt.toISOString(),
    })),
  };
}
