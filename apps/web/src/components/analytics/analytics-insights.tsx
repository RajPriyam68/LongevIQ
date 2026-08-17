'use client';

import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { AnalyticsInsight } from '@longeviq/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const SEVERITY_ICON = {
  info: Info,
  warning: AlertTriangle,
  positive: CheckCircle2,
} as const;

const SEVERITY_STYLE: Record<AnalyticsInsight['severity'], string> = {
  info: 'text-blue-600',
  warning: 'text-amber-600',
  positive: 'text-emerald-600',
};

export function AnalyticsInsights({ insights }: { insights: AnalyticsInsight[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Insights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">No insights yet.</p>
        ) : (
          insights.map((insight, index) => {
            const Icon = SEVERITY_ICON[insight.severity];
            return (
              <div
                key={`${insight.metricType ?? 'global'}-${index}`}
                className="flex gap-3 rounded-lg border p-3"
              >
                <Icon
                  className={`mt-0.5 size-4 shrink-0 ${SEVERITY_STYLE[insight.severity]}`}
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-medium">{insight.title}</p>
                  <p className="text-sm text-muted-foreground">{insight.message}</p>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
