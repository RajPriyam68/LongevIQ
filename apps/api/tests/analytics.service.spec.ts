import { beforeEach, describe, expect, it } from 'vitest';
import { AnalyticsService } from '../src/modules/analytics/analytics.service.js';
import type { MetricsRepository } from '../src/modules/metrics/metrics.repository.types.js';
import { FakeMetricsRepository, type MetricLike } from './fakes.js';
import { healthScoreLabel, scoreValueForMetric } from '@longeviq/shared';

const OWNER = 'usr_owner';
const OTHER = 'usr_other';
const DAY_MS = 24 * 60 * 60 * 1000;

describe('AnalyticsService', () => {
  let repository: FakeMetricsRepository;
  let service: AnalyticsService;

  beforeEach(() => {
    repository = new FakeMetricsRepository();
    service = new AnalyticsService(repository as unknown as MetricsRepository);
  });

  async function seed(
    userId: string,
    type: string,
    value: number,
    recordedAt = new Date(),
    valueSecondary: number | null = null,
  ): Promise<MetricLike> {
    return repository.create({
      userId,
      type,
      value,
      valueSecondary,
      unit: type === 'BLOOD_PRESSURE' ? 'mmHg' : 'bpm',
      recordedAt,
    });
  }

  describe('score', () => {
    it('computes an overall score from scored component sub-scores', async () => {
      await seed(OWNER, 'SLEEP_HOURS', 8); // ideal -> 100
      await seed(OWNER, 'HEART_RATE', 70); // ideal -> 100

      const result = await service.score(OWNER);

      expect(result.overall).toBe(100);
      expect(result.label).toBe('Excellent');
      expect(result.coverage).toEqual({ scored: 2, total: 7 });
      expect(result.components).toHaveLength(7);
      expect(result.components.find((c) => c.type === 'SLEEP_HOURS')?.score).toBe(100);
      expect(result.components.find((c) => c.type === 'WEIGHT')).toBeUndefined();
    });

    it('returns null overall when no scored metric type has data', async () => {
      await seed(OWNER, 'WEIGHT', 80);

      const result = await service.score(OWNER);

      expect(result.overall).toBeNull();
      expect(result.label).toBe('Insufficient data');
      expect(result.coverage.scored).toBe(0);
      expect(result.components.every((c) => c.score === null)).toBe(true);
    });

    it('averages component scores and applies the correct label band', async () => {
      await seed(OWNER, 'SLEEP_HOURS', 8); // 100
      await seed(OWNER, 'BLOOD_GLUCOSE', 120); // between idealMax 99 and zeroMax 300

      const result = await service.score(OWNER);
      const glucoseScore = scoreValueForMetric('BLOOD_GLUCOSE', 120);

      expect(glucoseScore).toBeGreaterThan(0);
      expect(glucoseScore).toBeLessThan(100);
      expect(result.overall).toBe(Math.round((100 + (glucoseScore as number)) / 2));
      expect(result.label).toBe(healthScoreLabel(result.overall));
    });

    it('does not read another user metrics', async () => {
      await seed(OWNER, 'SLEEP_HOURS', 8);

      const result = await service.score(OTHER);

      expect(result.overall).toBeNull();
      expect(result.coverage.scored).toBe(0);
    });
  });

  describe('scoreValueForMetric', () => {
    it('scores 100 inside the ideal band and 0 at the extremes', () => {
      expect(scoreValueForMetric('BMI', 22)).toBe(100);
      expect(scoreValueForMetric('BMI', 13)).toBe(0);
      expect(scoreValueForMetric('BMI', 45)).toBe(0);
    });

    it('interpolates linearly below and above the ideal band', () => {
      const halfBelow = scoreValueForMetric('BMI', (18.5 + 14) / 2);
      expect(halfBelow).toBe(50);
      const halfAbove = scoreValueForMetric('BMI', (24.9 + 40) / 2);
      expect(halfAbove).toBe(50);
    });

    it('is one-sided for steps (higher is better)', () => {
      expect(scoreValueForMetric('STEPS', 9000)).toBe(100);
      expect(scoreValueForMetric('STEPS', 7500)).toBe(100);
      expect(scoreValueForMetric('STEPS', 0)).toBe(0);
      expect(scoreValueForMetric('STEPS', 3750)).toBe(50);
    });

    it('returns null for unscored types and non-finite values', () => {
      expect(scoreValueForMetric('WEIGHT', 80)).toBeNull();
      expect(scoreValueForMetric('SLEEP_HOURS', Number.NaN)).toBeNull();
    });
  });

  describe('summary', () => {
    it('computes stats, trend, and status from readings in the window', async () => {
      const base = new Date();
      await seed(OWNER, 'SLEEP_HOURS', 6.5, new Date(base.getTime() - 2 * DAY_MS));
      await seed(OWNER, 'SLEEP_HOURS', 7.5, new Date(base.getTime() - 1 * DAY_MS));
      await seed(OWNER, 'SLEEP_HOURS', 8.5, base);

      const { metrics } = await service.summary(OWNER, 30);
      const sleep = metrics.find((m) => m.type === 'SLEEP_HOURS')!;

      expect(sleep.count).toBe(3);
      expect(sleep.min).toBe(6.5);
      expect(sleep.max).toBe(8.5);
      expect(sleep.average).toBe(7.5);
      expect(sleep.latest).toBe(8.5);
      expect(sleep.previous).toBe(7.5);
      expect(sleep.delta).toBe(1);
      expect(sleep.direction).toBe('up');
      expect(sleep.status).toBe('normal');
      expect(sleep.recommendedRange?.min).toBe(7);
      expect(sleep.recommendedRange?.max).toBe(9);
      expect(sleep.series.map((point) => point.value)).toEqual([6.5, 7.5, 8.5]);
    });

    it('flags high/low status from the window average', async () => {
      await seed(OWNER, 'HEART_RATE', 150);

      const { metrics } = await service.summary(OWNER, 30);
      const heartRate = metrics.find((m) => m.type === 'HEART_RATE')!;
      expect(heartRate.status).toBe('high');
    });

    it('keeps metrics with no readings in the window with count zero', async () => {
      const { metrics } = await service.summary(OWNER, 30);

      expect(metrics).toHaveLength(8);
      expect(metrics.every((m) => m.count === 0)).toBe(true);
      expect(metrics.every((m) => m.series.length === 0)).toBe(true);
    });

    it('ignores readings older than the requested window', async () => {
      await seed(OWNER, 'STEPS', 12000, new Date(Date.now() - 60 * DAY_MS));

      const { metrics } = await service.summary(OWNER, 30);
      const steps = metrics.find((m) => m.type === 'STEPS')!;
      expect(steps.count).toBe(0);
    });
  });

  describe('insights', () => {
    it('prompts to start tracking when there is no data', async () => {
      const { items } = await service.insights(OWNER, 30);

      expect(items).toHaveLength(1);
      expect(items[0]!.severity).toBe('info');
      expect(items[0]!.title).toContain('Start tracking');
    });

    it('warns when the average falls outside the recommended range', async () => {
      await seed(OWNER, 'SLEEP_HOURS', 5.5);

      const { items } = await service.insights(OWNER, 30);
      const warning = items.find((item) => item.severity === 'warning');

      expect(warning).toBeTruthy();
      expect(warning?.metricType).toBe('SLEEP_HOURS');
      expect(warning?.message).toContain('below the recommended 7-9 hours');
    });

    it('reports a positive insight for in-range averages', async () => {
      await seed(OWNER, 'SLEEP_HOURS', 8);

      const { items } = await service.insights(OWNER, 30);
      expect(items.some((item) => item.severity === 'positive')).toBe(true);
    });

    it('adds a trend insight when readings move meaningfully', async () => {
      const base = new Date();
      await seed(OWNER, 'HEART_RATE', 60, new Date(base.getTime() - DAY_MS));
      await seed(OWNER, 'HEART_RATE', 95, base);

      const { items } = await service.insights(OWNER, 30);
      expect(items.some((item) => item.title.includes('trending up'))).toBe(true);
    });

    it('suggests broadening tracking when fewer than three scored types are logged', async () => {
      await seed(OWNER, 'SLEEP_HOURS', 8);

      const { items } = await service.insights(OWNER, 30);
      expect(items.some((item) => item.title === 'Broaden your tracking')).toBe(true);
    });
  });
});
