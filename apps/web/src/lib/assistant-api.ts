import type { ChatResponse, ChatSession, ChatSessionDetail } from '@longeviq/shared';
import { apiClient, apiDelete, apiGet } from '@/lib/api-client';

export interface ListChatSessionsResult {
  items: ChatSession[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SendChatMessageInput {
  sessionId?: string | null;
  message: string;
}

/**
 * Chat can take several seconds while the LLM responds, so it gets a longer
 * timeout than the default API client budget.
 */
export async function apiSendChatMessage(input: SendChatMessageInput): Promise<ChatResponse> {
  const response = await apiClient.post<{ success: true; data: ChatResponse }>(
    '/assistant/chat',
    input,
    { timeout: 120_000 },
  );
  return response.data.data;
}

export function apiListChatSessions(page = 1, limit = 50): Promise<ListChatSessionsResult> {
  return apiGet<ListChatSessionsResult>(`/assistant/sessions?page=${page}&limit=${limit}`);
}

export function apiGetChatSession(id: string): Promise<{ session: ChatSessionDetail }> {
  return apiGet<{ session: ChatSessionDetail }>(`/assistant/sessions/${id}`);
}

export function apiDeleteChatSession(id: string): Promise<{ deleted: boolean }> {
  return apiDelete<{ deleted: boolean }>(`/assistant/sessions/${id}`);
}
