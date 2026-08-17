'use client';

import type { HealthScoreResult } from '@longeviq/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber } from '@/lib/metrics-format';
import { SCORE_TONE_COLORS, scoreTone, statusLabel } from '@/lib/analytics-format';

export function ScoreComponents({ score }: { score: HealthScoreResult }) {
  const hasData = score.components.some((component) => component.score !== null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Score breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasData ? (
          <p className="text-sm text-muted-foreground">
            Log health measurements to unlock your per-metric scores.
          </p>
        ) : (
          score.components.map((component) => {
            const tone = scoreTone(component.score);
            return (
              <div key={component.type} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{component.label}</span>
                  <span className="text-muted-foreground">
                    {component.score === null ? '—' : formatNumber(component.score)}
                    <span className="text-xs"> / 100</span>
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${component.score ?? 0}%`,
                      backgroundColor: SCORE_TONE_COLORS[tone],
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {component.score === null
                    ? 'No readings yet'
                    : `${statusLabel(component.status)} · ${component.readings} ${component.readings === 1 ? 'reading' : 'readings'}`}
                </p>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
