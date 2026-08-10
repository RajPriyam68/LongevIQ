import type {
  KnowledgeCategory,
  KnowledgeChunk as KnowledgeChunkModel,
  KnowledgeDocument as KnowledgeDocumentModel,
  KnowledgeStatus,
} from '@prisma/client';
import type { KnowledgeSearchResult } from '@longeviq/shared';

export interface KnowledgeDocumentCreateData {
  slug: string;
  title: string;
  summary?: string | null;
  category: KnowledgeCategory;
  source?: string | null;
  status: KnowledgeStatus;
  language: string;
  createdBy?: string | null;
}

export interface KnowledgeDocumentUpdateData {
  title?: string;
  summary?: string | null;
  category?: KnowledgeCategory;
  source?: string | null;
  status?: KnowledgeStatus;
}

export interface KnowledgeChunkInput {
  chunkIndex: number;
  title?: string | null;
  content: string;
}

export interface ListKnowledgeDocumentsFilter {
  page: number;
  limit: number;
  category?: KnowledgeCategory;
  status?: KnowledgeStatus;
}

export interface KnowledgeSearchFilter {
  query: string;
  limit: number;
  category?: KnowledgeCategory;
}

export interface KnowledgeDocumentWithChunks extends KnowledgeDocumentModel {
  chunks: KnowledgeChunkModel[];
}

export interface AuditSink {
  recordAudit(input: {
    userId?: string | null;
    action: string;
    entity?: string | null;
    entityId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: unknown;
  }): Promise<void>;
}

export interface KnowledgeRepository {
  createDocument(input: KnowledgeDocumentCreateData): Promise<KnowledgeDocumentModel>;
  findDocumentById(id: string): Promise<KnowledgeDocumentModel | null>;
  findDocumentBySlug(slug: string): Promise<KnowledgeDocumentModel | null>;
  listDocuments(
    filter: ListKnowledgeDocumentsFilter,
  ): Promise<{ items: KnowledgeDocumentModel[]; total: number }>;
  updateDocument(
    id: string,
    input: KnowledgeDocumentUpdateData,
  ): Promise<KnowledgeDocumentModel | null>;
  deleteDocument(id: string): Promise<void>;
  findDocumentByIdWithChunks(id: string): Promise<KnowledgeDocumentWithChunks | null>;
  replaceChunks(documentId: string, chunks: KnowledgeChunkInput[]): Promise<void>;
  search(filter: KnowledgeSearchFilter): Promise<KnowledgeSearchResult[]>;
}
