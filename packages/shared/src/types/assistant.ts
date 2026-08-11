import type { KnowledgeCategory } from './knowledge.js';

export const ChatRole = {
  USER: 'USER',
  ASSISTANT: 'ASSISTANT',
} as const;
export type ChatRole = (typeof ChatRole)[keyof typeof ChatRole];

export const CHAT_ROLE_VALUES = Object.values(ChatRole) as [ChatRole, ...ChatRole[]];

// Provenance of the knowledge chunks that grounded an assistant answer. The
// values mirror the retrieval results returned by the knowledge search.
export interface ChatMessageSource {
  documentId: string;
  documentTitle: string;
  slug: string;
  category: KnowledgeCategory;
  chunkIndex: number;
  title: string | null;
  snippet: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: ChatRole;
  content: string;
  sources: ChatMessageSource[] | null;
  isError: boolean;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messageCount: number;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatSessionDetail {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface ChatResponse {
  session: ChatSessionDetail;
  providerConfigured: boolean;
  disclaimer: string;
}
