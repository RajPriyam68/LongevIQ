import { Prisma } from '@prisma/client';
import type {
  ChatMessage as ChatMessageModel,
  ChatSession as ChatSessionModel,
} from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import type {
  AssistantRepository,
  ChatMessageRecord,
  ChatSessionListItem,
  ChatSessionRecord,
} from './assistant.repository.types.js';

export class PrismaAssistantRepository implements AssistantRepository {
  async createSession(input: { userId: string; title: string }): Promise<ChatSessionRecord> {
    return prisma.chatSession.create({ data: input });
  }

  async findSessionById(id: string): Promise<ChatSessionRecord | null> {
    return prisma.chatSession.findUnique({ where: { id } });
  }

  async listSessionsByUser(
    userId: string,
    filter: { page: number; limit: number },
  ): Promise<{ items: ChatSessionListItem[]; total: number }> {
    const [rows, total] = await prisma.$transaction([
      prisma.chatSession.findMany({
        where: { userId },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
        include: {
          _count: { select: { messages: true } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      prisma.chatSession.count({ where: { userId } }),
    ]);

    const items: ChatSessionListItem[] = rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      title: row.title,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      messageCount: row._count.messages,
      lastMessageAt: row.messages[0]?.createdAt ?? null,
    }));
    return { items, total };
  }

  async touchSession(id: string): Promise<void> {
    await prisma.chatSession.update({ where: { id }, data: { updatedAt: new Date() } });
  }

  async createMessage(input: {
    sessionId: string;
    role: 'USER' | 'ASSISTANT';
    content: string;
    sources?: Prisma.InputJsonValue | null;
    isError?: boolean;
  }): Promise<ChatMessageRecord> {
    const message = await prisma.chatMessage.create({
      data: {
        sessionId: input.sessionId,
        role: input.role,
        content: input.content,
        sources: input.sources ?? Prisma.JsonNull,
        isError: input.isError ?? false,
      },
    });
    return toMessageRecord(message);
  }

  async listMessagesBySession(sessionId: string, limit: number): Promise<ChatMessageRecord[]> {
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return messages.reverse().map(toMessageRecord);
  }

  async listAllMessagesBySession(sessionId: string): Promise<ChatMessageRecord[]> {
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
    return messages.map(toMessageRecord);
  }

  async deleteSession(id: string): Promise<void> {
    await prisma.chatSession.delete({ where: { id } });
  }
}

function toMessageRecord(message: ChatMessageModel): ChatMessageRecord {
  return {
    id: message.id,
    sessionId: message.sessionId,
    role: message.role,
    content: message.content,
    sources: message.sources,
    isError: message.isError,
    createdAt: message.createdAt,
  };
}

export function toSessionRecord(session: ChatSessionModel): ChatSessionRecord {
  return {
    id: session.id,
    userId: session.userId,
    title: session.title,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}
