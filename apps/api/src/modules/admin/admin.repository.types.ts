import type { UserRole } from '@longeviq/shared';

export interface UserRoleCount {
  role: UserRole;
  count: number;
}

export interface AdminUserRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  emailVerified: boolean;
  isActive: boolean;
  oauthProvider: string | null;
  createdAt: Date;
  lastLoginAt: Date | null;
}

export interface AdminAuditLogRecord {
  id: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: unknown | null;
  createdAt: Date;
}

export interface AdminRecentSignupRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  createdAt: Date;
}

export interface ListAdminUsersFilter {
  search?: string;
  role?: UserRole;
  active?: boolean;
  page: number;
  limit: number;
}

export interface ListAuditLogsFilter {
  action?: string;
  entity?: string;
  userId?: string;
  from?: Date;
  to?: Date;
  page: number;
  limit: number;
}

export interface AdminRepository {
  countUsers(): Promise<number>;
  countUsersByRole(): Promise<UserRoleCount[]>;
  countVerifiedUsers(): Promise<number>;
  countActiveUsersSince(since: Date): Promise<number>;
  listRecentSignups(limit: number): Promise<AdminRecentSignupRecord[]>;
  countHealthMetrics(): Promise<number>;
  countMedicalReports(): Promise<number>;
  countParsedReports(): Promise<number>;
  countAuditEvents(): Promise<number>;
  listUsers(filter: ListAdminUsersFilter): Promise<{
    items: AdminUserRecord[];
    total: number;
  }>;
  listAuditLogs(filter: ListAuditLogsFilter): Promise<{
    items: AdminAuditLogRecord[];
    total: number;
  }>;
}
