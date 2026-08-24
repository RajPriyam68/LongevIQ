import type { NotificationType } from '@longeviq/shared';
import type { Notification } from '@prisma/client';

import { prisma } from '../../db/prisma.js';
import type {
  CreateNotificationInput,
  ListNotificationsFilter,
  NotificationRecord,
} from './notification.repository.types.js';

function toRecord(row: Notification): NotificationRecord {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    severity: row.severity,
    title: row.title,
    body: row.body,
    dedupKey: row.dedupKey,
    metadata: row.metadata ?? null,
    readAt: row.readAt,
    createdAt: row.createdAt,
  };
}

export class PrismaNotificationRepository {
  async upsert(input: CreateNotificationInput): Promise<NotificationRecord> {
    const row = await prisma.notification.upsert({
      where: { userId_dedupKey: { userId: input.userId, dedupKey: input.dedupKey } },
      update: {
        type: input.type,
        severity: input.severity,
        title: input.title,
        body: input.body,
        metadata: input.metadata === undefined ? undefined : (input.metadata as object),
      },
      create: {
        userId: input.userId,
        type: input.type,
        severity: input.severity,
        title: input.title,
        body: input.body,
        dedupKey: input.dedupKey,
        metadata: input.metadata === undefined ? undefined : (input.metadata as object),
      },
    });
    return toRecord(row);
  }

  async listByUser(
    userId: string,
    filter: ListNotificationsFilter,
  ): Promise<{ items: NotificationRecord[]; total: number }> {
    const where = {
      userId,
      ...(filter.read === undefined ? {} : { readAt: filter.read ? { not: null } : null }),
      ...(filter.type === undefined ? {} : { type: filter.type }),
    };

    const [rows, total] = await prisma.$transaction([
      prisma.notification.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      prisma.notification.count({ where }),
    ]);

    return { items: rows.map(toRecord), total };
  }

  countUnreadByUser(userId: string): Promise<number> {
    return prisma.notification.count({ where: { userId, readAt: null } });
  }

  async listDedupKeysByType(userId: string, type: NotificationType): Promise<string[]> {
    const rows = await prisma.notification.findMany({
      where: { userId, type },
      select: { dedupKey: true },
    });
    return rows.map((row) => row.dedupKey);
  }

  markReadByDedupKeys(userId: string, dedupKeys: string[]): Promise<number> {
    if (dedupKeys.length === 0) {
      return Promise.resolve(0);
    }
    return prisma.notification
      .updateMany({
        where: { userId, dedupKey: { in: dedupKeys }, readAt: null },
        data: { readAt: new Date() },
      })
      .then((result) => result.count);
  }

  async findById(id: string): Promise<NotificationRecord | null> {
    const row = await prisma.notification.findUnique({ where: { id } });
    return row ? toRecord(row) : null;
  }

  async markRead(id: string): Promise<NotificationRecord> {
    const row = await prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
    return toRecord(row);
  }

  markAllRead(userId: string): Promise<number> {
    return prisma.notification
      .updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } })
      .then((result) => result.count);
  }

  delete(id: string): Promise<void> {
    return prisma.notification.delete({ where: { id } }).then(() => undefined);
  }
}
