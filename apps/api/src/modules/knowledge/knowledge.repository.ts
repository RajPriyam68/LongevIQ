import { Prisma } from '@prisma/client';
import type { KnowledgeDocument as KnowledgeDocumentModel } from '@prisma/client';
import type { KnowledgeSearchResult } from '@longeviq/shared';
import { prisma } from '../../db/prisma.js';
import type {
  KnowledgeChunkInput,
  KnowledgeDocumentCreateData,
  KnowledgeDocumentUpdateData,
  KnowledgeRepository,
  KnowledgeSearchFilter,
  KnowledgeDocumentWithChunks,
  ListKnowledgeDocumentsFilter,
} from './knowledge.repository.types.js';

interface SearchRow {
  chunkId: string;
  documentId: string;
  slug: string;
  documentTitle: string;
  category: string;
  source: string | null;
  chunkIndex: number;
  title: string | null;
  snippet: string;
  content: string;
  score: number;
}

function rowToSearchResult(row: SearchRow): KnowledgeSearchResult {
  return {
    chunkId: row.chunkId,
    documentId: row.documentId,
    slug: row.slug,
    documentTitle: row.documentTitle,
    category: row.category as KnowledgeSearchResult['category'],
    source: row.source,
    chunkIndex: row.chunkIndex,
    title: row.title,
    snippet: row.snippet,
    content: row.content,
    score: Math.round(row.score * 10000) / 10000,
  };
}

export class PrismaKnowledgeRepository implements KnowledgeRepository {
  async createDocument(input: KnowledgeDocumentCreateData): Promise<KnowledgeDocumentModel> {
    return prisma.knowledgeDocument.create({ data: input });
  }

  async findDocumentById(id: string): Promise<KnowledgeDocumentModel | null> {
    return prisma.knowledgeDocument.findUnique({ where: { id } });
  }

  async findDocumentBySlug(slug: string): Promise<KnowledgeDocumentModel | null> {
    return prisma.knowledgeDocument.findUnique({ where: { slug } });
  }

  async listDocuments(
    filter: ListKnowledgeDocumentsFilter,
  ): Promise<{ items: KnowledgeDocumentModel[]; total: number }> {
    const where: Prisma.KnowledgeDocumentWhereInput = {
      ...(filter.category ? { category: filter.category } : {}),
      ...(filter.status ? { status: filter.status } : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.knowledgeDocument.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      prisma.knowledgeDocument.count({ where }),
    ]);
    return { items, total };
  }

  async updateDocument(
    id: string,
    input: KnowledgeDocumentUpdateData,
  ): Promise<KnowledgeDocumentModel | null> {
    try {
      return await prisma.knowledgeDocument.update({ where: { id }, data: input });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
      }
      throw error;
    }
  }

  async deleteDocument(id: string): Promise<void> {
    await prisma.knowledgeDocument.delete({ where: { id } });
  }

  async findDocumentByIdWithChunks(id: string): Promise<KnowledgeDocumentWithChunks | null> {
    return prisma.knowledgeDocument.findUnique({
      where: { id },
      include: { chunks: { orderBy: { chunkIndex: 'asc' } } },
    });
  }

  async replaceChunks(documentId: string, chunks: KnowledgeChunkInput[]): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.knowledgeChunk.deleteMany({ where: { documentId } });
      if (chunks.length === 0) {
        return;
      }
      await tx.knowledgeChunk.createMany({
        data: chunks.map((chunk) => ({
          documentId,
          chunkIndex: chunk.chunkIndex,
          title: chunk.title ?? null,
          content: chunk.content,
        })),
      });
      // Prisma cannot write the Unsupported("tsvector") column, so the search
      // vector is computed by Postgres after the rows exist.
      await tx.$executeRaw`
        UPDATE "KnowledgeChunk"
        SET "searchVector" = to_tsvector('english', content)
        WHERE "documentId" = ${documentId}
      `;
    });
  }

  async search(filter: KnowledgeSearchFilter): Promise<KnowledgeSearchResult[]> {
    const categoryFilter = filter.category
      ? Prisma.sql`AND d.category = ${filter.category}::"KnowledgeCategory"`
      : Prisma.empty;

    const rows = await prisma.$queryRaw<SearchRow[]>`
      SELECT
        c.id AS "chunkId",
        c."documentId",
        d.slug,
        d.title AS "documentTitle",
        d.category,
        d.source,
        c."chunkIndex",
        c.title,
        COALESCE(
          ts_headline('english', c.content, query,
            'StartSel=<mark>, StopSel=</mark>, MaxWords=40, MinWords=15, ShortWord=3, HighlightAll=false'),
          left(c.content, 240)
        ) AS snippet,
        c.content,
        ts_rank_cd(c."searchVector", query) AS score
      FROM "KnowledgeChunk" c
      JOIN "KnowledgeDocument" d ON d.id = c."documentId"
      CROSS JOIN websearch_to_tsquery('english', ${filter.query}) AS query
      WHERE d.status = 'PUBLISHED'::"KnowledgeStatus"
        AND c."searchVector" @@ query
        ${categoryFilter}
      ORDER BY score DESC, c."chunkIndex" ASC
      LIMIT ${filter.limit}
    `;

    return rows.map(rowToSearchResult);
  }
}
