'use client';

import type { HealthScoreResult } from '@longeviq/shared';
import { Card, CardContent } from '@/components/ui/card';
import { SCORE_TONE_COLORS, scoreTone } from '@/lib/analytics-format';

const RADIUS = 56;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ScoreGauge({ score }: { score: HealthScoreResult }) {
  const value = score.overall;
  const tone = scoreTone(value);
  const progress = value === null ? 0 : value / 100;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 p-6">
        <div className="relative size-40">
          <svg viewBox="0 0 128 128" className="size-40 -rotate-90" aria-hidden="true">
            <circle
              cx="64"
              cy="64"
              r={RADIUS}
              fill="none"
              strokeWidth="12"
              className="stroke-muted"
            />
            <circle
              cx="64"
              cy="64"
              r={RADIUS}
              fill="none"
              strokeWidth="12"
              strokeLinecap="round"
              stroke={SCORE_TONE_COLORS[tone]}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold">{value === null ? '—' : value}</span>
            <span className="text-xs text-muted-foreground">/ 100</span>
          </div>
        </div>
        <p className="text-lg font-medium">{score.label}</p>
        <p className="text-sm text-muted-foreground">
          Based on {score.coverage.scored} of {score.coverage.total} scored metrics.
        </p>
      </CardContent>
    </Card>
  );
}
