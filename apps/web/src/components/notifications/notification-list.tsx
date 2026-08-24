'use client';

import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCheck, Check, Trash2 } from 'lucide-react';
import type { AppNotification, NotificationType } from '@longeviq/shared';
import { NOTIFICATION_TYPE_VALUES } from '@longeviq/shared';
import { toast } from 'sonner';
import {
  apiDeleteNotification,
  apiListNotifications,
  apiMarkAllNotificationsRead,
  apiMarkNotificationRead,
} from '@/lib/notifications-api';
import {
  formatNotificationRelativeTime,
  notificationSeverityBadgeClass,
  notificationSeverityLabel,
  notificationTypeLabel,
} from '@/lib/notifications-format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

type ReadFilter = 'all' | 'unread' | 'read';

const READ_FILTERS: Array<{ id: ReadFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'read', label: 'Read' },
];

function NotificationItem({
  notification,
  onMarkRead,
  onDelete,
}: {
  notification: AppNotification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <li
      className={cn(
        'flex items-start gap-3 border-b px-4 py-3 last:border-0',
        notification.readAt === null && 'bg-muted/40',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center rounded-md border border-transparent px-2 py-0.5 text-xs font-semibold',
              notificationSeverityBadgeClass(notification.severity),
            )}
          >
            {notificationSeverityLabel(notification.severity)}
          </span>
          <span className="text-xs text-muted-foreground">
            {notificationTypeLabel(notification.type)}
          </span>
          <span className="ml-auto text-xs text-muted-foreground">
            {formatNotificationRelativeTime(notification.createdAt)}
          </span>
        </div>
        <p className="mt-1 font-medium">{notification.title}</p>
        <p className="text-sm text-muted-foreground">{notification.body}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {notification.readAt === null ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Mark as read"
            title="Mark as read"
            onClick={() => onMarkRead(notification.id)}
          >
            <Check className="size-4" />
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Delete notification"
          title="Delete notification"
          onClick={() => onDelete(notification.id)}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </li>
  );
}

export function NotificationList() {
  const queryClient = useQueryClient();
  const [readFilter, setReadFilter] = React.useState<ReadFilter>('all');
  const [typeFilter, setTypeFilter] = React.useState<NotificationType | undefined>(undefined);
  const [page, setPage] = React.useState(1);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const notificationsQuery = useQuery({
    queryKey: ['notifications', { readFilter, typeFilter, page }],
    queryFn: () =>
      apiListNotifications({
        read: readFilter === 'all' ? undefined : readFilter === 'unread' ? 'false' : 'true',
        type: typeFilter,
        page,
        limit: PAGE_SIZE,
      }),
  });

  const markRead = async (id: string) => {
    try {
      await apiMarkNotificationRead(id);
      toast.success('Notification marked as read.');
      invalidate();
    } catch {
      toast.error('Could not update the notification.');
    }
  };

  const markAllRead = async () => {
    try {
      const result = await apiMarkAllNotificationsRead();
      toast.success(
        result.marked > 0
          ? `Marked ${result.marked} notification${result.marked === 1 ? '' : 's'} as read.`
          : 'Nothing to mark as read.',
      );
      invalidate();
    } catch {
      toast.error('Could not mark notifications as read.');
    }
  };

  const removeNotification = async (id: string) => {
    try {
      await apiDeleteNotification(id);
      toast.success('Notification deleted.');
      invalidate();
    } catch {
      toast.error('Could not delete the notification.');
    }
  };

  const changeReadFilter = (next: ReadFilter) => {
    setReadFilter(next);
    setPage(1);
  };

  const changeTypeFilter = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setTypeFilter(event.target.value === '' ? undefined : (event.target.value as NotificationType));
    setPage(1);
  };

  const result = notificationsQuery.data;
  const notifications = result?.items ?? [];
  const pagination = result?.pagination;

  return (
    <section aria-label="Notifications">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2" role="group" aria-label="Filter by read state">
            {READ_FILTERS.map((filter) => (
              <Button
                key={filter.id}
                type="button"
                size="sm"
                variant={readFilter === filter.id ? 'default' : 'outline'}
                onClick={() => changeReadFilter(filter.id)}
              >
                {filter.label}
              </Button>
            ))}
          </div>
          <select
            value={typeFilter ?? ''}
            onChange={changeTypeFilter}
            aria-label="Filter by type"
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          >
            <option value="">All types</option>
            {NOTIFICATION_TYPE_VALUES.map((type) => (
              <option key={type} value={type}>
                {notificationTypeLabel(type)}
              </option>
            ))}
          </select>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={markAllRead}>
          <CheckCheck className="size-4" aria-hidden="true" />
          Mark all as read
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {pagination
              ? `${pagination.total} notification${pagination.total === 1 ? '' : 's'}`
              : 'Notifications'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {notificationsQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-16" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No notifications match the current filters.
            </p>
          ) : (
            <ul className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={markRead}
                  onDelete={removeNotification}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {pagination && pagination.totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || notificationsQuery.isFetching}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages || notificationsQuery.isFetching}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
