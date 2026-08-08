'use client';

import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity } from 'lucide-react';
import {
  HEALTH_METRIC_META,
  HEALTH_METRIC_TYPE_VALUES,
  type HealthMetricType,
} from '@longeviq/shared';
import { apiGetDashboardOverview, apiListMetrics } from '@/lib/metrics-api';
import { RequireAuth } from '@/components/auth/require-auth';
import { MetricForm } from '@/components/dashboard/metric-form';
import { OverviewCards } from '@/components/dashboard/overview-cards';
import { MetricChart } from '@/components/dashboard/metric-chart';
import { RecentMetrics } from '@/components/dashboard/recent-metrics';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = React.useState<HealthMetricType>('WEIGHT');

  const overviewQuery = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => apiGetDashboardOverview(),
  });

  const trendQuery = useQuery({
    queryKey: ['metrics', selectedType],
    queryFn: () => apiListMetrics({ type: selectedType, limit: 100 }),
  });

  const refresh = React.useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] }),
      queryClient.invalidateQueries({ queryKey: ['metrics'] }),
    ]);
  }, [queryClient]);

  const overview = overviewQuery.data?.overview;
  const trendMetrics = trendQuery.data?.items ?? [];

  return (
    <RequireAuth>
      <div className="container mx-auto max-w-6xl space-y-8 px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"
              aria-hidden="true"
            >
              <Activity className="size-5" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold">Health dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Track your health measurements over time.
              </p>
            </div>
          </div>
          <MetricForm onCreated={refresh} />
        </div>

        <section aria-label="Overview">
          {overview ? (
            <OverviewCards overview={overview} />
          ) : overviewQuery.isError ? (
            <p className="text-sm text-destructive">Unable to load your dashboard.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-28" />
              ))}
            </div>
          )}
        </section>

        <section aria-label="Trend">
          <div className="mb-4 flex flex-wrap gap-2">
            {HEALTH_METRIC_TYPE_VALUES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                aria-pressed={type === selectedType}
                className={cn(
                  'rounded-full border px-3 py-1 text-sm transition-colors',
                  type === selectedType
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-transparent text-muted-foreground hover:bg-muted',
                )}
              >
                {HEALTH_METRIC_META[type].label}
              </button>
            ))}
          </div>
          {trendQuery.isLoading ? (
            <Skeleton className="h-72" />
          ) : (
            <MetricChart type={selectedType} metrics={trendMetrics} />
          )}
        </section>

        <section aria-label="Recent measurements">
          {overview ? (
            <RecentMetrics metrics={overview.recent} onDeleted={refresh} />
          ) : (
            <Skeleton className="h-48" />
          )}
        </section>
      </div>
    </RequireAuth>
  );
}
