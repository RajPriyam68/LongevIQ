import type { NotificationSeverity, NotificationType } from '@longeviq/shared';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  body: string;
  dedupKey: string;
  metadata?: unknown;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  body: string;
  dedupKey: string;
  metadata: unknown | null;
  readAt: Date | null;
  createdAt: Date;
}

export interface ListNotificationsFilter {
  read?: boolean;
  type?: NotificationType;
  page: number;
  limit: number;
}

export interface NotificationRepository {
  upsert(input: CreateNotificationInput): Promise<NotificationRecord>;
  listByUser(
    userId: string,
    filter: ListNotificationsFilter,
  ): Promise<{ items: NotificationRecord[]; total: number }>;
  countUnreadByUser(userId: string): Promise<number>;
  listDedupKeysByType(userId: string, type: NotificationType): Promise<string[]>;
  markReadByDedupKeys(userId: string, dedupKeys: string[]): Promise<number>;
  findById(id: string): Promise<NotificationRecord | null>;
  markRead(id: string): Promise<NotificationRecord>;
  markAllRead(userId: string): Promise<number>;
  delete(id: string): Promise<void>;
}
