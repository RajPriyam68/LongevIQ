import type { Prisma, User, UserRole } from '@prisma/client';

export interface CreateUserInput {
  email: string;
  passwordHash: string | null;
  firstName: string;
  lastName: string;
  role?: UserRole;
  emailVerified?: boolean;
  oauthProvider?: string | null;
  oauthId?: string | null;
  avatarUrl?: string | null;
}

export interface CreateRefreshTokenInput {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface RefreshTokenRecord {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedByTokenId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface VerificationTokenRecord {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  consumedAt: Date | null;
}

export interface AuthRepository {
  createUser(input: CreateUserInput): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User>;
  createRefreshToken(input: CreateRefreshTokenInput): Promise<RefreshTokenRecord>;
  findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRecord | null>;
  revokeRefreshToken(id: string): Promise<void>;
  revokeAllRefreshTokens(userId: string): Promise<void>;
  createVerificationToken(input: {
    tokenHash: string;
    userId: string;
    expiresAt: Date;
  }): Promise<VerificationTokenRecord>;
  findVerificationTokenByHash(tokenHash: string): Promise<VerificationTokenRecord | null>;
  consumeVerificationToken(id: string): Promise<void>;
  recordAudit(input: {
    userId?: string | null;
    action: string;
    entity?: string | null;
    entityId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: Prisma.InputJsonValue | null;
  }): Promise<void>;
}
