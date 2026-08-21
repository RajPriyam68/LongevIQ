import type { Prisma } from '@prisma/client';
import type { UserRole } from '@longeviq/shared';
import { prisma } from '../../db/prisma.js';
import type {
  AdminAuditLogRecord,
  AdminRecentSignupRecord,
  AdminRepository,
  AdminUserRecord,
  ListAdminUsersFilter,
  ListAuditLogsFilter,
  UserRoleCount,
} from './admin.repository.types.js';

const ADMIN_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  emailVerified: true,
  isActive: true,
  oauthProvider: true,
  createdAt: true,
  lastLoginAt: true,
} satisfies Prisma.UserSelect;

const RECENT_SIGNUP_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export class PrismaAdminRepository implements AdminRepository {
  async countUsers(): Promise<number> {
    return prisma.user.count();
  }

  async countUsersByRole(): Promise<UserRoleCount[]> {
    const rows = await prisma.user.groupBy({
      by: ['role'],
      _count: { _all: true },
    });
    return rows.map((row) => ({
      role: row.role as UserRole,
      count: row._count._all,
    }));
  }

  async countVerifiedUsers(): Promise<number> {
    return prisma.user.count({ where: { emailVerified: true } });
  }

  async countActiveUsersSince(since: Date): Promise<number> {
    return prisma.user.count({
      where: { lastLoginAt: { gte: since } },
    });
  }

  async listRecentSignups(limit: number): Promise<AdminRecentSignupRecord[]> {
    const rows = await prisma.user.findMany({
      select: RECENT_SIGNUP_SELECT,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((row) => ({ ...row, role: row.role as UserRole }));
  }

  async countHealthMetrics(): Promise<number> {
    return prisma.healthMetric.count();
  }

  async countMedicalReports(): Promise<number> {
    return prisma.medicalReport.count();
  }

  async countParsedReports(): Promise<number> {
    return prisma.medicalReport.count({ where: { status: 'PARSED' } });
  }

  async countAuditEvents(): Promise<number> {
    return prisma.auditLog.count();
  }

  async listUsers(filter: ListAdminUsersFilter): Promise<{
    items: AdminUserRecord[];
    total: number;
  }> {
    const where: Prisma.UserWhereInput = {};
    if (filter.search) {
      const query = filter.search.trim();
      if (query) {
        where.OR = [
          { email: { contains: query, mode: 'insensitive' } },
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
        ];
      }
    }
    if (filter.role) {
      where.role = filter.role;
    }
    if (filter.active !== undefined) {
      where.isActive = filter.active;
    }

    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        select: ADMIN_USER_SELECT,
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      items: rows.map((row) => ({ ...row, role: row.role as UserRole })),
      total,
    };
  }

  async listAuditLogs(filter: ListAuditLogsFilter): Promise<{
    items: AdminAuditLogRecord[];
    total: number;
  }> {
    const where: Prisma.AuditLogWhereInput = {};
    if (filter.action) {
      where.action = { contains: filter.action, mode: 'insensitive' };
    }
    if (filter.entity) {
      where.entity = filter.entity;
    }
    if (filter.userId) {
      where.userId = filter.userId;
    }
    if (filter.from || filter.to) {
      where.createdAt = {
        ...(filter.from ? { gte: filter.from } : {}),
        ...(filter.to ? { lte: filter.to } : {}),
      };
    }

    const [rows, total] = await Promise.all([
      prisma.auditLog.findMany({
        select: {
          id: true,
          userId: true,
          action: true,
          entity: true,
          entityId: true,
          ipAddress: true,
          userAgent: true,
          metadata: true,
          createdAt: true,
          user: { select: { email: true } },
        },
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        userEmail: row.user?.email ?? null,
        action: row.action,
        entity: row.entity,
        entityId: row.entityId,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        metadata: row.metadata,
        createdAt: row.createdAt,
      })),
      total,
    };
  }
}
