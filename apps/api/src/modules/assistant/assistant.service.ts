import { MEDICAL_DISCLAIMER } from '@longeviq/shared';
import type { Prisma } from '@prisma/client';
import type {
  ChatMessage,
  ChatMessageSource,
  ChatResponse,
  ChatSession,
  ChatSessionDetail,
  KnowledgeSearchResult,
  PaginatedResponse,
  VoiceInputMethod,
} from '@longeviq/shared';
import { AppError } from '../../utils/app-error.js';
import type { AuditSink } from '../metrics/metrics.repository.types.js';
import { LlmNotConfiguredError, LlmUpstreamError, type LlmClient } from './llm/llm-client.js';
import { buildChatMessages, type RetrievedSection } from './prompt/prompt-builder.js';
import type {
  AssistantRepository,
  ChatMessageRecord,
  ChatSessionListItem,
  ChatSessionRecord,
} from './assistant.repository.types.js';

export interface AssistantRetriever {
  search(filter: { query: string; limit: number }): Promise<KnowledgeSearchResult[]>;
}

export interface AssistantConfig {
  retrievalTopK: number;
  contextCharLimit: number;
  historyMessages: number;
}

export interface RequestContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

const NOT_CONFIGURED_MESSAGE =
  'The AI assistant is not configured yet. Ask an administrator to set USER_LLM_API_KEY in the API ' +
  'environment (optionally USER_LLM_BASE_URL and USER_LLM_MODEL) to enable AI chat. In the meantime, ' +
  'you can explore the Knowledge Library for educational articles.';

const UPSTREAM_ERROR_MESSAGE =
  "I couldn't reach the AI provider right now. Please try again in a moment. If the problem persists, " +
  'ask an administrator to check the LLM configuration.';

export class AssistantService {
  constructor(
    private readonly repository: AssistantRepository,
    private readonly retriever: AssistantRetriever,
    private readonly llm: LlmClient,
    private readonly config: AssistantConfig,
    private readonly audit?: AuditSink,
  ) {}

  async chat(
    userId: string,
    input: { message: string; sessionId?: string | null; inputMethod?: VoiceInputMethod },
    ctx: RequestContext = {},
  ): Promise<ChatResponse> {
    const session = await this.resolveSession(userId, input.sessionId ?? null, input.message);

    await this.repository.createMessage({
      sessionId: session.id,
      role: 'USER',
      content: input.message,
    });
    await this.repository.touchSession(session.id);

    const results = await this.retriever.search({
      query: input.message,
      limit: this.config.retrievalTopK,
    });
    const sections: RetrievedSection[] = results.map((result) => ({
      title: result.title,
      content: result.content,
      source: result.documentTitle,
    }));

    // History excludes the message just saved (the prompt re-states it).
    const recent = await this.repository.listMessagesBySession(
      session.id,
      this.config.historyMessages + 1,
    );
    const promptHistory = recent.slice(0, -1).map((message) => ({
      role: message.role === 'USER' ? ('user' as const) : ('assistant' as const),
      content: message.content,
    }));

    const messages = buildChatMessages({
      question: input.message,
      sections,
      history: promptHistory,
      disclaimer: MEDICAL_DISCLAIMER,
      contextCharLimit: this.config.contextCharLimit,
    });

    let content: string;
    let providerConfigured = true;
    let isError = false;
    let sources: ChatMessageSource[] | null = sections.length > 0 ? toSources(results) : null;

    try {
      content = await this.llm.chat({ messages });
    } catch (error) {
      if (error instanceof LlmNotConfiguredError) {
        content = NOT_CONFIGURED_MESSAGE;
        providerConfigured = false;
      } else if (error instanceof LlmUpstreamError) {
        content = UPSTREAM_ERROR_MESSAGE;
      } else {
        content = UPSTREAM_ERROR_MESSAGE;
      }
      isError = true;
      sources = null;
    }

    await this.repository.createMessage({
      sessionId: session.id,
      role: 'ASSISTANT',
      content,
      sources: sources ? (sources as unknown as Prisma.InputJsonValue) : null,
      isError,
    });

    await this.audit?.recordAudit({
      userId,
      action: 'DATA.ASSISTANT_CHAT',
      entity: 'ChatSession',
      entityId: session.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: {
        providerConfigured,
        sources: sources?.length ?? 0,
        messageLength: content.length,
        inputMethod: input.inputMethod ?? 'TEXT',
      },
    });

    const allMessages = await this.repository.listAllMessagesBySession(session.id);
    return {
      session: serializeSessionDetail(session, allMessages),
      providerConfigured,
      disclaimer: MEDICAL_DISCLAIMER,
    };
  }

  async listSessions(
    userId: string,
    query: { page: number; limit: number },
  ): Promise<PaginatedResponse<ChatSession>> {
    const { items, total } = await this.repository.listSessionsByUser(userId, query);
    return {
      items: items.map(serializeSession),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getSession(userId: string, sessionId: string): Promise<ChatSessionDetail> {
    const session = await this.requireOwnedSession(userId, sessionId);
    const messages = await this.repository.listAllMessagesBySession(session.id);
    return serializeSessionDetail(session, messages);
  }

  async deleteSession(userId: string, sessionId: string, ctx: RequestContext = {}): Promise<void> {
    const session = await this.requireOwnedSession(userId, sessionId);
    await this.repository.deleteSession(session.id);

    await this.audit?.recordAudit({
      userId,
      action: 'DATA.ASSISTANT_SESSION_DELETE',
      entity: 'ChatSession',
      entityId: session.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  }

  private async resolveSession(
    userId: string,
    sessionId: string | null,
    firstMessage: string,
  ): Promise<ChatSessionRecord> {
    if (sessionId) {
      return this.requireOwnedSession(userId, sessionId);
    }
    return this.repository.createSession({ userId, title: makeSessionTitle(firstMessage) });
  }

  private async requireOwnedSession(userId: string, sessionId: string): Promise<ChatSessionRecord> {
    const session = await this.repository.findSessionById(sessionId);
    if (!session || session.userId !== userId) {
      throw AppError.notFound('Chat session not found.');
    }
    return session;
  }
}

function makeSessionTitle(message: string): string {
  const singleLine = message.replace(/\s+/g, ' ').trim();
  const truncated = singleLine.length > 48 ? `${singleLine.slice(0, 48).trimEnd()}…` : singleLine;
  return truncated.length > 0 ? truncated : 'New conversation';
}

function toSources(results: KnowledgeSearchResult[]): ChatMessageSource[] {
  return results.map((result) => ({
    documentId: result.documentId,
    documentTitle: result.documentTitle,
    slug: result.slug,
    category: result.category,
    chunkIndex: result.chunkIndex,
    title: result.title,
    snippet: result.snippet,
  }));
}

function serializeMessage(message: ChatMessageRecord): ChatMessage {
  return {
    id: message.id,
    sessionId: message.sessionId,
    role: message.role,
    content: message.content,
    sources: message.sources as ChatMessageSource[] | null,
    isError: message.isError,
    createdAt: message.createdAt.toISOString(),
  };
}

function serializeSession(session: ChatSessionListItem): ChatSession {
  return {
    id: session.id,
    title: session.title,
    messageCount: session.messageCount,
    lastMessageAt: session.lastMessageAt?.toISOString() ?? null,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}

function serializeSessionDetail(
  session: ChatSessionRecord,
  messages: ChatMessageRecord[],
): ChatSessionDetail {
  return {
    id: session.id,
    title: session.title,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    messages: messages.map(serializeMessage),
  };
}
