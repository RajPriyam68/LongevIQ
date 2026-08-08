import { describe, expect, it } from 'vitest';
import type { HealthMetric } from '@longeviq/shared';
import {
  formatDate,
  formatDateTime,
  formatDelta,
  formatMetricValue,
  formatNumber,
  metricTypeLabel,
} from './metrics-format';

function metric(overrides: Partial<HealthMetric>): HealthMetric {
  return {
    id: 'm1',
    type: 'WEIGHT',
    value: 72.5,
    unit: 'kg',
    recordedAt: '2026-08-01T10:00:00.000Z',
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('formatNumber', () => {
  it('formats integers without decimals', () => {
    expect(formatNumber(72)).toBe('72');
  });

  it('rounds decimals to two places', () => {
    expect(formatNumber(72.125)).toBe('72.13');
    expect(formatNumber(1.5)).toBe('1.5');
  });
});

describe('formatMetricValue', () => {
  it('renders single value with unit', () => {
    expect(formatMetricValue(metric({}))).toBe('72.5 kg');
  });

  it('renders blood pressure as systolic/diastolic', () => {
    const bp = metric({
      type: 'BLOOD_PRESSURE',
      value: 120,
      valueSecondary: 80,
      unit: 'mmHg',
    });
    expect(formatMetricValue(bp)).toBe('120/80 mmHg');
  });
});

describe('formatDate / formatDateTime', () => {
  it('formats a date', () => {
    expect(formatDate('2026-08-01T10:00:00.000Z')).toContain('Aug 1, 2026');
  });

  it('formats a date-time', () => {
    expect(formatDateTime('2026-08-01T10:00:00.000Z')).toContain('2026');
  });
});

describe('metricTypeLabel', () => {
  it('returns the meta label', () => {
    expect(metricTypeLabel('HEART_RATE')).toBe('Heart rate');
  });
});

describe('formatDelta', () => {
  it('adds a plus sign for positive deltas', () => {
    expect(formatDelta(1.5)).toBe('+1.5');
  });

  it('uses a minus sign for negative deltas', () => {
    expect(formatDelta(-0.25)).toBe('−0.25');
  });

  it('returns a bare zero', () => {
    expect(formatDelta(0)).toBe('0');
  });
});
