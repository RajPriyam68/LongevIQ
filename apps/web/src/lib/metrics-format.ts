import { HEALTH_METRIC_META, type HealthMetric, type HealthMetricType } from '@longeviq/shared';

export const METRIC_COLORS: Record<HealthMetricType, string> = {
  BLOOD_PRESSURE: '#6366f1',
  HEART_RATE: '#ef4444',
  WEIGHT: '#10b981',
  BLOOD_GLUCOSE: '#f59e0b',
  BMI: '#8b5cf6',
  SLEEP_HOURS: '#3b82f6',
  STEPS: '#ec4899',
  BODY_TEMPERATURE: '#f97316',
};

export function formatMetricValue(metric: HealthMetric): string {
  if (metric.type === 'BLOOD_PRESSURE' && metric.valueSecondary != null) {
    return `${formatNumber(metric.value)}/${formatNumber(metric.valueSecondary)} ${metric.unit}`;
  }
  return `${formatNumber(metric.value)} ${metric.unit}`;
}

export function formatNumber(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(2).replace(/0+$/, '');
}

const dateFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

export function metricTypeLabel(type: HealthMetricType): string {
  return HEALTH_METRIC_META[type].label;
}

export function formatDelta(value: number): string {
  if (value === 0) return '0';
  const sign = value > 0 ? '+' : '−';
  return `${sign}${formatNumber(Math.abs(value))}`;
}
