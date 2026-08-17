import type { MetricDirection, MetricStatus, RecommendedRange } from '@longeviq/shared';
import { METRIC_DIRECTION_LABELS, METRIC_STATUS_LABELS } from '@longeviq/shared';
import { formatNumber } from '@/lib/metrics-format';

export type ScoreTone = 'positive' | 'neutral' | 'warning' | 'danger';

export const SCORE_TONE_COLORS: Record<ScoreTone, string> = {
  positive: '#10b981',
  neutral: '#3b82f6',
  warning: '#f59e0b',
  danger: '#ef4444',
};

export function scoreTone(score: number | null): ScoreTone {
  if (score === null) return 'neutral';
  if (score >= 85) return 'positive';
  if (score >= 70) return 'neutral';
  if (score >= 50) return 'warning';
  return 'danger';
}

export function statusLabel(status: MetricStatus): string {
  return METRIC_STATUS_LABELS[status];
}

export function directionLabel(direction: MetricDirection): string {
  return METRIC_DIRECTION_LABELS[direction];
}

export function formatRangeLabel(range: RecommendedRange | null): string {
  if (!range) return 'No reference range';
  if (range.higherIsBetter || range.max === null) {
    return `at least ${formatNumber(range.min)} ${range.unit}`;
  }
  return `${formatNumber(range.min)}-${formatNumber(range.max)} ${range.unit}`;
}
