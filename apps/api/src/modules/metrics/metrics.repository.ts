import type { HealthMetricType, Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import type {
  CreateHealthMetricInput,
  ListHealthMetricsFilter,
  MetricsRepository,
} from './metrics.repository.types.js';

export class PrismaMetricsRepository implements MetricsRepository {
  async create(input: CreateHealthMetricInput) {
    return prisma.healthMetric.create({
      data: {
        userId: input.userId,
        type: input.type,
        value: input.value,
        valueSecondary: input.valueSecondary ?? null,
        unit: input.unit,
        recordedAt: input.recordedAt,
        notes: input.notes ?? null,
      },
    });
  }

  async findById(id: string) {
    return prisma.healthMetric.findUnique({ where: { id } });
  }

  async listByUser(userId: string, filter: ListHealthMetricsFilter) {
    const where = {
      userId,
      ...(filter.type ? { type: filter.type } : {}),
      ...(filter.from || filter.to
        ? {
            recordedAt: {
              ...(filter.from ? { gte: filter.from } : {}),
              ...(filter.to ? { lte: filter.to } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.healthMetric.findMany({
        where,
        orderBy: { recordedAt: filter.sort },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      prisma.healthMetric.count({ where }),
    ]);

    return { items, total };
  }

  async update(id: string, data: Prisma.HealthMetricUpdateInput) {
    return prisma.healthMetric.update({ where: { id }, data });
  }

  async delete(id: string) {
    await prisma.healthMetric.delete({ where: { id } });
  }

  async latestPerType(userId: string, types: HealthMetricType[]) {
    return prisma.healthMetric.findMany({
      where: { userId, type: { in: types } },
      orderBy: { recordedAt: 'desc' },
      distinct: ['type'],
    });
  }

  async previousBefore(userId: string, type: HealthMetricType, before: Date) {
    return prisma.healthMetric.findFirst({
      where: { userId, type, recordedAt: { lt: before } },
      orderBy: { recordedAt: 'desc' },
    });
  }

  async countsByType(userId: string, types: HealthMetricType[]) {
    const rows = await prisma.healthMetric.groupBy({
      by: ['type'],
      where: { userId, type: { in: types } },
      _count: { _all: true },
    });
    return rows.map((row) => ({ type: row.type, count: row._count._all }));
  }

  async recentByUser(userId: string, limit: number) {
    return prisma.healthMetric.findMany({
      where: { userId },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });
  }
}
