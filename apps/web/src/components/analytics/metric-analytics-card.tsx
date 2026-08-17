'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { MetricAnalytics } from '@longeviq/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { METRIC_COLORS, formatNumber } from '@/lib/metrics-format';
import { directionLabel, formatRangeLabel, statusLabel } from '@/lib/analytics-format';

interface MetricAnalyticsCardProps {
  analytics: MetricAnalytics;
}

const STATUS_VARIANT: Record<MetricAnalytics['status'], BadgeProps['variant']> = {
  normal: 'success',
  high: 'destructive',
  low: 'secondary',
  unknown: 'outline',
};

function DirectionBadge({ analytics }: { analytics: MetricAnalytics }) {
  if (analytics.delta === null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        no trend
      </span>
    );
  }
  const Icon =
    analytics.direction === 'up'
      ? TrendingUp
      : analytics.direction === 'down'
        ? TrendingDown
        : Minus;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        analytics.direction === 'stable'
          ? 'bg-muted text-muted-foreground'
          : analytics.direction === 'up'
            ? 'bg-amber-500/10 text-amber-600'
            : 'bg-emerald-500/10 text-emerald-600'
      }`}
    >
      <Icon className="size-3.5" />
      {directionLabel(analytics.direction)} {formatNumber(Math.abs(analytics.delta))}
    </span>
  );
}

interface Domain {
  lower: number;
  upper: number;
}

function rangeDomain(analytics: MetricAnalytics): Domain | null {
  const range = analytics.recommendedRange;
  if (!range) return null;
  const lower = Math.min(range.min, analytics.min ?? range.min);
  let upper: number;
  if (range.max === null) {
    upper = Math.max(analytics.max ?? 0, range.min);
    if (upper <= range.min) upper = range.min * 1.4 || range.min + 1;
  } else {
    upper = Math.max(range.max, analytics.max ?? 0);
  }
  if (upper <= lower) upper = lower + 1;
  return { lower, upper };
}

function toPercent(value: number, domain: Domain): number {
  return Math.min(100, Math.max(0, ((value - domain.lower) / (domain.upper - domain.lower)) * 100));
}

function RangeBar({ analytics }: { analytics: MetricAnalytics }) {
  const range = analytics.recommendedRange;
  const domain = rangeDomain(analytics);
  if (!range || !domain) return null;

  const bandLeft = toPercent(range.min, domain);
  const bandWidth = range.max === null ? 100 - bandLeft : toPercent(range.max, domain) - bandLeft;
  const markerValue = analytics.latest ?? analytics.average;

  return (
    <div className="space-y-1.5">
      <div className="relative h-2 w-full rounded-full bg-muted">
        <div
          className="absolute h-full rounded-full bg-emerald-500/50"
          style={{ left: `${bandLeft}%`, width: `${Math.max(0, bandWidth)}%` }}
        />
        {markerValue !== null ? (
          <div
            className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-foreground"
            style={{ left: `${toPercent(markerValue, domain)}%` }}
          />
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        Recommended: {formatRangeLabel(range)}
        {markerValue !== null ? ` · latest ${formatNumber(markerValue)} ${range.unit}` : ''}
      </p>
    </div>
  );
}

function Sparkline({ analytics }: { analytics: MetricAnalytics }) {
  const data = analytics.series.map((point) => ({
    label: point.recordedAt,
    value: point.value,
    secondary: point.valueSecondary ?? null,
  }));

  if (data.length === 0) {
    return (
      <p className="flex h-16 items-center justify-center text-xs text-muted-foreground">
        No measurements in this window.
      </p>
    );
  }

  const isBloodPressure = analytics.type === 'BLOOD_PRESSURE';

  return (
    <div className="h-16 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
          <XAxis dataKey="label" hide />
          <YAxis hide domain={['auto', 'auto']} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={METRIC_COLORS[analytics.type]}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          {isBloodPressure ? (
            <Line
              type="monotone"
              dataKey="secondary"
              stroke="#a78bfa"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          ) : null}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MetricAnalyticsCard({ analytics }: MetricAnalyticsCardProps) {
  const range = analytics.recommendedRange;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <CardTitle className="text-base">{analytics.label}</CardTitle>
        <Badge
          variant={STATUS_VARIANT[analytics.status]}
          className={
            analytics.status === 'low'
              ? 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
              : undefined
          }
        >
          {statusLabel(analytics.status)}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold">
            {analytics.average === null ? '—' : formatNumber(analytics.average)}
          </span>
          <span className="text-sm text-muted-foreground">{analytics.unit}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>min {analytics.min === null ? '—' : formatNumber(analytics.min)}</span>
          <span aria-hidden="true">·</span>
          <span>max {analytics.max === null ? '—' : formatNumber(analytics.max)}</span>
          <span aria-hidden="true">·</span>
          <span>
            {analytics.count} {analytics.count === 1 ? 'entry' : 'entries'}
          </span>
          <span aria-hidden="true">·</span>
          <DirectionBadge analytics={analytics} />
        </div>
        {range ? <RangeBar analytics={analytics} /> : null}
        <Sparkline analytics={analytics} />
      </CardContent>
    </Card>
  );
}
