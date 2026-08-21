import type { AdminAuditLogListResult, AdminSummary, AdminUserListResult } from '@longeviq/shared';
import type {
  AdminAuditLogRecord,
  AdminRepository,
  AdminUserRecord,
  ListAdminUsersFilter,
  ListAuditLogsFilter,
} from './admin.repository.types.js';

const RECENT_SIGNUPS_LIMIT = 5;
const ACTIVE_WINDOW_DAYS = 30;

export class AdminService {
  constructor(private readonly repository: AdminRepository) {}

  async summary(): Promise<{ summary: AdminSummary }> {
    const since = new Date(Date.now() - ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      byRole,
      verifiedUsers,
      activeUsers,
      recentSignups,
      metrics,
      reports,
      parsed,
      auditEvents,
    ] = await Promise.all([
      this.repository.countUsers(),
      this.repository.countUsersByRole(),
      this.repository.countVerifiedUsers(),
      this.repository.countActiveUsersSince(since),
      this.repository.listRecentSignups(RECENT_SIGNUPS_LIMIT),
      this.repository.countHealthMetrics(),
      this.repository.countMedicalReports(),
      this.repository.countParsedReports(),
      this.repository.countAuditEvents(),
    ]);

    const roleCounts = byRole.reduce<Record<string, number>>((acc, row) => {
      acc[row.role] = row.count;
      return acc;
    }, {});

    return {
      summary: {
        generatedAt: new Date().toISOString(),
        users: {
          total: totalUsers,
          byRole: {
            USER: roleCounts.USER ?? 0,
            DOCTOR: roleCounts.DOCTOR ?? 0,
            ADMIN: roleCounts.ADMIN ?? 0,
          },
          verified: verifiedUsers,
          activeLast30Days: activeUsers,
          recentSignups: recentSignups.map((row) => ({
            id: row.id,
            email: row.email,
            firstName: row.firstName,
            lastName: row.lastName,
            role: row.role,
            createdAt: row.createdAt.toISOString(),
          })),
        },
        content: {
          healthMetrics: metrics,
          medicalReports: reports,
          parsedReports: parsed,
        },
        auditEvents: auditEvents,
      },
    };
  }

  async listUsers(filter: ListAdminUsersFilter): Promise<{ users: AdminUserListResult }> {
    const { items, total } = await this.repository.listUsers(filter);
    return {
      users: {
        items: items.map(toAdminUser),
        pagination: buildPagination(filter.page, filter.limit, total),
      },
    };
  }

  async listAuditLogs(filter: ListAuditLogsFilter): Promise<{ logs: AdminAuditLogListResult }> {
    const { items, total } = await this.repository.listAuditLogs(filter);
    return {
      logs: {
        items: items.map(toAuditLogEntry),
        pagination: buildPagination(filter.page, filter.limit, total),
      },
    };
  }
}

function toAdminUser(row: AdminUserRecord) {
  return {
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    role: row.role,
    emailVerified: row.emailVerified,
    isActive: row.isActive,
    oauthProvider: row.oauthProvider,
    createdAt: row.createdAt.toISOString(),
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
  };
}

function toAuditLogEntry(row: AdminAuditLogRecord) {
  return {
    id: row.id,
    userId: row.userId,
    userEmail: row.userEmail,
    action: row.action,
    entity: row.entity,
    entityId: row.entityId,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    metadata: row.metadata,
    createdAt: row.createdAt.toISOString(),
  };
}

function buildPagination(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
