'use client';

import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { REPORT_CATEGORY_VALUES, type ReportCategory } from '@longeviq/shared';
import { apiListReports } from '@/lib/reports-api';
import { reportCategoryLabel } from '@/lib/reports-format';
import { RequireAuth } from '@/components/auth/require-auth';
import { ReportUploadForm } from '@/components/reports/report-upload-form';
import { ReportList } from '@/components/reports/report-list';
import { Skeleton } from '@/components/ui/skeleton';

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [category, setCategory] = React.useState<ReportCategory | undefined>(undefined);

  const reportsQuery = useQuery({
    queryKey: ['reports', { page, category }],
    queryFn: () => apiListReports({ page, limit: 10, category }),
  });

  const refresh = React.useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['reports'] });
  }, [queryClient]);

  const changeCategory = (next: ReportCategory | undefined) => {
    setCategory(next);
    setPage(1);
  };

  const data = reportsQuery.data;

  return (
    <RequireAuth>
      <div className="container mx-auto max-w-6xl space-y-8 px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"
              aria-hidden="true"
            >
              <FileText className="size-5" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold">Medical reports</h1>
              <p className="text-sm text-muted-foreground">
                Store and manage your medical reports securely.
              </p>
            </div>
          </div>
          <ReportUploadForm onCreated={refresh} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => changeCategory(undefined)}
            aria-pressed={category === undefined}
            className="rounded-full border px-3 py-1 text-sm transition-colors data-[pressed=true]:border-primary data-[pressed=true]:bg-primary data-[pressed=true]:text-primary-foreground"
            data-pressed={category === undefined}
          >
            All
          </button>
          {REPORT_CATEGORY_VALUES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => changeCategory(value)}
              aria-pressed={category === value}
              data-pressed={category === value}
              className="rounded-full border border-border bg-transparent px-3 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted data-[pressed=true]:border-primary data-[pressed=true]:bg-primary data-[pressed=true]:text-primary-foreground"
            >
              {reportCategoryLabel(value)}
            </button>
          ))}
        </div>

        <section aria-label="Report list">
          {reportsQuery.isLoading ? (
            <Skeleton className="h-48" />
          ) : reportsQuery.isError ? (
            <p className="text-sm text-destructive">Unable to load your reports.</p>
          ) : data ? (
            <ReportList
              reports={data.items}
              page={data.pagination.page}
              totalPages={data.pagination.totalPages}
              total={data.pagination.total}
              onPageChange={setPage}
              onDeleted={refresh}
            />
          ) : null}
        </section>
      </div>
    </RequireAuth>
  );
}
