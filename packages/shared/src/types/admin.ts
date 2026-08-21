import type { UserRole } from './enums.js';

export interface AdminRecentSignup {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  createdAt: string;
}

export interface AdminSummary {
  generatedAt: string;
  users: {
    total: number;
    byRole: Record<UserRole, number>;
    verified: number;
    activeLast30Days: number;
    recentSignups: AdminRecentSignup[];
  };
  content: {
    healthMetrics: number;
    medicalReports: number;
    parsedReports: number;
  };
  auditEvents: number;
}

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  emailVerified: boolean;
  isActive: boolean;
  oauthProvider: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AdminUserListResult {
  items: AdminUser[];
  pagination: AdminPagination;
}

export interface AdminAuditLogEntry {
  id: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: unknown | null;
  createdAt: string;
}

export interface AdminAuditLogListResult {
  items: AdminAuditLogEntry[];
  pagination: AdminPagination;
}

export interface AdminPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
