import type {
  KnowledgeCategory,
  KnowledgeDocumentDetail,
  KnowledgeDocumentListResult,
  KnowledgeSearchResult,
} from '@longeviq/shared';
import { apiGet } from '@/lib/api-client';

export interface SearchKnowledgeParams {
  q: string;
  limit?: number;
  category?: KnowledgeCategory;
}

export interface ListKnowledgeParams {
  page?: number;
  limit?: number;
  category?: KnowledgeCategory;
}

export function apiSearchKnowledge(params: SearchKnowledgeParams): Promise<{
  results: KnowledgeSearchResult[];
}> {
  const query = new URLSearchParams({ q: params.q });
  if (params.limit) query.set('limit', String(params.limit));
  if (params.category) query.set('category', params.category);
  return apiGet<{ results: KnowledgeSearchResult[] }>(`/knowledge/search?${query.toString()}`);
}

export function apiListKnowledge(
  params: ListKnowledgeParams = {},
): Promise<KnowledgeDocumentListResult> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.category) query.set('category', params.category);
  const suffix = query.toString();
  return apiGet<KnowledgeDocumentListResult>(`/knowledge${suffix ? `?${suffix}` : ''}`);
}

export function apiGetKnowledgeDocument(
  id: string,
): Promise<{ document: KnowledgeDocumentDetail }> {
  return apiGet<{ document: KnowledgeDocumentDetail }>(`/knowledge/${id}`);
}
