import type {
  AdminAuditLogListResult,
  AdminSummary,
  AdminUserListResult,
  ListAdminUsersQuery,
  ListAuditLogsQuery,
  UserRole,
} from '@longeviq/shared';
import { apiGet } from '@/lib/api-client';

export function apiAdminSummary(): Promise<{ summary: AdminSummary }> {
  return apiGet<{ summary: AdminSummary }>('/admin/summary');
}

export function apiAdminListUsers(
  params: {
    search?: string;
    role?: UserRole;
    active?: boolean;
    page?: number;
    limit?: number;
  } = {},
): Promise<{ users: AdminUserListResult }> {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.role) query.set('role', params.role);
  if (params.active !== undefined) query.set('active', String(params.active));
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  const suffix = query.toString();
  return apiGet<{ users: AdminUserListResult }>(`/admin/users${suffix ? `?${suffix}` : ''}`);
}

export function apiAdminListAuditLogs(
  params: Partial<ListAuditLogsQuery> = {},
): Promise<{ logs: AdminAuditLogListResult }> {
  const query = new URLSearchParams();
  if (params.action) query.set('action', params.action);
  if (params.entity) query.set('entity', params.entity);
  if (params.userId) query.set('userId', params.userId);
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  const suffix = query.toString();
  return apiGet<{ logs: AdminAuditLogListResult }>(
    `/admin/audit-logs${suffix ? `?${suffix}` : ''}`,
  );
}

export type { ListAdminUsersQuery };
