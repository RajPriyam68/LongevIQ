import type { HealthMetricType } from './enums.js';
import { HEALTH_METRIC_META } from './metrics.js';

export const ANALYTICS_DEFAULT_DAYS = 30;
export const ANALYTICS_MAX_DAYS = 365;

export type MetricDirection = 'up' | 'down' | 'stable';
export type MetricStatus = 'normal' | 'high' | 'low' | 'unknown';
export type AnalyticsInsightSeverity = 'info' | 'warning' | 'positive';

export interface MetricPoint {
  recordedAt: string;
  value: number;
  valueSecondary?: number | null;
}

export interface RecommendedRange {
  min: number;
  /** `null` (with `higherIsBetter`) means there is no upper bound. */
  max: number | null;
  unit: string;
  /** For metrics where more is always better (e.g. steps). */
  higherIsBetter?: boolean;
}

export interface MetricAnalytics {
  type: HealthMetricType;
  label: string;
  unit: string;
  count: number;
  min: number | null;
  max: number | null;
  average: number | null;
  latest: number | null;
  previous: number | null;
  delta: number | null;
  direction: MetricDirection;
  status: MetricStatus;
  recommendedRange: RecommendedRange | null;
  series: MetricPoint[];
}

export interface AnalyticsSummary {
  windowDays: number;
  generatedAt: string;
  metrics: MetricAnalytics[];
}

export interface HealthScoreComponent {
  type: HealthMetricType;
  label: string;
  unit: string;
  score: number | null;
  status: MetricStatus;
  weight: number;
  readings: number;
}

export interface HealthScoreResult {
  overall: number | null;
  label: string;
  coverage: { scored: number; total: number };
  components: HealthScoreComponent[];
}

export interface AnalyticsInsight {
  severity: AnalyticsInsightSeverity;
  title: string;
  message: string;
  metricType?: HealthMetricType;
}

export interface AnalyticsInsights {
  windowDays: number;
  generatedAt: string;
  items: AnalyticsInsight[];
}

export const METRIC_STATUS_LABELS: Record<MetricStatus, string> = {
  normal: 'In range',
  high: 'Above range',
  low: 'Below range',
  unknown: 'No data',
};

export const METRIC_DIRECTION_LABELS: Record<MetricDirection, string> = {
  up: 'Rising',
  down: 'Falling',
  stable: 'Stable',
};

export const INSIGHT_SEVERITY_LABELS: Record<AnalyticsInsightSeverity, string> = {
  info: 'Info',
  warning: 'Warning',
  positive: 'Positive',
};

/** Metric types with a well-established reference band, eligible for scoring. */
export const SCORED_METRIC_TYPES: readonly HealthMetricType[] = [
  'BLOOD_PRESSURE',
  'HEART_RATE',
  'BLOOD_GLUCOSE',
  'BMI',
  'SLEEP_HOURS',
  'STEPS',
  'BODY_TEMPERATURE',
];

interface ScoreBand {
  idealMin: number;
  idealMax: number;
  zeroMin: number;
  zeroMax: number;
  /** One-sided band (higher is better): full score at/above idealMin, zero at zeroMin. */
  oneSided?: boolean;
}

// Standard, widely-cited reference bands used for the educational health score.
// Values map linearly from 100 inside the ideal band to 0 at the extreme ends.
const SCORE_BANDS: Partial<Record<HealthMetricType, ScoreBand>> = {
  BLOOD_PRESSURE: { idealMin: 90, idealMax: 120, zeroMin: 70, zeroMax: 180 },
  HEART_RATE: { idealMin: 55, idealMax: 90, zeroMin: 30, zeroMax: 160 },
  BLOOD_GLUCOSE: { idealMin: 70, idealMax: 99, zeroMin: 40, zeroMax: 300 },
  BMI: { idealMin: 18.5, idealMax: 24.9, zeroMin: 14, zeroMax: 40 },
  SLEEP_HOURS: { idealMin: 7, idealMax: 9, zeroMin: 3, zeroMax: 16 },
  STEPS: {
    idealMin: 7500,
    idealMax: 7500,
    zeroMin: 0,
    zeroMax: Number.POSITIVE_INFINITY,
    oneSided: true,
  },
  BODY_TEMPERATURE: { idealMin: 36.1, idealMax: 37.2, zeroMin: 35, zeroMax: 41 },
};

const RECOMMENDED_RANGES: Partial<Record<HealthMetricType, Omit<RecommendedRange, 'unit'>>> = {
  BLOOD_PRESSURE: { min: 90, max: 120 },
  HEART_RATE: { min: 60, max: 100 },
  BLOOD_GLUCOSE: { min: 70, max: 99 },
  BMI: { min: 18.5, max: 24.9 },
  SLEEP_HOURS: { min: 7, max: 9 },
  STEPS: { min: 7000, max: null, higherIsBetter: true },
  BODY_TEMPERATURE: { min: 36.1, max: 37.2 },
};

export function recommendedRangeFor(type: HealthMetricType): RecommendedRange | null {
  const raw = RECOMMENDED_RANGES[type];
  if (!raw) return null;
  const meta = HEALTH_METRIC_META[type];
  return { ...raw, unit: meta.unit };
}

/**
 * Maps a metric value to a 0-100 sub-score against its reference band.
 * Returns `null` for unscored metric types or non-finite values.
 */
export function scoreValueForMetric(type: HealthMetricType, value: number): number | null {
  const band = SCORE_BANDS[type];
  if (!band || !Number.isFinite(value)) return null;

  if (band.oneSided) {
    if (value >= band.idealMin) return 100;
    if (value <= band.zeroMin) return 0;
    return clamp(
      Math.round(((value - band.zeroMin) / (band.idealMin - band.zeroMin)) * 100),
      0,
      100,
    );
  }

  if (value <= band.zeroMin || value >= band.zeroMax) return 0;
  if (value >= band.idealMin && value <= band.idealMax) return 100;

  if (value < band.idealMin) {
    const t = (value - band.zeroMin) / (band.idealMin - band.zeroMin);
    return clamp(Math.round(t * 100), 0, 100);
  }

  const t = (value - band.idealMax) / (band.zeroMax - band.idealMax);
  return clamp(Math.round((1 - t) * 100), 0, 100);
}

/** Compares a value against the metric's recommended range (''unknown'' when no range). */
export function metricStatusForValue(type: HealthMetricType, value: number | null): MetricStatus {
  if (value === null || !Number.isFinite(value)) return 'unknown';
  const range = recommendedRangeFor(type);
  if (!range) return 'unknown';
  if (range.higherIsBetter) {
    return value >= range.min ? 'normal' : 'low';
  }
  if (range.max === null) return 'normal';
  if (value < range.min) return 'low';
  if (value > range.max) return 'high';
  return 'normal';
}

/** Trend direction from a delta against the latest value; small moves count as stable. */
export function metricDirection(delta: number | null, latest: number | null): MetricDirection {
  if (delta === null || delta === 0 || latest === null) return 'stable';
  const magnitude = Math.abs(latest);
  const threshold = magnitude === 0 ? Number.POSITIVE_INFINITY : magnitude * 0.01;
  if (Math.abs(delta) < threshold) return 'stable';
  return delta > 0 ? 'up' : 'down';
}

export function healthScoreLabel(overall: number | null): string {
  if (overall === null) return 'Insufficient data';
  if (overall >= 85) return 'Excellent';
  if (overall >= 70) return 'Good';
  if (overall >= 50) return 'Fair';
  return 'Needs attention';
}

export function roundTo(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
