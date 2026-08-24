import type {
  AppNotification,
  NotificationListResult,
  NotificationType,
  NotificationUnreadCount,
} from '@longeviq/shared';
import { apiDelete, apiGet, apiPatch } from '@/lib/api-client';

export interface ListNotificationsParams {
  read?: 'true' | 'false';
  type?: NotificationType;
  page?: number;
  limit?: number;
}

export function apiListNotifications(
  params: ListNotificationsParams = {},
): Promise<NotificationListResult> {
  const query = new URLSearchParams();
  if (params.read) query.set('read', params.read);
  if (params.type) query.set('type', params.type);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  const suffix = query.toString();
  return apiGet<NotificationListResult>(`/notifications${suffix ? `?${suffix}` : ''}`);
}

export function apiNotificationUnreadCount(): Promise<NotificationUnreadCount> {
  return apiGet<NotificationUnreadCount>('/notifications/unread-count');
}

export function apiMarkNotificationRead(id: string): Promise<AppNotification> {
  return apiPatch<AppNotification>(`/notifications/${id}/read`);
}

export function apiMarkAllNotificationsRead(): Promise<{ marked: number }> {
  return apiPatch<{ marked: number }>('/notifications/read-all');
}

export function apiDeleteNotification(id: string): Promise<{ deleted: boolean }> {
  return apiDelete<{ deleted: boolean }>(`/notifications/${id}`);
}
