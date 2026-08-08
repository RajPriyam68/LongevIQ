'use client';

import type { DashboardOverview } from '@longeviq/shared';
import { Card, CardContent } from '@/components/ui/card';
import { formatDelta, formatMetricValue } from '@/lib/metrics-format';

export function OverviewCards({ overview }: { overview: DashboardOverview }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {overview.summary.map((item) => {
        const hasTrend = item.latest && item.previous;
        const positiveIsGood =
          item.type === 'WEIGHT' ? false : item.type === 'SLEEP_HOURS' || item.type === 'STEPS';
        const improving =
          hasTrend && item.delta !== null && (positiveIsGood ? item.delta >= 0 : item.delta <= 0);
        const same = hasTrend && item.delta === 0;

        return (
          <Card key={item.type}>
            <CardContent className="p-4">
              <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
              <p
                className="mt-1 truncate text-lg font-semibold"
                title={item.latest ? formatMetricValue(item.latest) : undefined}
              >
                {item.latest ? formatMetricValue(item.latest) : '—'}
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                {hasTrend && item.delta !== null ? (
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${
                      same
                        ? 'bg-muted text-muted-foreground'
                        : improving
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-amber-500/10 text-amber-600'
                    }`}
                  >
                    {formatDelta(item.delta)}
                  </span>
                ) : (
                  <span className="rounded-full bg-muted px-2 py-0.5">no trend</span>
                )}
                <span>
                  {item.count} {item.count === 1 ? 'entry' : 'entries'}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
