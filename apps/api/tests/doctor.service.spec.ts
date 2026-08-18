import { beforeEach, describe, expect, it } from 'vitest';
import type { CareGrantRecord } from '../src/modules/care/care.repository.types.js';
import { hashCode } from '../src/modules/care/care.service.js';
import { AnalyticsService } from '../src/modules/analytics/analytics.service.js';
import { DashboardService } from '../src/modules/dashboard/dashboard.service.js';
import { DoctorService } from '../src/modules/doctor/doctor.service.js';
import { MetricsService } from '../src/modules/metrics/metrics.service.js';
import { ReportsService } from '../src/modules/reports/reports.service.js';
import type { AuditSink } from '../src/modules/metrics/metrics.repository.types.js';
import {
  FakeAuthRepository,
  FakeCareRepository,
  FakeMetricsRepository,
  FakeReportProcessor,
  FakeReportsRepository,
  FakeReportStorage,
} from './fakes.js';

const DOCTOR = 'usr_doctor';
const OTHER_DOCTOR = 'usr_doctor2';
const CODE = 'LV-ABCD-WXYZ-2345';

describe('DoctorService', () => {
  let careRepository: FakeCareRepository;
  let authRepository: FakeAuthRepository;
  let metricsRepository: FakeMetricsRepository;
  let reportsRepository: FakeReportsRepository;
  let service: DoctorService;
  let auditEvents: Array<{ action: string; userId?: string | null }>;
  let patientId = '';

  beforeEach(async () => {
    careRepository = new FakeCareRepository();
    authRepository = new FakeAuthRepository();
    metricsRepository = new FakeMetricsRepository();
    reportsRepository = new FakeReportsRepository();
    auditEvents = [];

    const auditSink: AuditSink = {
      recordAudit: (input) => {
        auditEvents.push({ action: input.action, userId: input.userId });
        return Promise.resolve();
      },
    };

    const reportsService = new ReportsService(
      reportsRepository,
      new FakeReportStorage(),
      new FakeReportProcessor(),
      auditSink,
    );

    service = new DoctorService(
      careRepository,
      authRepository,
      new DashboardService(metricsRepository),
      new MetricsService(metricsRepository, auditSink),
      reportsService,
      new AnalyticsService(metricsRepository),
      auditSink,
    );

    const patient = await authRepository.createUser({
      email: 'patient@example.com',
      passwordHash: 'hash',
      firstName: 'Pat',
      lastName: 'Ient',
      role: 'USER',
      emailVerified: true,
    });
    patientId = patient.id;
    careRepository.users.set(patientId, {
      id: patientId,
      firstName: 'Pat',
      lastName: 'Ient',
      email: 'patient@example.com',
    });
    await authRepository.createUser({
      email: 'doctor@example.com',
      passwordHash: 'hash',
      firstName: 'Sarah',
      lastName: 'Chen',
      role: 'DOCTOR',
      emailVerified: true,
    });
  });

  function seedGrant(
    patientId: string,
    code = CODE,
    opts: { expired?: boolean; used?: boolean } = {},
  ): CareGrantRecord {
    const grant: CareGrantRecord = {
      id: `grt_${careRepository.grants.size + 1}`,
      patientId,
      codeHash: hashCode(code),
      expiresAt: opts.expired
        ? new Date(Date.now() - 60_000)
        : new Date(Date.now() + 24 * 60 * 60 * 1000),
      usedAt: opts.used ? new Date() : null,
      createdAt: new Date(),
    };
    careRepository.grants.set(grant.id, grant);
    return grant;
  }

  describe('redeem', () => {
    it('redeems a valid code, consumes the grant, and creates a connection', async () => {
      seedGrant(patientId);

      const { connection } = await service.redeem(DOCTOR, { code: CODE });

      expect(connection.patient.id).toBe(patientId);
      expect(connection.patient.email).toBe('patient@example.com');

      const grant = [...careRepository.grants.values()][0];
      expect(grant?.usedAt).not.toBeNull();
      const stored = careRepository.findActiveConnection(DOCTOR, patientId);
      await expect(stored).resolves.toMatchObject({ doctorId: DOCTOR, patientId: patientId });
      expect(auditEvents).toContainEqual({
        action: 'DATA.CARE_CONNECTION_ACCEPT',
        userId: DOCTOR,
      });
    });

    it('normalizes code case and whitespace', async () => {
      seedGrant(patientId);

      const { connection } = await service.redeem(DOCTOR, { code: `  ${CODE.toLowerCase()}  ` });

      expect(connection.patient.id).toBe(patientId);
    });

    it('rejects an unknown code', async () => {
      await expect(service.redeem(DOCTOR, { code: CODE })).rejects.toMatchObject({
        statusCode: 409,
        code: 'CONFLICT',
      });
    });

    it('rejects a code that was already used', async () => {
      seedGrant(patientId, CODE, { used: true });

      await expect(service.redeem(DOCTOR, { code: CODE })).rejects.toMatchObject({
        statusCode: 409,
        code: 'CONFLICT',
      });
    });

    it('rejects an expired code', async () => {
      seedGrant(patientId, CODE, { expired: true });

      await expect(service.redeem(DOCTOR, { code: CODE })).rejects.toMatchObject({
        statusCode: 409,
        code: 'CONFLICT',
      });
    });

    it('returns the existing connection when one is already active (no duplicate)', async () => {
      seedGrant(patientId);
      await service.redeem(DOCTOR, { code: CODE });
      const existing = await careRepository.findActiveConnection(DOCTOR, patientId);
      const connectionCountBefore = careRepository.connections.size;

      seedGrant(patientId, 'LV-ZZZZ-ZZZZ-ZZZZ');
      const { connection } = await service.redeem(DOCTOR, { code: 'LV-ZZZZ-ZZZZ-ZZZZ' });

      expect(connection.id).toBe(existing?.id);
      expect(careRepository.connections.size).toBe(connectionCountBefore);
    });
  });

  describe('listConnections', () => {
    it('lists active patients for a doctor', async () => {
      seedGrant(patientId);
      await service.redeem(DOCTOR, { code: CODE });

      const { connections } = await service.listConnections(DOCTOR);

      expect(connections).toHaveLength(1);
      expect(connections[0]?.patient).toEqual({
        id: patientId,
        firstName: 'Pat',
        lastName: 'Ient',
        email: 'patient@example.com',
      });
    });

    it('does not list revoked connections', async () => {
      const { id } = await careRepository.createConnection(DOCTOR, patientId);
      await careRepository.revokeConnection(id, DOCTOR);

      const { connections } = await service.listConnections(DOCTOR);

      expect(connections).toEqual([]);
    });
  });

  describe('disconnect', () => {
    it('disconnects an active connection', async () => {
      const { id } = await careRepository.createConnection(DOCTOR, patientId);

      const result = await service.disconnect(DOCTOR, patientId);

      expect(result.disconnected).toBe(true);
      const stored = careRepository.connections.get(id);
      expect(stored?.revokedAt).not.toBeNull();
      expect(stored?.revokedById).toBe(DOCTOR);
      expect(auditEvents).toContainEqual({
        action: 'DATA.CARE_CONNECTION_DISCONNECT',
        userId: DOCTOR,
      });
    });

    it('returns 404 when there is no active connection', async () => {
      await expect(service.disconnect(DOCTOR, patientId)).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    });
  });

  describe('patient views', () => {
    it('returns patient overview for a connected doctor', async () => {
      await careRepository.createConnection(DOCTOR, patientId);
      await metricsRepository.create({
        userId: patientId,
        type: 'SLEEP_HOURS',
        value: 8,
        unit: 'hours',
        recordedAt: new Date(),
      });

      const { overview } = await service.getPatientOverview(DOCTOR, patientId);

      const sleep = overview.summary.find((row) => row.type === 'SLEEP_HOURS');
      expect(sleep?.count).toBe(1);
      expect(sleep?.latest?.value).toBe(8);
    });

    it('returns patient metrics for a connected doctor', async () => {
      await careRepository.createConnection(DOCTOR, patientId);
      await metricsRepository.create({
        userId: patientId,
        type: 'HEART_RATE',
        value: 70,
        unit: 'bpm',
        recordedAt: new Date(),
      });

      const { metrics } = await service.getPatientMetrics(DOCTOR, patientId, {
        page: 1,
        limit: 20,
        sort: 'desc',
      });

      expect(metrics.items).toHaveLength(1);
      expect(metrics.items[0]?.type).toBe('HEART_RATE');
    });

    it('returns patient reports with findings for a connected doctor', async () => {
      await careRepository.createConnection(DOCTOR, patientId);
      const report = await reportsRepository.create({
        userId: patientId,
        title: 'Bloodwork',
        reportDate: new Date(),
        category: 'BLOODWORK',
        status: 'PARSED',
        fileName: 'bloodwork.pdf',
        fileSizeBytes: 100,
        mimeType: 'application/pdf',
        storageKey: 'key',
      });
      await reportsRepository.completeProcessing(report.id, {
        status: 'PARSED',
        parsedAt: new Date(),
        findings: [
          {
            id: 'fin_1',
            reportId: report.id,
            name: 'Glucose',
            value: '95',
            unit: 'mg/dL',
            referenceRange: '70-99',
            flag: 'NORMAL',
            confidence: 0.9,
            sortOrder: 0,
            createdAt: new Date(),
          },
        ],
      });

      const { reports } = await service.getPatientReports(DOCTOR, patientId, {
        page: 1,
        limit: 20,
        sort: 'desc',
      });

      expect(reports.items).toHaveLength(1);
      expect(reports.items[0]?.title).toBe('Bloodwork');
      expect(reports.items[0]?.findings[0]?.name).toBe('Glucose');
      expect(reports.items[0]).not.toHaveProperty('storageKey');
      expect(reports.items[0]).not.toHaveProperty('parsedText');
    });

    it('returns patient analytics for a connected doctor', async () => {
      await careRepository.createConnection(DOCTOR, patientId);
      await metricsRepository.create({
        userId: patientId,
        type: 'SLEEP_HOURS',
        value: 8,
        unit: 'hours',
        recordedAt: new Date(),
      });

      const { analytics } = await service.getPatientAnalytics(DOCTOR, patientId, 30);

      expect(analytics.score.overall).toBe(100);
      expect(analytics.summary.metrics.find((m) => m.type === 'SLEEP_HOURS')?.count).toBe(1);
      expect(analytics.insights.items.length).toBeGreaterThan(0);
    });

    it('returns 404 for every patient view without an active connection', async () => {
      await expect(service.getPatientOverview(DOCTOR, patientId)).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
      });
      await expect(
        service.getPatientMetrics(DOCTOR, patientId, { page: 1, limit: 20, sort: 'desc' }),
      ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
      await expect(
        service.getPatientReports(DOCTOR, patientId, { page: 1, limit: 20, sort: 'desc' }),
      ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
      await expect(service.getPatientAnalytics(DOCTOR, patientId, 30)).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    });

    it('hides patient data from a doctor with no connection (cross-user isolation)', async () => {
      await careRepository.createConnection(OTHER_DOCTOR, patientId);

      await expect(service.getPatientOverview(DOCTOR, patientId)).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    });
  });
});
