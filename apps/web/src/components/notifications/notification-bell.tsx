'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth-store';
import { apiNotificationUnreadCount } from '@/lib/notifications-api';
import { notificationBellCountClass } from '@/lib/notifications-format';
import { Button } from '@/components/ui/button';

export function NotificationBell() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const unreadQuery = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: apiNotificationUnreadCount,
    enabled: isAuthenticated,
    refetchInterval: 60_000,
  });

  if (!isAuthenticated) {
    return null;
  }

  const unread = unreadQuery.data?.unread ?? 0;

  return (
    <Button asChild variant="ghost" size="icon" aria-label="Notifications" title="Notifications">
      <Link href="/notifications" className="relative">
        <Bell className="size-4" aria-hidden="true" />
        {unread > 0 ? (
          <span
            className={`absolute -right-1 -top-1 bg-destructive text-white ${notificationBellCountClass(unread)}`}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}
