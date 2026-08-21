'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import type { AdminAuditLogEntry } from '@longeviq/shared';
import { apiAdminListAuditLogs } from '@/lib/admin-api';
import { formatAdminDateTime } from '@/lib/admin-format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const PAGE_SIZE = 20;

function ActionBadge({ action }: { action: string }) {
  const [scope] = action.split('.');
  const tone =
    scope === 'AUTH'
      ? 'secondary'
      : scope === 'DATA'
        ? 'default'
        : scope === 'SYS'
          ? 'outline'
          : 'outline';
  return <Badge variant={tone}>{action}</Badge>;
}

function AuditRow({ entry }: { entry: AdminAuditLogEntry }) {
  return (
    <tr className="border-b last:border-0 align-top">
      <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
        {formatAdminDateTime(entry.createdAt)}
      </td>
      <td className="px-4 py-3">
        <p className="font-medium">{entry.userEmail ?? 'System'}</p>
        {entry.userId ? (
          <p className="truncate font-mono text-xs text-muted-foreground">{entry.userId}</p>
        ) : null}
      </td>
      <td className="px-4 py-3">
        <ActionBadge action={entry.action} />
      </td>
      <td className="px-4 py-3 text-sm">
        {entry.entity ? (
          <span className="font-medium">{entry.entity}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        {entry.entityId ? (
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{entry.entityId}</code>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">
        {entry.ipAddress ?? '—'}
      </td>
    </tr>
  );
}

export function AdminAuditLog() {
  const [action, setAction] = React.useState('');
  const [entity, setEntity] = React.useState('');
  const [submitted, setSubmitted] = React.useState<{ action: string; entity: string }>({
    action: '',
    entity: '',
  });
  const [page, setPage] = React.useState(1);

  const logsQuery = useQuery({
    queryKey: ['admin-audit-logs', { ...submitted, page }],
    queryFn: () =>
      apiAdminListAuditLogs({
        action: submitted.action || undefined,
        entity: submitted.entity || undefined,
        page,
        limit: PAGE_SIZE,
      }),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted({ action: action.trim(), entity: entity.trim() });
    setPage(1);
  };

  const logs = logsQuery.data?.logs;
  const pagination = logs?.pagination;

  return (
    <section aria-label="Audit log">
      <form onSubmit={submit} className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={action}
            onChange={(event) => setAction(event.target.value)}
            placeholder="Filter by action (e.g. AUTH)"
            className="w-56 pl-8"
            aria-label="Filter by action"
          />
        </div>
        <Input
          value={entity}
          onChange={(event) => setEntity(event.target.value)}
          placeholder="Filter by entity"
          className="w-48"
          aria-label="Filter by entity"
        />
        <Button type="submit" size="sm">
          Filter
        </Button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {pagination
              ? `${pagination.total} event${pagination.total === 1 ? '' : 's'}`
              : 'Audit events'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {logsQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-12" />
              ))}
            </div>
          ) : !logs || logs.items.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No audit events match the current filters.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th scope="col" className="px-4 py-2 font-medium">
                      Time
                    </th>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Actor
                    </th>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Action
                    </th>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Entity
                    </th>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Entity ID
                    </th>
                    <th scope="col" className="px-4 py-2 font-medium">
                      IP
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.items.map((entry) => (
                    <AuditRow key={entry.id} entry={entry} />
                  ))}
                </tbody>
              </table>
            </div>
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
              disabled={page <= 1 || logsQuery.isFetching}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages || logsQuery.isFetching}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
