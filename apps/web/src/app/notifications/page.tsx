'use client';

import { BellRing } from 'lucide-react';
import { RequireAuth } from '@/components/auth/require-auth';
import { NotificationList } from '@/components/notifications/notification-list';

export default function NotificationsPage() {
  return (
    <RequireAuth>
      <div className="container mx-auto max-w-3xl space-y-6 px-4 py-10">
        <div className="flex items-center gap-3">
          <span
            className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"
            aria-hidden="true"
          >
            <BellRing className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              Medication reminders, report status, health alerts, and care updates.
            </p>
          </div>
        </div>
        <NotificationList />
      </div>
    </RequireAuth>
  );
}
