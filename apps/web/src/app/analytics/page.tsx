'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3 } from 'lucide-react';
import { RequireAuth } from '@/components/auth/require-auth';
import { ScoreGauge } from '@/components/analytics/score-gauge';
import { ScoreComponents } from '@/components/analytics/score-components';
import { MetricAnalyticsCard } from '@/components/analytics/metric-analytics-card';
import { AnalyticsInsights } from '@/components/analytics/analytics-insights';
import {
  apiGetAnalyticsInsights,
  apiGetAnalyticsSummary,
  apiGetHealthScore,
} from '@/lib/analytics-api';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const WINDOW_OPTIONS = [7, 30, 90] as const;

export default function AnalyticsPage() {
  const [days, setDays] = React.useState<number>(30);

  const summaryQuery = useQuery({
    queryKey: ['analytics-summary', days],
    queryFn: () => apiGetAnalyticsSummary(days),
  });
  const scoreQuery = useQuery({
    queryKey: ['analytics-score'],
    queryFn: () => apiGetHealthScore(),
  });
  const insightsQuery = useQuery({
    queryKey: ['analytics-insights', days],
    queryFn: () => apiGetAnalyticsInsights(days),
  });

  const score = scoreQuery.data?.score ?? null;

  return (
    <RequireAuth>
      <div className="container mx-auto max-w-6xl space-y-8 px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"
              aria-hidden="true"
            >
              <BarChart3 className="size-5" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold">Health analytics</h1>
              <p className="text-sm text-muted-foreground">
                See how your health measurements track over time.
              </p>
            </div>
          </div>
          <div className="flex gap-1 rounded-full border p-1" role="group" aria-label="Window">
            {WINDOW_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setDays(option)}
                aria-pressed={days === option}
                className={cn(
                  'rounded-full px-3 py-1 text-sm transition-colors',
                  days === option
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {option}d
              </button>
            ))}
          </div>
        </div>

        <section aria-label="Health score">
          {scoreQuery.isLoading ? (
            <Skeleton className="h-56" />
          ) : score ? (
            <ScoreGauge score={score} />
          ) : (
            <p className="text-sm text-destructive">Unable to load your health score.</p>
          )}
        </section>

        <section aria-label="Score breakdown">
          {scoreQuery.isLoading ? (
            <Skeleton className="h-72" />
          ) : score ? (
            <ScoreComponents score={score} />
          ) : null}
        </section>

        <section aria-label="Metric analytics">
          {summaryQuery.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-56" />
              <Skeleton className="h-56" />
            </div>
          ) : summaryQuery.data ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {summaryQuery.data.summary.metrics.map((metric) => (
                <MetricAnalyticsCard key={metric.type} analytics={metric} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-destructive">Unable to load your analytics.</p>
          )}
        </section>

        <section aria-label="Insights">
          {insightsQuery.isLoading ? (
            <Skeleton className="h-48" />
          ) : insightsQuery.data ? (
            <AnalyticsInsights insights={insightsQuery.data.insights.items} />
          ) : null}
        </section>
      </div>
    </RequireAuth>
  );
}
