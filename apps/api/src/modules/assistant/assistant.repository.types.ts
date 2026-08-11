import type { Prisma } from '@prisma/client';

export interface ChatSessionRecord {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessageRecord {
  id: string;
  sessionId: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  sources: Prisma.JsonValue | null;
  isError: boolean;
  createdAt: Date;
}

export interface ChatSessionListItem extends ChatSessionRecord {
  messageCount: number;
  lastMessageAt: Date | null;
}

export interface AssistantRepository {
  createSession(input: { userId: string; title: string }): Promise<ChatSessionRecord>;
  findSessionById(id: string): Promise<ChatSessionRecord | null>;
  listSessionsByUser(
    userId: string,
    filter: { page: number; limit: number },
  ): Promise<{ items: ChatSessionListItem[]; total: number }>;
  touchSession(id: string): Promise<void>;
  createMessage(input: {
    sessionId: string;
    role: 'USER' | 'ASSISTANT';
    content: string;
    sources?: Prisma.InputJsonValue | null;
    isError?: boolean;
  }): Promise<ChatMessageRecord>;
  // The most recent `limit` messages in ascending (chronological) order.
  listMessagesBySession(sessionId: string, limit: number): Promise<ChatMessageRecord[]>;
  // Every message in ascending (chronological) order.
  listAllMessagesBySession(sessionId: string): Promise<ChatMessageRecord[]>;
  deleteSession(id: string): Promise<void>;
}
