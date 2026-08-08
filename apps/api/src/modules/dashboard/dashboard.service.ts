import type { HealthMetric as HealthMetricEntity } from '@prisma/client';
import {
  HEALTH_METRIC_META,
  HEALTH_METRIC_TYPE_VALUES,
  type DashboardOverview,
} from '@longeviq/shared';
import { serializeHealthMetric } from '../metrics/metrics.service.js';
import type { MetricsRepository } from '../metrics/metrics.repository.types.js';

export class DashboardService {
  constructor(private readonly repository: MetricsRepository) {}

  async overview(userId: string): Promise<DashboardOverview> {
    const types = HEALTH_METRIC_TYPE_VALUES;

    const [latestByType, counts, recent] = await Promise.all([
      this.repository.latestPerType(userId, types),
      this.repository.countsByType(userId, types),
      this.repository.recentByUser(userId, 10),
    ]);

    const latestMap = new Map(latestByType.map((metric) => [metric.type, metric]));
    const countMap = new Map(counts.map((row) => [row.type, row.count]));

    const previousByType = new Map<string, HealthMetricEntity>();
    await Promise.all(
      types.map(async (type) => {
        const latest = latestMap.get(type);
        if (!latest) return;
        const previous = await this.repository.previousBefore(userId, type, latest.recordedAt);
        if (previous) previousByType.set(type, previous);
      }),
    );

    const summary: DashboardOverview['summary'] = types.map((type) => {
      const meta = HEALTH_METRIC_META[type];
      const latest = latestMap.get(type) ?? null;
      const previous = previousByType.get(type) ?? null;
      const delta = latest && previous ? round(latest.value - previous.value) : null;
      return {
        type,
        label: meta.label,
        unit: meta.unit,
        count: countMap.get(type) ?? 0,
        latest: latest ? serializeHealthMetric(latest) : null,
        previous: previous ? serializeHealthMetric(previous) : null,
        delta,
      };
    });

    return { summary, recent: recent.map(serializeHealthMetric) };
  }
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
