import { beforeEach, describe, expect, it } from 'vitest';
import type {
  AdminAuditLogRecord,
  AdminUserRecord,
} from '../src/modules/admin/admin.repository.types.js';
import { AdminService } from '../src/modules/admin/admin.service.js';
import { FakeAdminRepository } from './fakes.js';

function makeUser(overrides: Partial<AdminUserRecord> & { email: string }): AdminUserRecord {
  const now = new Date();
  return {
    id: overrides.id ?? 'usr_1',
    email: overrides.email,
    firstName: overrides.firstName ?? 'First',
    lastName: overrides.lastName ?? 'Last',
    role: overrides.role ?? 'USER',
    emailVerified: overrides.emailVerified ?? false,
    isActive: overrides.isActive ?? true,
    oauthProvider: overrides.oauthProvider ?? null,
    createdAt: overrides.createdAt ?? now,
    lastLoginAt: overrides.lastLoginAt ?? null,
  };
}

function makeAuditLog(overrides: Partial<AdminAuditLogRecord>): AdminAuditLogRecord {
  const now = new Date();
  return {
    id: overrides.id ?? 'log_1',
    userId: overrides.userId ?? 'usr_1',
    userEmail: overrides.userEmail ?? 'user@example.com',
    action: overrides.action ?? 'AUTH.LOGIN',
    entity: overrides.entity ?? 'User',
    entityId: overrides.entityId ?? 'usr_1',
    ipAddress: overrides.ipAddress ?? '127.0.0.1',
    userAgent: overrides.userAgent ?? 'vitest',
    metadata: overrides.metadata ?? null,
    createdAt: overrides.createdAt ?? now,
  };
}

describe('AdminService', () => {
  let repository: FakeAdminRepository;
  let service: AdminService;

  beforeEach(() => {
    repository = new FakeAdminRepository();
    service = new AdminService(repository);
  });

  describe('summary', () => {
    it('aggregates user counts by role and content counts', async () => {
      repository.users.set(
        'usr_1',
        makeUser({ id: 'usr_1', email: 'admin@example.com', role: 'ADMIN', emailVerified: true }),
      );
      repository.users.set(
        'usr_2',
        makeUser({ id: 'usr_2', email: 'doc@example.com', role: 'DOCTOR', emailVerified: true }),
      );
      repository.users.set(
        'usr_3',
        makeUser({ id: 'usr_3', email: 'user@example.com', role: 'USER' }),
      );
      repository.metricCount = 42;
      repository.reportCount = 7;
      repository.parsedReportCount = 3;
      repository.auditLogs.set('log_1', makeAuditLog({ id: 'log_1' }));

      const { summary } = await service.summary();

      expect(summary.users.total).toBe(3);
      expect(summary.users.byRole).toEqual({ USER: 1, DOCTOR: 1, ADMIN: 1 });
      expect(summary.users.verified).toBe(2);
      expect(summary.users.activeLast30Days).toBe(0);
      expect(summary.content).toEqual({
        healthMetrics: 42,
        medicalReports: 7,
        parsedReports: 3,
      });
      expect(summary.auditEvents).toBe(1);
      expect(summary.generatedAt).toEqual(expect.any(String));
    });

    it('counts only recent logins in activeLast30Days', async () => {
      repository.users.set(
        'usr_1',
        makeUser({
          id: 'usr_1',
          email: 'recent@example.com',
          lastLoginAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
        }),
      );
      repository.users.set(
        'usr_2',
        makeUser({
          id: 'usr_2',
          email: 'stale@example.com',
          lastLoginAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 40),
        }),
      );
      repository.users.set('usr_3', makeUser({ id: 'usr_3', email: 'never@example.com' }));

      const { summary } = await service.summary();

      expect(summary.users.activeLast30Days).toBe(1);
    });

    it('returns the five most recent signups', async () => {
      for (let index = 1; index <= 6; index += 1) {
        repository.users.set(
          `usr_${index}`,
          makeUser({
            id: `usr_${index}`,
            email: `user${index}@example.com`,
            createdAt: new Date(Date.now() - index * 1000),
          }),
        );
      }

      const { summary } = await service.summary();

      expect(summary.users.recentSignups).toHaveLength(5);
      expect(summary.users.recentSignups[0].email).toBe('user1@example.com');
      expect(summary.users.recentSignups[4].email).toBe('user5@example.com');
    });
  });

  describe('listUsers', () => {
    it('returns mapped users with ISO dates and pagination', async () => {
      repository.users.set(
        'usr_1',
        makeUser({ id: 'usr_1', email: 'user@example.com', role: 'DOCTOR' }),
      );

      const { users } = await service.listUsers({ page: 1, limit: 20 });

      expect(users.items).toHaveLength(1);
      expect(users.items[0]).toMatchObject({
        id: 'usr_1',
        email: 'user@example.com',
        role: 'DOCTOR',
        emailVerified: false,
        isActive: true,
        oauthProvider: null,
        lastLoginAt: null,
      });
      expect(users.items[0].createdAt).toEqual(expect.any(String));
      expect(users.pagination).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
    });

    it('passes search, role, and active filters through', async () => {
      repository.users.set(
        'usr_1',
        makeUser({ id: 'usr_1', email: 'alice@example.com', role: 'DOCTOR', isActive: true }),
      );
      repository.users.set(
        'usr_2',
        makeUser({
          id: 'usr_2',
          email: 'alice2@example.com',
          role: 'USER',
          isActive: false,
          firstName: 'Alice',
        }),
      );
      repository.users.set(
        'usr_3',
        makeUser({ id: 'usr_3', email: 'bob@example.com', role: 'USER', isActive: true }),
      );

      const { users } = await service.listUsers({
        search: 'alice',
        role: 'DOCTOR',
        active: true,
        page: 1,
        limit: 10,
      });

      expect(users.items.map((user) => user.email)).toEqual(['alice@example.com']);
      expect(users.pagination.total).toBe(1);
    });

    it('paginates results', async () => {
      for (let index = 1; index <= 5; index += 1) {
        repository.users.set(
          `usr_${index}`,
          makeUser({ id: `usr_${index}`, email: `user${index}@example.com` }),
        );
      }

      const { users } = await service.listUsers({ page: 2, limit: 2 });

      expect(users.items).toHaveLength(2);
      expect(users.pagination).toEqual({ page: 2, limit: 2, total: 5, totalPages: 3 });
    });
  });

  describe('listAuditLogs', () => {
    it('returns mapped entries with user email and ISO dates', async () => {
      repository.auditLogs.set(
        'log_1',
        makeAuditLog({
          id: 'log_1',
          action: 'DATA.METRIC_CREATE',
          entity: 'HealthMetric',
          metadata: { type: 'WEIGHT' },
        }),
      );

      const { logs } = await service.listAuditLogs({ page: 1, limit: 20 });

      expect(logs.items).toHaveLength(1);
      expect(logs.items[0]).toMatchObject({
        id: 'log_1',
        userId: 'usr_1',
        userEmail: 'user@example.com',
        action: 'DATA.METRIC_CREATE',
        entity: 'HealthMetric',
        metadata: { type: 'WEIGHT' },
      });
      expect(logs.items[0].createdAt).toEqual(expect.any(String));
      expect(logs.pagination.total).toBe(1);
    });

    it('passes filters through', async () => {
      const now = Date.now();
      repository.auditLogs.set(
        'log_1',
        makeAuditLog({
          id: 'log_1',
          userId: 'usr_1',
          action: 'AUTH.LOGIN',
          entity: 'User',
          createdAt: new Date(now - 1000),
        }),
      );
      repository.auditLogs.set(
        'log_2',
        makeAuditLog({
          id: 'log_2',
          userId: 'usr_2',
          action: 'DATA.METRIC_CREATE',
          entity: 'HealthMetric',
          createdAt: new Date(now - 1000),
        }),
      );
      repository.auditLogs.set(
        'log_3',
        makeAuditLog({
          id: 'log_3',
          userId: 'usr_1',
          action: 'AUTH.LOGOUT',
          entity: 'User',
          createdAt: new Date(now - 500),
        }),
      );

      const { logs } = await service.listAuditLogs({
        action: 'AUTH',
        userId: 'usr_1',
        from: new Date(now - 750),
        to: new Date(now),
        page: 1,
        limit: 20,
      });

      expect(logs.items.map((log) => log.id)).toEqual(['log_3']);
      expect(logs.pagination.total).toBe(1);
    });
  });
});
