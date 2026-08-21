'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ClipboardCheck,
  FileText,
  ListChecks,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import type { AdminSummary, UserRole } from '@longeviq/shared';
import { apiAdminSummary } from '@/lib/admin-api';
import { adminRoleLabel, formatAdminRelativeTime } from '@/lib/admin-format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const ROLE_ORDER: UserRole[] = ['USER', 'DOCTOR', 'ADMIN'];

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
          aria-hidden="true"
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-2xl font-semibold leading-tight">{value}</p>
          <p className="truncate text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryContent({ summary }: { summary: AdminSummary }) {
  const signups = summary.users.recentSignups;

  return (
    <div className="space-y-8">
      <section aria-label="Platform statistics">
        <h2 className="mb-4 text-lg font-semibold">Platform at a glance</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Total users"
            value={summary.users.total}
            icon={<UserRound className="size-5" />}
          />
          <StatCard
            label="Active in last 30 days"
            value={summary.users.activeLast30Days}
            icon={<Activity className="size-5" />}
          />
          <StatCard
            label="Health metrics stored"
            value={summary.content.healthMetrics}
            icon={<ListChecks className="size-5" />}
          />
          <StatCard
            label="Medical reports"
            value={summary.content.medicalReports}
            icon={<FileText className="size-5" />}
          />
          <StatCard
            label="Parsed reports"
            value={summary.content.parsedReports}
            icon={<ClipboardCheck className="size-5" />}
          />
          <StatCard
            label="Audit events"
            value={summary.auditEvents}
            icon={<ShieldCheck className="size-5" />}
          />
        </div>
      </section>

      <section aria-label="User role breakdown">
        <h2 className="mb-4 text-lg font-semibold">Users by role</h2>
        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 p-5">
            {ROLE_ORDER.map((role) => (
              <Badge key={role} variant="outline" className="gap-1.5">
                <span className="font-medium">{adminRoleLabel(role)}</span>
                <span className="text-muted-foreground">{summary.users.byRole[role] ?? 0}</span>
              </Badge>
            ))}
            <span className="ml-auto text-xs text-muted-foreground">
              {summary.users.verified} verified email
              {summary.users.verified === 1 ? '' : 's'}
            </span>
          </CardContent>
        </Card>
      </section>

      <section aria-label="Recent signups">
        <h2 className="mb-4 text-lg font-semibold">Recent signups</h2>
        {signups.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              No users have signed up yet.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {signups.map((signup) => (
                <div
                  key={signup.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {signup.firstName} {signup.lastName}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">{signup.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{adminRoleLabel(signup.role)}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatAdminRelativeTime(signup.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

export function AdminSummary() {
  const summaryQuery = useQuery({
    queryKey: ['admin-summary'],
    queryFn: () => apiAdminSummary(),
  });

  if (summaryQuery.isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (summaryQuery.isError || !summaryQuery.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Platform summary</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Unable to load the platform summary.
        </CardContent>
      </Card>
    );
  }

  return <SummaryContent summary={summaryQuery.data.summary} />;
}
