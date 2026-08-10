export const KnowledgeCategory = {
  METRICS: 'METRICS',
  LABS: 'LABS',
  NUTRITION: 'NUTRITION',
  WELLNESS: 'WELLNESS',
} as const;
export type KnowledgeCategory = (typeof KnowledgeCategory)[keyof typeof KnowledgeCategory];

export const KNOWLEDGE_CATEGORY_VALUES = Object.values(KnowledgeCategory) as [
  KnowledgeCategory,
  ...KnowledgeCategory[],
];

export const KNOWLEDGE_CATEGORY_LABELS: Record<KnowledgeCategory, string> = {
  METRICS: 'Health metrics',
  LABS: 'Lab tests',
  NUTRITION: 'Nutrition',
  WELLNESS: 'Wellness',
};

export const KnowledgeStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
} as const;
export type KnowledgeStatus = (typeof KnowledgeStatus)[keyof typeof KnowledgeStatus];

export const KNOWLEDGE_STATUS_VALUES = Object.values(KnowledgeStatus) as [
  KnowledgeStatus,
  ...KnowledgeStatus[],
];

export const KNOWLEDGE_STATUS_LABELS: Record<KnowledgeStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
};

export interface KnowledgeDocument {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  category: KnowledgeCategory;
  source: string | null;
  status: KnowledgeStatus;
  language: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  title: string | null;
  content: string;
  createdAt: string;
}

export interface KnowledgeDocumentDetail extends KnowledgeDocument {
  chunks: KnowledgeChunk[];
}

export interface KnowledgeSearchResult {
  chunkId: string;
  documentId: string;
  slug: string;
  documentTitle: string;
  category: KnowledgeCategory;
  source: string | null;
  chunkIndex: number;
  title: string | null;
  snippet: string;
  content: string;
  score: number;
}

export interface KnowledgeDocumentListResult {
  items: KnowledgeDocument[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
