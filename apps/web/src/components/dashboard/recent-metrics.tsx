'use client';

import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Trash2 } from 'lucide-react';
import type { HealthMetric } from '@longeviq/shared';
import { apiDeleteMetric } from '@/lib/metrics-api';
import { isApiClientError } from '@/lib/api-client';
import { formatDateTime, formatMetricValue, metricTypeLabel } from '@/lib/metrics-format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RecentMetricsProps {
  metrics: HealthMetric[];
  onDeleted: () => Promise<void> | void;
}

export function RecentMetrics({ metrics, onDeleted }: RecentMetricsProps) {
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDeleteMetric(id),
    onSuccess: async () => {
      toast.success('Measurement deleted.');
      await onDeleted();
    },
    onError: (error: unknown) => {
      toast.error(isApiClientError(error) ? error.message : 'Unable to delete the measurement.');
    },
  });

  if (metrics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent measurements</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No measurements yet. Add your first one above.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent measurements</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 pr-4 font-medium">Metric</th>
              <th className="pb-2 pr-4 font-medium">Value</th>
              <th className="pb-2 pr-4 font-medium">Recorded at</th>
              <th className="pb-2 pr-4 font-medium">Notes</th>
              <th className="pb-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => (
              <tr key={metric.id} className="border-b last:border-0">
                <td className="py-2 pr-4">{metricTypeLabel(metric.type)}</td>
                <td className="py-2 pr-4 font-medium">{formatMetricValue(metric)}</td>
                <td className="py-2 pr-4 text-muted-foreground">
                  {formatDateTime(metric.recordedAt)}
                </td>
                <td
                  className="max-w-[16rem] truncate py-2 pr-4 text-muted-foreground"
                  title={metric.notes ?? undefined}
                >
                  {metric.notes ?? '—'}
                </td>
                <td className="py-2 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Delete ${metricTypeLabel(metric.type)} measurement`}
                    onClick={() => deleteMutation.mutate(metric.id)}
                  >
                    {deleteMutation.isPending && deleteMutation.variables === metric.id ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="size-4" aria-hidden="true" />
                    )}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
