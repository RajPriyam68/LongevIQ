import type { HealthMetricType } from './enums.js';

export interface HealthMetric {
  id: string;
  type: HealthMetricType;
  value: number;
  valueSecondary?: number | null;
  unit: string;
  recordedAt: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HealthMetricMeta {
  label: string;
  unit: string;
  min: number;
  max: number;
  /** For compound metrics (e.g. blood pressure) the secondary measurement label. */
  secondaryLabel?: string;
  secondaryMin?: number;
  secondaryMax?: number;
}

export const HEALTH_METRIC_META: Record<HealthMetricType, HealthMetricMeta> = {
  BLOOD_PRESSURE: {
    label: 'Blood pressure',
    unit: 'mmHg',
    min: 60,
    max: 250,
    secondaryLabel: 'Diastolic',
    secondaryMin: 40,
    secondaryMax: 150,
  },
  HEART_RATE: { label: 'Heart rate', unit: 'bpm', min: 20, max: 250 },
  WEIGHT: { label: 'Weight', unit: 'kg', min: 1, max: 500 },
  BLOOD_GLUCOSE: { label: 'Blood glucose', unit: 'mg/dL', min: 20, max: 600 },
  BMI: { label: 'Body mass index', unit: 'kg/m²', min: 10, max: 80 },
  SLEEP_HOURS: { label: 'Sleep', unit: 'hours', min: 0, max: 24 },
  STEPS: { label: 'Steps', unit: 'steps', min: 0, max: 200_000 },
  BODY_TEMPERATURE: { label: 'Body temperature', unit: '°C', min: 30, max: 45 },
};

export function isCompoundMetricType(type: HealthMetricType): boolean {
  return Boolean(HEALTH_METRIC_META[type].secondaryLabel);
}

export interface DashboardOverview {
  summary: Array<{
    type: HealthMetricType;
    label: string;
    unit: string;
    count: number;
    latest: HealthMetric | null;
    previous: HealthMetric | null;
    delta: number | null;
  }>;
  recent: HealthMetric[];
}

export interface MetricListResult {
  items: HealthMetric[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
