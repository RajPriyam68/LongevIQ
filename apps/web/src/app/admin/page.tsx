'use client';

import * as React from 'react';
import { FileClock, LayoutDashboard, ShieldCheck, UsersRound } from 'lucide-react';
import { UserRole } from '@longeviq/shared';
import { RequireRole } from '@/components/auth/require-role';
import { AdminSummary } from '@/components/admin/admin-summary';
import { AdminUsers } from '@/components/admin/admin-users';
import { AdminAuditLog } from '@/components/admin/admin-audit-log';
import { cn } from '@/lib/utils';

type AdminTab = 'overview' | 'users' | 'audit';

const TABS: Array<{ id: AdminTab; label: string; icon: React.ReactNode }> = [
  {
    id: 'overview',
    label: 'Overview',
    icon: <LayoutDashboard className="size-4" aria-hidden="true" />,
  },
  { id: 'users', label: 'Users', icon: <UsersRound className="size-4" aria-hidden="true" /> },
  { id: 'audit', label: 'Audit log', icon: <FileClock className="size-4" aria-hidden="true" /> },
];

export default function AdminDashboardPage() {
  const [tab, setTab] = React.useState<AdminTab>('overview');

  return (
    <RequireRole roles={[UserRole.ADMIN]}>
      <div className="container mx-auto max-w-6xl space-y-8 px-4 py-10">
        <div className="flex items-center gap-3">
          <span
            className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"
            aria-hidden="true"
          >
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold">Admin dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Platform overview, user directory, and the audit log.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Admin dashboard sections">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                tab === item.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        {tab === 'overview' ? <AdminSummary /> : null}
        {tab === 'users' ? <AdminUsers /> : null}
        {tab === 'audit' ? <AdminAuditLog /> : null}
      </div>
    </RequireRole>
  );
}
