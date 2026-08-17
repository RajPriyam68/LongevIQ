import type { HealthMetric } from '@prisma/client';
import {
  HEALTH_METRIC_META,
  HEALTH_METRIC_TYPE_VALUES,
  SCORED_METRIC_TYPES,
  type AnalyticsInsight,
  type AnalyticsInsights,
  type AnalyticsSummary,
  type HealthScoreComponent,
  type HealthScoreResult,
  type MetricAnalytics,
  healthScoreLabel,
  metricDirection,
  metricStatusForValue,
  recommendedRangeFor,
  roundTo,
  scoreValueForMetric,
} from '@longeviq/shared';
import type { MetricsRepository } from '../metrics/metrics.repository.types.js';

const MAX_INSIGHTS = 12;
const DAY_MS = 24 * 60 * 60 * 1000;

export class AnalyticsService {
  constructor(private readonly repository: MetricsRepository) {}

  async summary(userId: string, days: number): Promise<AnalyticsSummary> {
    const since = new Date(Date.now() - days * DAY_MS);
    const metrics = await Promise.all(
      HEALTH_METRIC_TYPE_VALUES.map((type) => this.metricAnalytics(userId, type, since)),
    );
    return { windowDays: days, generatedAt: new Date().toISOString(), metrics };
  }

  async score(userId: string): Promise<HealthScoreResult> {
    const [latestByType, counts] = await Promise.all([
      this.repository.latestPerType(userId, HEALTH_METRIC_TYPE_VALUES),
      this.repository.countsByType(userId, HEALTH_METRIC_TYPE_VALUES),
    ]);
    const latestMap = new Map(latestByType.map((metric) => [metric.type, metric]));
    const countMap = new Map(counts.map((row) => [row.type, row.count]));

    const components: HealthScoreComponent[] = SCORED_METRIC_TYPES.map((type) => {
      const latest = latestMap.get(type) ?? null;
      const meta = HEALTH_METRIC_META[type];
      const value = latest ? latest.value : null;
      return {
        type,
        label: meta.label,
        unit: meta.unit,
        score: value !== null ? scoreValueForMetric(type, value) : null,
        status: metricStatusForValue(type, value),
        weight: 1,
        readings: countMap.get(type) ?? 0,
      };
    });

    const scored = components.filter(
      (component): component is HealthScoreComponent & { score: number } =>
        component.score !== null,
    );
    const overall =
      scored.length > 0
        ? Math.round(scored.reduce((sum, component) => sum + component.score, 0) / scored.length)
        : null;

    return {
      overall,
      label: healthScoreLabel(overall),
      coverage: { scored: scored.length, total: SCORED_METRIC_TYPES.length },
      components,
    };
  }

  async insights(userId: string, days: number): Promise<AnalyticsInsights> {
    const { metrics } = await this.summary(userId, days);
    const items: AnalyticsInsight[] = [];

    const tracked = metrics.filter((metric) => metric.count > 0);
    if (tracked.length === 0) {
      items.push({
        severity: 'info',
        title: 'Start tracking your health',
        message:
          'Log at least one health measurement to unlock personalized insights and your health score.',
      });
      return { windowDays: days, generatedAt: new Date().toISOString(), items };
    }

    for (const metric of tracked) {
      const range = metric.recommendedRange;
      if (range && metric.average !== null) {
        if (range.higherIsBetter) {
          const label = metric.label.toLowerCase();
          if (metric.average < range.min) {
            items.push({
              severity: 'warning',
              title: `${metric.label} below recommended level`,
              message: `Your average ${label} (${metric.average} ${range.unit}) is below the recommended minimum of ${range.min} ${range.unit}.`,
              metricType: metric.type,
            });
          } else {
            items.push({
              severity: 'positive',
              title: `${metric.label} on track`,
              message: `Your average ${label} (${metric.average} ${range.unit}) is at or above the recommended minimum of ${range.min} ${range.unit}.`,
              metricType: metric.type,
            });
          }
        } else if (range.max !== null) {
          const label = metric.label.toLowerCase();
          if (metric.average < range.min || metric.average > range.max) {
            const bound =
              metric.average < range.min
                ? `below the recommended ${range.min}-${range.max} ${range.unit} range`
                : `above the recommended ${range.min}-${range.max} ${range.unit} range`;
            items.push({
              severity: 'warning',
              title: `${metric.label} outside recommended range`,
              message: `Your average ${label} (${metric.average} ${range.unit}) is ${bound}.`,
              metricType: metric.type,
            });
          } else {
            items.push({
              severity: 'positive',
              title: `${metric.label} within recommended range`,
              message: `Your average ${label} (${metric.average} ${range.unit}) is within the recommended ${range.min}-${range.max} ${range.unit} range.`,
              metricType: metric.type,
            });
          }
        }
      }

      if (metric.count >= 2 && metric.delta !== null && metric.direction !== 'stable') {
        const label = metric.label.toLowerCase();
        items.push({
          severity: 'info',
          title: `${metric.label} trending ${metric.direction === 'up' ? 'up' : 'down'}`,
          message: `Your latest ${label} reading is ${metric.direction === 'up' ? 'up' : 'down'} ${Math.abs(metric.delta)} ${metric.unit} from the previous one.`,
          metricType: metric.type,
        });
      }
    }

    const scoredTracked = tracked.filter((metric) =>
      SCORED_METRIC_TYPES.includes(metric.type),
    ).length;
    if (scoredTracked < 3) {
      items.push({
        severity: 'info',
        title: 'Broaden your tracking',
        message:
          'Tracking at least three health metrics gives you a more complete health score and richer insights.',
      });
    }

    return {
      windowDays: days,
      generatedAt: new Date().toISOString(),
      items: items.slice(0, MAX_INSIGHTS),
    };
  }

  private async metricAnalytics(
    userId: string,
    type: (typeof HEALTH_METRIC_TYPE_VALUES)[number],
    since: Date,
  ): Promise<MetricAnalytics> {
    const { items } = await this.repository.listByUser(userId, {
      type,
      from: since,
      page: 1,
      limit: 100,
      sort: 'desc',
    });
    const meta = HEALTH_METRIC_META[type];
    const values = items.map((metric) => metric.value);
    const count = values.length;
    const latest = items[0] ?? null;
    const previous = items[1] ?? null;
    const latestValue = latest ? latest.value : null;
    const previousValue = previous ? previous.value : null;
    const delta =
      latestValue !== null && previousValue !== null ? roundTo(latestValue - previousValue) : null;
    const average =
      count > 0 ? roundTo(values.reduce((sum, value) => sum + value, 0) / count) : null;

    return {
      type,
      label: meta.label,
      unit: meta.unit,
      count,
      min: count > 0 ? Math.min(...values) : null,
      max: count > 0 ? Math.max(...values) : null,
      average,
      latest: latestValue,
      previous: previousValue,
      delta,
      direction: metricDirection(delta, latestValue),
      status: metricStatusForValue(type, average),
      recommendedRange: recommendedRangeFor(type),
      series: ascending(items).map(serializePoint),
    };
  }
}

function ascending(items: HealthMetric[]): HealthMetric[] {
  return [...items].sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
}

function serializePoint(metric: HealthMetric) {
  return {
    recordedAt: metric.recordedAt.toISOString(),
    value: metric.value,
    valueSecondary: metric.valueSecondary,
  };
}
