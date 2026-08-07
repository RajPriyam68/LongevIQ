import type { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import type {
  AuthRepository,
  CreateRefreshTokenInput,
  CreateUserInput,
  VerificationTokenRecord,
} from './auth.repository.types.js';

export class PrismaAuthRepository implements AuthRepository {
  async createUser(input: CreateUserInput) {
    return prisma.user.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
        emailVerified: input.emailVerified ?? false,
        oauthProvider: input.oauthProvider,
        oauthId: input.oauthId,
        avatarUrl: input.avatarUrl,
      },
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }

  async updateUser(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({ where: { id }, data });
  }

  async createRefreshToken(input: CreateRefreshTokenInput) {
    const record = await prisma.refreshToken.create({
      data: {
        tokenHash: input.tokenHash,
        userId: input.userId,
        expiresAt: input.expiresAt,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
    return this.mapRefreshToken(record);
  }

  async findRefreshTokenByHash(tokenHash: string) {
    const record = await prisma.refreshToken.findUnique({ where: { tokenHash } });
    return record ? this.mapRefreshToken(record) : null;
  }

  async revokeRefreshToken(id: string) {
    await prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllRefreshTokens(userId: string) {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async createVerificationToken(input: { tokenHash: string; userId: string; expiresAt: Date }) {
    return prisma.emailVerificationToken.create({
      data: {
        tokenHash: input.tokenHash,
        userId: input.userId,
        expiresAt: input.expiresAt,
      },
    });
  }

  async findVerificationTokenByHash(tokenHash: string): Promise<VerificationTokenRecord | null> {
    const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
    return record
      ? {
          id: record.id,
          tokenHash: record.tokenHash,
          userId: record.userId,
          expiresAt: record.expiresAt,
          consumedAt: record.consumedAt,
        }
      : null;
  }

  async consumeVerificationToken(id: string) {
    await prisma.emailVerificationToken.update({
      where: { id },
      data: { consumedAt: new Date() },
    });
  }

  async recordAudit(input: {
    userId?: string | null;
    action: string;
    entity?: string | null;
    entityId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: Prisma.InputJsonValue | null;
  }) {
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        metadata: (input.metadata as Prisma.InputJsonValue | undefined) ?? undefined,
      },
    });
  }

  private mapRefreshToken(record: {
    id: string;
    tokenHash: string;
    userId: string;
    expiresAt: Date;
    revokedAt: Date | null;
    replacedByTokenId: string | null;
    ipAddress: string | null;
    userAgent: string | null;
  }) {
    return {
      id: record.id,
      tokenHash: record.tokenHash,
      userId: record.userId,
      expiresAt: record.expiresAt,
      revokedAt: record.revokedAt,
      replacedByTokenId: record.replacedByTokenId,
      ipAddress: record.ipAddress,
      userAgent: record.userAgent,
    };
  }
}
