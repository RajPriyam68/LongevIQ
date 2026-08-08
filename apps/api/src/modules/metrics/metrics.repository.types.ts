import type { HealthMetric, HealthMetricType, Prisma } from '@prisma/client';

export interface CreateHealthMetricInput {
  userId: string;
  type: HealthMetricType;
  value: number;
  valueSecondary?: number | null;
  unit: string;
  recordedAt: Date;
  notes?: string | null;
}

export interface ListHealthMetricsFilter {
  type?: HealthMetricType;
  from?: Date;
  to?: Date;
  page: number;
  limit: number;
  sort: 'asc' | 'desc';
}

export interface MetricsRepository {
  create(input: CreateHealthMetricInput): Promise<HealthMetric>;
  findById(id: string): Promise<HealthMetric | null>;
  listByUser(
    userId: string,
    filter: ListHealthMetricsFilter,
  ): Promise<{ items: HealthMetric[]; total: number }>;
  update(id: string, data: Prisma.HealthMetricUpdateInput): Promise<HealthMetric>;
  delete(id: string): Promise<void>;
  latestPerType(userId: string, types: HealthMetricType[]): Promise<HealthMetric[]>;
  previousBefore(
    userId: string,
    type: HealthMetricType,
    before: Date,
  ): Promise<HealthMetric | null>;
  countsByType(
    userId: string,
    types: HealthMetricType[],
  ): Promise<Array<{ type: HealthMetricType; count: number }>>;
  recentByUser(userId: string, limit: number): Promise<HealthMetric[]>;
}

export interface AuditSink {
  recordAudit(input: {
    userId?: string | null;
    action: string;
    entity?: string | null;
    entityId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: unknown;
  }): Promise<void>;
}
