'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { HealthMetric, HealthMetricType } from '@longeviq/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { METRIC_COLORS, formatDateTime, formatNumber } from '@/lib/metrics-format';

interface MetricChartProps {
  type: HealthMetricType;
  metrics: HealthMetric[];
}

interface ChartPoint {
  label: string;
  value: number;
  secondary?: number | null;
}

export function MetricChart({ type, metrics }: MetricChartProps) {
  const data: ChartPoint[] = metrics
    .slice()
    .reverse()
    .map((metric) => ({
      label: formatDateTime(metric.recordedAt),
      value: metric.value,
      secondary: metric.valueSecondary,
    }));

  const isBloodPressure = type === 'BLOOD_PRESSURE';
  const color = METRIC_COLORS[type];
  const secondaryColor = '#a78bfa';

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">History</CardTitle>
        </CardHeader>
        <CardContent className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          No entries yet for this metric.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                tickMargin={8}
                interval="preserveStartEnd"
                minTickGap={32}
              />
              <YAxis tick={{ fontSize: 11 }} width={48} domain={['auto', 'auto']} allowDecimals />
              <Tooltip
                formatter={(value) => formatNumber(Number(value ?? 0))}
                labelStyle={{ fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={{ r: 2.5 }}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
              {isBloodPressure ? (
                <Line
                  type="monotone"
                  dataKey="secondary"
                  stroke={secondaryColor}
                  strokeWidth={2}
                  dot={{ r: 2.5 }}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                />
              ) : null}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
