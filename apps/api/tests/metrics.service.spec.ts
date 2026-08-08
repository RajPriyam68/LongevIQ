import { beforeEach, describe, expect, it } from 'vitest';
import { MetricsService } from '../src/modules/metrics/metrics.service.js';
import { DashboardService } from '../src/modules/dashboard/dashboard.service.js';
import type {
  AuditSink,
  MetricsRepository,
} from '../src/modules/metrics/metrics.repository.types.js';
import { FakeMetricsRepository } from './fakes.js';

const ctx = { ipAddress: '127.0.0.1', userAgent: 'vitest' };
const OWNER = 'usr_owner';
const OTHER = 'usr_other';

describe('MetricsService', () => {
  let repository: FakeMetricsRepository;
  let service: MetricsService;

  beforeEach(() => {
    repository = new FakeMetricsRepository();
    service = new MetricsService(
      repository as unknown as MetricsRepository,
      repository as unknown as AuditSink,
    );
  });

  it('creates a metric with the canonical unit for its type', async () => {
    const metric = await service.createMetric(OWNER, { type: 'WEIGHT', value: 72.5 }, ctx);

    expect(metric.id).toBeTruthy();
    expect(metric.unit).toBe('kg');
    expect(metric.valueSecondary).toBeNull();
    expect(metric.recordedAt).toBeTruthy();
    expect(typeof metric.recordedAt).toBe('string');
    expect(repository.auditCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: 'DATA.METRIC_CREATE', userId: OWNER }),
      ]),
    );
  });

  it('stores compound blood pressure values', async () => {
    const metric = await service.createMetric(
      OWNER,
      { type: 'BLOOD_PRESSURE', value: 120, valueSecondary: 80 },
      ctx,
    );
    expect(metric.unit).toBe('mmHg');
    expect(metric.valueSecondary).toBe(80);
  });

  it('lists metrics with pagination and default desc sort', async () => {
    await service.createMetric(OWNER, { type: 'WEIGHT', value: 80 }, ctx);
    await service.createMetric(OWNER, { type: 'WEIGHT', value: 79 }, ctx);
    await service.createMetric(OWNER, { type: 'HEART_RATE', value: 60 }, ctx);

    const result = await service.listMetrics(OWNER, { page: 1, limit: 2, sort: 'desc' });
    expect(result.items).toHaveLength(2);
    expect(result.pagination.total).toBe(3);
    expect(result.pagination.totalPages).toBe(2);

    const filtered = await service.listMetrics(OWNER, {
      page: 1,
      limit: 10,
      sort: 'desc',
      type: 'WEIGHT',
    });
    expect(filtered.pagination.total).toBe(2);
  });

  it('cannot read another user metric', async () => {
    const metric = await service.createMetric(OWNER, { type: 'STEPS', value: 5000 }, ctx);
    await expect(service.getMetric(OTHER, metric.id)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('updates a metric and recomputes the unit when the type changes', async () => {
    const metric = await service.createMetric(OWNER, { type: 'WEIGHT', value: 80 }, ctx);
    const updated = await service.updateMetric(OWNER, metric.id, { value: 78.5 }, ctx);
    expect(updated.value).toBe(78.5);

    const converted = await service.updateMetric(OWNER, metric.id, { type: 'BMI', value: 24 }, ctx);
    expect(converted.unit).toBe('kg/m²');
    expect(repository.auditCalls.some((a) => a.action === 'DATA.METRIC_UPDATE')).toBe(true);
  });

  it('cannot update another user metric', async () => {
    const metric = await service.createMetric(OWNER, { type: 'STEPS', value: 5000 }, ctx);
    await expect(service.updateMetric(OTHER, metric.id, { value: 1 }, ctx)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('deletes a metric and records an audit', async () => {
    const metric = await service.createMetric(OWNER, { type: 'STEPS', value: 5000 }, ctx);
    await service.deleteMetric(OWNER, metric.id, ctx);
    await expect(service.getMetric(OWNER, metric.id)).rejects.toMatchObject({ statusCode: 404 });
    expect(repository.auditCalls.some((a) => a.action === 'DATA.METRIC_DELETE')).toBe(true);
  });
});

describe('DashboardService', () => {
  let repository: FakeMetricsRepository;
  let service: DashboardService;

  beforeEach(() => {
    repository = new FakeMetricsRepository();
    service = new DashboardService(repository as unknown as MetricsRepository);
  });

  it('returns latest, previous, delta and counts per type', async () => {
    await repository.create({
      userId: OWNER,
      type: 'WEIGHT',
      value: 82,
      unit: 'kg',
      recordedAt: new Date('2026-08-01T08:00:00.000Z'),
    });
    await repository.create({
      userId: OWNER,
      type: 'WEIGHT',
      value: 81,
      unit: 'kg',
      recordedAt: new Date('2026-08-02T08:00:00.000Z'),
    });
    await repository.create({
      userId: OWNER,
      type: 'HEART_RATE',
      value: 72,
      unit: 'bpm',
      recordedAt: new Date('2026-08-02T09:00:00.000Z'),
    });

    const overview = await service.overview(OWNER);

    const weight = overview.summary.find((s) => s.type === 'WEIGHT')!;
    expect(weight.count).toBe(2);
    expect(weight.latest!.value).toBe(81);
    expect(weight.previous!.value).toBe(82);
    expect(weight.delta).toBe(-1);

    const heartRate = overview.summary.find((s) => s.type === 'HEART_RATE')!;
    expect(heartRate.count).toBe(1);
    expect(heartRate.delta).toBeNull();

    expect(overview.recent).toHaveLength(3);
  });
});
