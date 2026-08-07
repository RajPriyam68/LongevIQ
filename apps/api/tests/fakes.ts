import type { User, UserRole } from '@prisma/client';
import type {
  AuthRepository,
  CreateRefreshTokenInput,
  CreateUserInput,
  RefreshTokenRecord,
  VerificationTokenRecord,
} from '../src/modules/auth/auth.repository.types.js';

let seq = 0;

function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}_${seq}`;
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
