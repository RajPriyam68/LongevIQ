import type { HealthMetric as HealthMetricEntity } from '@prisma/client';
import {
  HEALTH_METRIC_META,
  type CreateMetricInput,
  type HealthMetric,
  type ListMetricsQuery,
  type UpdateMetricInput,
} from '@longeviq/shared';
import { AppError } from '../../utils/app-error.js';
import type { AuditSink, MetricsRepository } from './metrics.repository.types.js';

export interface RequestContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class MetricsService {
  constructor(
    private readonly repository: MetricsRepository,
    private readonly audit?: AuditSink,
  ) {}

  async createMetric(
    userId: string,
    input: CreateMetricInput,
    ctx: RequestContext = {},
  ): Promise<HealthMetric> {
    const meta = HEALTH_METRIC_META[input.type];
    const metric = await this.repository.create({
      userId,
      type: input.type,
      value: input.value,
      valueSecondary: input.valueSecondary ?? null,
      unit: meta.unit,
      recordedAt: input.recordedAt ? new Date(input.recordedAt) : new Date(),
      notes: input.notes ?? null,
    });

    await this.audit?.recordAudit({
      userId,
      action: 'DATA.METRIC_CREATE',
      entity: 'HealthMetric',
      entityId: metric.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return serializeHealthMetric(metric);
  }

  async listMetrics(
    userId: string,
    query: ListMetricsQuery,
  ): Promise<{
    items: HealthMetric[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { items, total } = await this.repository.listByUser(userId, {
      type: query.type,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      page: query.page,
      limit: query.limit,
      sort: query.sort,
    });

    return {
      items: items.map(serializeHealthMetric),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getMetric(userId: string, id: string): Promise<HealthMetric> {
    const metric = await this.requireOwned(userId, id);
    return serializeHealthMetric(metric);
  }

  async updateMetric(
    userId: string,
    id: string,
    input: UpdateMetricInput,
    ctx: RequestContext = {},
  ): Promise<HealthMetric> {
    const existing = await this.requireOwned(userId, id);

    const type = input.type ?? existing.type;
    const meta = HEALTH_METRIC_META[type];
    const metric = await this.repository.update(id, {
      type,
      unit: meta.unit,
      value: input.value,
      valueSecondary:
        input.valueSecondary === undefined ? existing.valueSecondary : input.valueSecondary,
      recordedAt: input.recordedAt ? new Date(input.recordedAt) : undefined,
      notes: input.notes === undefined ? existing.notes : input.notes,
    });

    await this.audit?.recordAudit({
      userId,
      action: 'DATA.METRIC_UPDATE',
      entity: 'HealthMetric',
      entityId: id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return serializeHealthMetric(metric);
  }

  async deleteMetric(userId: string, id: string, ctx: RequestContext = {}): Promise<void> {
    await this.requireOwned(userId, id);
    await this.repository.delete(id);

    await this.audit?.recordAudit({
      userId,
      action: 'DATA.METRIC_DELETE',
      entity: 'HealthMetric',
      entityId: id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  }

  private async requireOwned(userId: string, id: string): Promise<HealthMetricEntity> {
    const metric = await this.repository.findById(id);
    if (!metric || metric.userId !== userId) {
      throw AppError.notFound('Health metric not found.');
    }
    return metric;
  }
}

export function serializeHealthMetric(metric: HealthMetricEntity): HealthMetric {
  return {
    id: metric.id,
    type: metric.type,
    value: metric.value,
    valueSecondary: metric.valueSecondary,
    unit: metric.unit,
    recordedAt: metric.recordedAt.toISOString(),
    notes: metric.notes,
    createdAt: metric.createdAt.toISOString(),
    updatedAt: metric.updatedAt.toISOString(),
  };
}
