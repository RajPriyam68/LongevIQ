import type { User, UserRole } from '@prisma/client';
import type { KnowledgeSearchResult } from '@longeviq/shared';
import type {
  AuthRepository,
  CreateRefreshTokenInput,
  CreateUserInput,
  RefreshTokenRecord,
  VerificationTokenRecord,
} from '../src/modules/auth/auth.repository.types.js';
import type {
  AssistantRepository,
  ChatMessageRecord,
  ChatSessionRecord,
} from '../src/modules/assistant/assistant.repository.types.js';
import type { LlmMessage } from '../src/modules/assistant/llm/llm-client.js';

let seq = 0;
let nowOffset = 0;

function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}_${seq}`;
}

function nextDate(): Date {
  nowOffset += 1;
  return new Date(Date.now() + nowOffset);
}

export class FakeAuthRepository implements AuthRepository {
  users = new Map<string, User>();
  refreshTokens = new Map<string, RefreshTokenRecord>();
  verificationTokens = new Map<string, VerificationTokenRecord>();
  auditLogs: Array<{ action: string; userId?: string | null; metadata?: unknown }> = [];

  private makeUser(input: CreateUserInput): User {
    const now = new Date();
    return {
      id: nextId('usr'),
      email: input.email,
      passwordHash: input.passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role ?? 'USER',
      emailVerified: input.emailVerified ?? false,
      isActive: true,
      avatarUrl: input.avatarUrl ?? null,
      oauthProvider: input.oauthProvider ?? null,
      oauthId: input.oauthId ?? null,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  async createUser(input: CreateUserInput): Promise<User> {
    const user = this.makeUser(input);
    this.users.set(user.id, user);
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) return user;
    }
    return null;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async updateUser(id: string, data: Record<string, unknown>): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error(`User ${id} not found`);
    const updated = { ...user, ...data, updatedAt: new Date() } as User;
    this.users.set(id, updated);
    return updated;
  }

  async createRefreshToken(input: CreateRefreshTokenInput): Promise<RefreshTokenRecord> {
    const record: RefreshTokenRecord = {
      id: nextId('rtk'),
      tokenHash: input.tokenHash,
      userId: input.userId,
      expiresAt: input.expiresAt,
      revokedAt: null,
      replacedByTokenId: null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    };
    this.refreshTokens.set(record.tokenHash, record);
    return record;
  }

  async findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    return this.refreshTokens.get(tokenHash) ?? null;
  }

  async revokeRefreshToken(id: string): Promise<void> {
    for (const record of this.refreshTokens.values()) {
      if (record.id === id) {
        record.revokedAt = new Date();
      }
    }
  }

  async revokeAllRefreshTokens(userId: string): Promise<void> {
    for (const record of this.refreshTokens.values()) {
      if (record.userId === userId && record.revokedAt === null) {
        record.revokedAt = new Date();
      }
    }
  }

  async createVerificationToken(input: {
    tokenHash: string;
    userId: string;
    expiresAt: Date;
  }): Promise<VerificationTokenRecord> {
    const record: VerificationTokenRecord = {
      id: nextId('vrf'),
      tokenHash: input.tokenHash,
      userId: input.userId,
      expiresAt: input.expiresAt,
      consumedAt: null,
    };
    this.verificationTokens.set(record.tokenHash, record);
    return record;
  }

  async findVerificationTokenByHash(tokenHash: string): Promise<VerificationTokenRecord | null> {
    return this.verificationTokens.get(tokenHash) ?? null;
  }

  async consumeVerificationToken(id: string): Promise<void> {
    for (const record of this.verificationTokens.values()) {
      if (record.id === id) {
        record.consumedAt = new Date();
      }
    }
  }

  async recordAudit(input: {
    userId?: string | null;
    action: string;
    entity?: string | null;
    entityId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: unknown;
  }): Promise<void> {
    this.auditLogs.push({ action: input.action, userId: input.userId, metadata: input.metadata });
  }
}

export class FakeEmailService {
  sent: Array<{ to: string; subject: string; text: string }> = [];

  async send(input: { to: string; subject: string; text: string }): Promise<void> {
    this.sent.push(input);
  }

  sendVerificationEmail(to: string, verificationUrl: string): Promise<void> {
    return this.send({ to, subject: 'Verify', text: verificationUrl });
  }

  get lastVerificationUrl(): string | null {
    const last = this.sent[this.sent.length - 1];
    return last ? (/https?:\/\/\S+/.exec(last.text)?.[0] ?? null) : null;
  }
}

export function makeUser(partial: Partial<User> = {}): User {
  const now = new Date();
  return {
    id: partial.id ?? nextId('usr'),
    email: partial.email ?? 'test@example.com',
    passwordHash: partial.passwordHash ?? 'hash',
    firstName: partial.firstName ?? 'Test',
    lastName: partial.lastName ?? 'User',
    role: partial.role ?? ('USER' as UserRole),
    emailVerified: partial.emailVerified ?? true,
    isActive: partial.isActive ?? true,
    avatarUrl: partial.avatarUrl ?? null,
    oauthProvider: partial.oauthProvider ?? null,
    oauthId: partial.oauthId ?? null,
    lastLoginAt: partial.lastLoginAt ?? null,
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
  };
}

export class FakeMetricsRepository {
  metrics = new Map<string, MetricLike>();
  auditCalls: Array<{ action: string; entityId?: string | null; userId?: string | null }> = [];

  async create(input: {
    userId: string;
    type: string;
    value: number;
    valueSecondary?: number | null;
    unit: string;
    recordedAt: Date;
    notes?: string | null;
  }) {
    const now = new Date();
    const metric: MetricLike = {
      id: nextId('met'),
      userId: input.userId,
      type: input.type,
      value: input.value,
      valueSecondary: input.valueSecondary ?? null,
      unit: input.unit,
      recordedAt: input.recordedAt,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.metrics.set(metric.id, metric);
    return metric;
  }

  async findById(id: string) {
    return this.metrics.get(id) ?? null;
  }

  async listByUser(userId: string, filter: ListFilter) {
    const items = [...this.metrics.values()]
      .filter((m) => m.userId === userId)
      .filter((m) => (filter.type ? m.type === filter.type : true))
      .filter((m) => (filter.from ? m.recordedAt >= filter.from : true))
      .filter((m) => (filter.to ? m.recordedAt <= filter.to : true))
      .sort((a, b) =>
        filter.sort === 'asc'
          ? a.recordedAt.getTime() - b.recordedAt.getTime()
          : b.recordedAt.getTime() - a.recordedAt.getTime(),
      );
    const start = (filter.page - 1) * filter.limit;
    return { items: items.slice(start, start + filter.limit), total: items.length };
  }

  async update(id: string, data: Record<string, unknown>) {
    const metric = this.metrics.get(id);
    if (!metric) throw new Error(`metric ${id} not found`);
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) clean[key] = value;
    }
    const updated = { ...metric, ...clean, updatedAt: new Date() } as MetricLike;
    this.metrics.set(id, updated);
    return updated;
  }

  async delete(id: string) {
    this.metrics.delete(id);
  }

  async latestPerType(userId: string, types: string[]) {
    const byType = new Map<string, MetricLike>();
    for (const metric of this.metrics.values()) {
      if (metric.userId !== userId || !types.includes(metric.type)) continue;
      const current = byType.get(metric.type);
      if (!current || metric.recordedAt > current.recordedAt) {
        byType.set(metric.type, metric);
      }
    }
    return [...byType.values()];
  }

  async previousBefore(userId: string, type: string, before: Date) {
    const candidates = [...this.metrics.values()]
      .filter((m) => m.userId === userId && m.type === type && m.recordedAt < before)
      .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
    return candidates[0] ?? null;
  }

  async countsByType(userId: string, types: string[]) {
    const counts = new Map<string, number>();
    for (const metric of this.metrics.values()) {
      if (metric.userId !== userId || !types.includes(metric.type)) continue;
      counts.set(metric.type, (counts.get(metric.type) ?? 0) + 1);
    }
    return [...counts.entries()].map(([type, count]) => ({ type, count }));
  }

  async recentByUser(userId: string, limit: number) {
    return [...this.metrics.values()]
      .filter((m) => m.userId === userId)
      .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())
      .slice(0, limit);
  }

  recordAudit(input: { action: string; entityId?: string | null; userId?: string | null }) {
    this.auditCalls.push(input);
    return Promise.resolve();
  }
}

export interface MetricLike {
  id: string;
  userId: string;
  type: string;
  value: number;
  valueSecondary: number | null;
  unit: string;
  recordedAt: Date;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListFilter {
  type?: string;
  from?: Date;
  to?: Date;
  page: number;
  limit: number;
  sort: 'asc' | 'desc';
}

export class FakeReportStorage {
  objects = new Map<string, { data: Buffer; mimeType: string; extension: string }>();
  removed: string[] = [];

  async put(input: { data: Buffer; mimeType: string; extension: string }) {
    const storageKey = `key_${this.objects.size + 1}`;
    this.objects.set(storageKey, input);
    return { storageKey, sizeBytes: input.data.length };
  }

  async open(storageKey: string) {
    const object = this.objects.get(storageKey);
    if (!object) throw new Error(`object ${storageKey} not found`);
    return { data: object.data, sizeBytes: object.data.length };
  }

  async remove(storageKey: string) {
    this.removed.push(storageKey);
    this.objects.delete(storageKey);
  }
}

export class FakeReportProcessor {
  calls: Array<{ mimeType: string; category: string }> = [];
  text = 'GLUCOSE 95 mg/dL (ref 70-99)';
  findings: FindingLike[] = [];
  error: Error | null = null;

  async process(input: { mimeType: string; data: Buffer; category: string }) {
    this.calls.push({ mimeType: input.mimeType, category: input.category });
    if (this.error) throw this.error;
    return { parsedText: this.text, findings: this.findings };
  }
}

export interface FindingLike {
  id: string;
  reportId: string;
  name: string;
  value: string;
  unit: string | null;
  referenceRange: string | null;
  flag: 'NORMAL' | 'HIGH' | 'LOW' | null;
  confidence: number;
  sortOrder: number;
  createdAt: Date;
}

export class FakeReportsRepository {
  reports = new Map<string, ReportLike>();
  auditCalls: Array<{ action: string; entityId?: string | null; userId?: string | null }> = [];

  async create(input: {
    userId: string;
    title: string;
    reportDate: Date;
    source?: string | null;
    category: string;
    notes?: string | null;
    status: string;
    fileName: string;
    fileSizeBytes: number;
    mimeType: string;
    storageKey: string;
  }) {
    const now = new Date();
    const report: ReportLike = {
      id: nextId('rep'),
      userId: input.userId,
      title: input.title,
      reportDate: input.reportDate,
      source: input.source ?? null,
      category: input.category,
      notes: input.notes ?? null,
      status: input.status,
      fileName: input.fileName,
      fileSizeBytes: input.fileSizeBytes,
      mimeType: input.mimeType,
      storageKey: input.storageKey,
      parsedText: null,
      processingError: null,
      parsedAt: null,
      findings: [],
      createdAt: now,
      updatedAt: now,
    };
    this.reports.set(report.id, report);
    return report;
  }

  async findById(id: string) {
    return this.reports.get(id) ?? null;
  }

  async findByIdWithFindings(id: string) {
    return this.reports.get(id) ?? null;
  }

  async listByUser(userId: string, filter: ReportListFilter) {
    const items = [...this.reports.values()]
      .filter((r) => r.userId === userId)
      .filter((r) => (filter.category ? r.category === filter.category : true))
      .filter((r) => (filter.status ? r.status === filter.status : true))
      .sort((a, b) =>
        filter.sort === 'asc'
          ? a.createdAt.getTime() - b.createdAt.getTime()
          : b.createdAt.getTime() - a.createdAt.getTime(),
      );
    const start = (filter.page - 1) * filter.limit;
    return { items: items.slice(start, start + filter.limit), total: items.length };
  }

  async update(id: string, data: Record<string, unknown>) {
    const report = this.reports.get(id);
    if (!report) throw new Error(`report ${id} not found`);
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) clean[key] = value;
    }
    const updated = { ...report, ...clean, updatedAt: new Date() } as ReportLike;
    this.reports.set(id, updated);
    return updated;
  }

  async completeProcessing(
    id: string,
    input: {
      status: 'PARSED' | 'FAILED';
      parsedText?: string | null;
      processingError?: string | null;
      parsedAt: Date;
      findings?: FindingLike[];
    },
  ) {
    const report = this.reports.get(id);
    if (!report) throw new Error(`report ${id} not found`);
    const now = new Date();
    const findings: FindingLike[] = (input.findings ?? []).map((finding, index) => ({
      id: nextId('fin'),
      reportId: id,
      name: finding.name,
      value: finding.value,
      unit: finding.unit ?? null,
      referenceRange: finding.referenceRange ?? null,
      flag: finding.flag ?? null,
      confidence: finding.confidence,
      sortOrder: index,
      createdAt: now,
    }));
    const updated: ReportLike = {
      ...report,
      status: input.status,
      parsedText: input.parsedText ?? null,
      processingError: input.processingError ?? null,
      parsedAt: input.parsedAt,
      findings,
      updatedAt: now,
    };
    this.reports.set(id, updated);
    return updated;
  }

  async delete(id: string) {
    this.reports.delete(id);
  }

  recordAudit(input: { action: string; entityId?: string | null; userId?: string | null }) {
    this.auditCalls.push(input);
    return Promise.resolve();
  }
}

export interface ReportLike {
  id: string;
  userId: string;
  title: string;
  reportDate: Date;
  source: string | null;
  category: string;
  notes: string | null;
  status: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  storageKey: string;
  parsedText: string | null;
  processingError: string | null;
  parsedAt: Date | null;
  findings: FindingLike[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportListFilter {
  category?: string;
  status?: string;
  page: number;
  limit: number;
  sort: 'asc' | 'desc';
}

export interface KnowledgeDocumentLike {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  category: string;
  source: string | null;
  status: string;
  language: string;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  chunks: Array<{
    id: string;
    documentId: string;
    chunkIndex: number;
    title: string | null;
    content: string;
    createdAt: Date;
  }>;
}

export class FakeKnowledgeRepository {
  documents = new Map<string, KnowledgeDocumentLike>();
  auditCalls: Array<{ action: string; entityId?: string | null; userId?: string | null }> = [];

  async createDocument(input: {
    slug: string;
    title: string;
    summary?: string | null;
    category: string;
    source?: string | null;
    status: string;
    language: string;
    createdBy?: string | null;
  }) {
    const now = new Date();
    const document: KnowledgeDocumentLike = {
      id: nextId('kdoc'),
      slug: input.slug,
      title: input.title,
      summary: input.summary ?? null,
      category: input.category,
      source: input.source ?? null,
      status: input.status,
      language: input.language,
      createdBy: input.createdBy ?? null,
      createdAt: now,
      updatedAt: now,
      chunks: [],
    };
    this.documents.set(document.id, document);
    return document;
  }

  async findDocumentById(id: string) {
    return this.documents.get(id) ?? null;
  }

  async findDocumentBySlug(slug: string) {
    for (const document of this.documents.values()) {
      if (document.slug === slug) return document;
    }
    return null;
  }

  async listDocuments(filter: { page: number; limit: number; category?: string; status?: string }) {
    const items = [...this.documents.values()]
      .filter((d) => (filter.category ? d.category === filter.category : true))
      .filter((d) => (filter.status ? d.status === filter.status : true))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    const start = (filter.page - 1) * filter.limit;
    return { items: items.slice(start, start + filter.limit), total: items.length };
  }

  async updateDocument(id: string, data: Record<string, unknown>) {
    const document = this.documents.get(id);
    if (!document) return null;
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) clean[key] = value;
    }
    const updated = { ...document, ...clean, updatedAt: new Date() } as KnowledgeDocumentLike;
    this.documents.set(id, updated);
    return updated;
  }

  async deleteDocument(id: string) {
    this.documents.delete(id);
  }

  async findDocumentByIdWithChunks(id: string) {
    return this.documents.get(id) ?? null;
  }

  async replaceChunks(
    documentId: string,
    chunks: Array<{ chunkIndex: number; title?: string | null; content: string }>,
  ) {
    const document = this.documents.get(documentId);
    if (!document) throw new Error(`document ${documentId} not found`);
    const now = new Date();
    document.chunks = chunks.map((chunk) => ({
      id: nextId('kchunk'),
      documentId,
      chunkIndex: chunk.chunkIndex,
      title: chunk.title ?? null,
      content: chunk.content,
      createdAt: now,
    }));
  }

  async search(filter: { query: string; limit: number; category?: string }) {
    const query = filter.query.toLowerCase();
    const hits: Array<{
      document: KnowledgeDocumentLike;
      chunk: KnowledgeDocumentLike['chunks'][number];
    }> = [];
    for (const document of this.documents.values()) {
      if (document.status !== 'PUBLISHED') continue;
      if (filter.category && document.category !== filter.category) continue;
      for (const chunk of document.chunks) {
        if (chunk.content.toLowerCase().includes(query)) {
          hits.push({ document, chunk });
        }
      }
    }
    return hits
      .sort((a, b) => a.chunk.content.length - b.chunk.content.length)
      .slice(0, filter.limit)
      .map(({ document, chunk }) => ({
        chunkId: chunk.id,
        documentId: document.id,
        slug: document.slug,
        documentTitle: document.title,
        category: document.category as KnowledgeSearchResult['category'],
        source: document.source,
        chunkIndex: chunk.chunkIndex,
        title: chunk.title,
        snippet: chunk.content.slice(0, 240),
        content: chunk.content,
        score: 1,
      }));
  }

  recordAudit(input: { action: string; entityId?: string | null; userId?: string | null }) {
    this.auditCalls.push(input);
    return Promise.resolve();
  }
}

export class FakeLlmClient {
  calls = 0;
  prompts: LlmMessage[][] = [];
  reply = 'This is a fake educational answer from the assistant.';
  error: Error | null = null;

  async chat(options: { messages: LlmMessage[] }): Promise<string> {
    this.calls += 1;
    this.prompts.push(options.messages);
    if (this.error) throw this.error;
    return this.reply;
  }
}

export class FakeAssistantRepository {
  sessions = new Map<string, ChatSessionRecord>();
  messages = new Map<string, ChatMessageRecord>();
  auditCalls: Array<{ action: string; entityId?: string | null; userId?: string | null }> = [];

  async createSession(input: { userId: string; title: string }): Promise<ChatSessionRecord> {
    const now = nextDate();
    const session: ChatSessionRecord = {
      id: nextId('cs'),
      userId: input.userId,
      title: input.title,
      createdAt: now,
      updatedAt: now,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  async findSessionById(id: string): Promise<ChatSessionRecord | null> {
    return this.sessions.get(id) ?? null;
  }

  async listSessionsByUser(userId: string, filter: { page: number; limit: number }) {
    const items = [...this.sessions.values()]
      .filter((session) => session.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    const start = (filter.page - 1) * filter.limit;
    const page = items.slice(start, start + filter.limit).map((session) => {
      const sessionMessages = [...this.messages.values()].filter(
        (message) => message.sessionId === session.id,
      );
      return {
        ...session,
        messageCount: sessionMessages.length,
        lastMessageAt: sessionMessages[sessionMessages.length - 1]?.createdAt ?? null,
      };
    });
    return { items: page, total: items.length };
  }

  async touchSession(id: string): Promise<void> {
    const session = this.sessions.get(id);
    if (!session) throw new Error(`session ${id} not found`);
    session.updatedAt = nextDate();
  }

  async createMessage(input: {
    sessionId: string;
    role: 'USER' | 'ASSISTANT';
    content: string;
    sources?: unknown;
    isError?: boolean;
  }): Promise<ChatMessageRecord> {
    const message: ChatMessageRecord = {
      id: nextId('cm'),
      sessionId: input.sessionId,
      role: input.role,
      content: input.content,
      sources: (input.sources ?? null) as ChatMessageRecord['sources'],
      isError: input.isError ?? false,
      createdAt: nextDate(),
    };
    this.messages.set(message.id, message);
    return message;
  }

  async listMessagesBySession(sessionId: string, limit: number): Promise<ChatMessageRecord[]> {
    return [...this.messages.values()]
      .filter((message) => message.sessionId === sessionId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(-limit);
  }

  async listAllMessagesBySession(sessionId: string): Promise<ChatMessageRecord[]> {
    return [...this.messages.values()]
      .filter((message) => message.sessionId === sessionId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async deleteSession(id: string): Promise<void> {
    this.sessions.delete(id);
    for (const [key, message] of this.messages.entries()) {
      if (message.sessionId === id) {
        this.messages.delete(key);
      }
    }
  }

  recordAudit(input: { action: string; entityId?: string | null; userId?: string | null }) {
    this.auditCalls.push(input);
    return Promise.resolve();
  }
}

export function makeKnowledgeSearchResult(
  partial: Partial<KnowledgeSearchResult> = {},
): KnowledgeSearchResult {
  return {
    chunkId: partial.chunkId ?? nextId('chk'),
    documentId: partial.documentId ?? nextId('kdoc'),
    slug: partial.slug ?? 'fake-article',
    documentTitle: partial.documentTitle ?? 'Fake Article',
    category: partial.category ?? 'WELLNESS',
    source: partial.source ?? null,
    chunkIndex: partial.chunkIndex ?? 0,
    title: partial.title ?? null,
    snippet: partial.snippet ?? 'A snippet of the retrieved article.',
    content: partial.content ?? 'Full content of the retrieved article.',
    score: partial.score ?? 1,
  };
}
