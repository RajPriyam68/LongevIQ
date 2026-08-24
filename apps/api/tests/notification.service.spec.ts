import { beforeEach, describe, expect, it } from 'vitest';
import { NotificationService } from '../src/modules/notifications/notification.service.js';
import type { NotificationRepository } from '../src/modules/notifications/notification.repository.types.js';
import type { MedicationRepository } from '../src/modules/medications/medication.repository.types.js';
import type { ReportsRepository } from '../src/modules/reports/reports.repository.types.js';
import type { MetricsRepository } from '../src/modules/metrics/metrics.repository.types.js';
import type { CareRepository } from '../src/modules/care/care.repository.types.js';
import {
  FakeCareRepository,
  FakeMedicationRepository,
  FakeMetricsRepository,
  FakeNotificationRepository,
  FakeReportsRepository,
} from './fakes.js';

const OWNER = 'usr_owner';
const OTHER = 'usr_other';

function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function futureTime(): string {
  const now = new Date();
  return `${String(now.getUTCHours() + 24).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(
    2,
    '0',
  )}`;
}

describe('NotificationService', () => {
  let notificationRepository: FakeNotificationRepository;
  let medicationRepository: FakeMedicationRepository;
  let reportsRepository: FakeReportsRepository;
  let metricsRepository: FakeMetricsRepository;
  let careRepository: FakeCareRepository;
  let service: NotificationService;

  beforeEach(() => {
    notificationRepository = new FakeNotificationRepository();
    medicationRepository = new FakeMedicationRepository();
    reportsRepository = new FakeReportsRepository();
    metricsRepository = new FakeMetricsRepository();
    careRepository = new FakeCareRepository();

    service = new NotificationService({
      notificationRepository: notificationRepository as unknown as NotificationRepository,
      medicationRepository: medicationRepository as unknown as MedicationRepository,
      reportsRepository: reportsRepository as unknown as ReportsRepository,
      metricsRepository: metricsRepository as unknown as MetricsRepository,
      careRepository: careRepository as unknown as CareRepository,
    });
  });

  async function seedMedication(reminderTimes: string[]) {
    return medicationRepository.create({
      userId: OWNER,
      name: 'Metformin',
      dosage: '500mg',
      form: 'PILL',
      reminderTimes,
      instructions: null,
      notes: null,
      startDate: new Date(),
      endDate: null,
      active: true,
    });
  }

  async function seedParsedReport(title = 'Blood work') {
    return reportsRepository.create({
      userId: OWNER,
      title,
      reportDate: new Date(),
      category: 'LAB',
      status: 'PARSED',
      fileName: 'a.pdf',
      fileSizeBytes: 10,
      mimeType: 'application/pdf',
      storageKey: 'key_parsed',
    });
  }

  async function seedFailedReport(title = 'Broken scan') {
    return reportsRepository.create({
      userId: OWNER,
      title,
      reportDate: new Date(),
      category: 'IMAGING',
      status: 'FAILED',
      fileName: 'b.pdf',
      fileSizeBytes: 10,
      mimeType: 'application/pdf',
      storageKey: 'key_failed',
    });
  }

  describe('materialization', () => {
    it('creates a MEDICATION_DUE notification for a missed past dose', async () => {
      await seedMedication(['00:00']);

      const result = await service.list(OWNER, { page: 1, limit: 20 });

      const due = result.items.find((n) => n.type === 'MEDICATION_DUE');
      expect(due).toBeDefined();
      expect(due!.severity).toBe('WARNING');
      expect(due!.body).toContain('Metformin');
      expect(due!.metadata).toMatchObject({ medicationId: expect.any(String), time: '00:00' });
    });

    it('does not create a MEDICATION_DUE notification when the dose was taken', async () => {
      const medication = await seedMedication(['00:00']);
      await medicationRepository.upsertAdherence({
        medicationId: medication.id,
        time: '00:00',
        date: startOfUtcDay(new Date()),
        status: 'TAKEN',
        takenAt: new Date(),
      });

      const result = await service.list(OWNER, { page: 1, limit: 20 });

      expect(result.items.filter((n) => n.type === 'MEDICATION_DUE')).toHaveLength(0);
    });

    it('does not create a MEDICATION_DUE notification for a future dose time', async () => {
      await seedMedication([futureTime()]);

      const result = await service.list(OWNER, { page: 1, limit: 20 });

      expect(result.items.filter((n) => n.type === 'MEDICATION_DUE')).toHaveLength(0);
    });

    it('materializes REPORT_PROCESSED and REPORT_FAILED notifications', async () => {
      await seedParsedReport();
      await seedFailedReport();

      const result = await service.list(OWNER, { page: 1, limit: 20 });

      const processed = result.items.find((n) => n.type === 'REPORT_PROCESSED');
      const failed = result.items.find((n) => n.type === 'REPORT_FAILED');
      expect(processed).toBeDefined();
      expect(processed!.severity).toBe('SUCCESS');
      expect(failed).toBeDefined();
      expect(failed!.severity).toBe('CRITICAL');
    });

    it('creates a METRIC_ALERT for an out-of-range latest reading and none for in-range', async () => {
      await metricsRepository.create({
        userId: OWNER,
        type: 'HEART_RATE',
        value: 150,
        unit: 'bpm',
        recordedAt: new Date(),
      });
      await metricsRepository.create({
        userId: OWNER,
        type: 'BODY_TEMPERATURE',
        value: 36.8,
        unit: '°C',
        recordedAt: new Date(),
      });

      const result = await service.list(OWNER, { page: 1, limit: 20 });

      const alerts = result.items.filter((n) => n.type === 'METRIC_ALERT');
      expect(alerts).toHaveLength(1);
      expect(alerts[0]!.metadata).toMatchObject({ type: 'HEART_RATE', status: 'high' });
    });

    it('creates a CARE_CONNECTION notification for an active connection', async () => {
      careRepository.users.set('doc_1', {
        id: 'doc_1',
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
      });
      await careRepository.createConnection('doc_1', OWNER);

      const result = await service.list(OWNER, { page: 1, limit: 20 });

      const connection = result.items.find((n) => n.type === 'CARE_CONNECTION');
      expect(connection).toBeDefined();
      expect(connection!.severity).toBe('INFO');
      expect(connection!.body).toContain('Ada');
    });

    it('never leaks another users notifications into the list', async () => {
      await seedParsedReport();
      await notificationRepository.upsert({
        userId: OTHER,
        type: 'REPORT_PROCESSED',
        severity: 'SUCCESS',
        title: 'Other report',
        body: 'Other body',
        dedupKey: 'report-parsed:other-report',
      });

      const result = await service.list(OWNER, { page: 1, limit: 20 });

      expect(result.items.every((n) => n.body !== 'Other body')).toBe(true);
    });
  });

  describe('idempotency', () => {
    it('does not duplicate notifications across refreshes', async () => {
      await seedMedication(['00:00']);
      await seedParsedReport();

      await service.list(OWNER, { page: 1, limit: 20 });
      await service.list(OWNER, { page: 1, limit: 20 });
      await service.unreadCount(OWNER);

      expect(notificationRepository.notifications.size).toBe(2);
    });
  });

  describe('read-state resolution', () => {
    it('marks a MEDICATION_DUE notification read once the dose is taken', async () => {
      const medication = await seedMedication(['00:00']);

      await service.list(OWNER, { page: 1, limit: 20 });
      expect((await service.unreadCount(OWNER)).unread).toBe(1);

      await medicationRepository.upsertAdherence({
        medicationId: medication.id,
        time: '00:00',
        date: startOfUtcDay(new Date()),
        status: 'TAKEN',
        takenAt: new Date(),
      });

      const result = await service.list(OWNER, { page: 1, limit: 20 });
      const due = result.items.find((n) => n.type === 'MEDICATION_DUE');
      expect(due).toBeDefined();
      expect(due!.readAt).not.toBeNull();
      expect((await service.unreadCount(OWNER)).unread).toBe(0);
    });

    it('marks a stale previous-day MEDICATION_DUE notification read', async () => {
      const medication = await seedMedication(['00:00']);
      await notificationRepository.upsert({
        userId: OWNER,
        type: 'MEDICATION_DUE',
        severity: 'WARNING',
        title: 'Medication due',
        body: 'Old due',
        dedupKey: `medication-due:${medication.id}:2000-01-01:00:00`,
      });

      await service.list(OWNER, { page: 1, limit: 20 });

      const rows = [...notificationRepository.notifications.values()];
      const staleRow = rows.find(
        (row) => row.dedupKey === `medication-due:${medication.id}:2000-01-01:00:00`,
      );
      expect(staleRow).toBeDefined();
      expect(staleRow!.readAt).not.toBeNull();
    });

    it('marks a METRIC_ALERT read when the reading returns to range', async () => {
      const older = new Date(Date.now() - 60_000);
      const newer = new Date();
      await metricsRepository.create({
        userId: OWNER,
        type: 'HEART_RATE',
        value: 150,
        unit: 'bpm',
        recordedAt: older,
      });

      await service.list(OWNER, { page: 1, limit: 20 });
      expect((await service.unreadCount(OWNER)).unread).toBe(1);

      await metricsRepository.create({
        userId: OWNER,
        type: 'HEART_RATE',
        value: 80,
        unit: 'bpm',
        recordedAt: newer,
      });

      const result = await service.list(OWNER, { page: 1, limit: 20 });
      const alert = result.items.find((n) => n.type === 'METRIC_ALERT');
      expect(alert).toBeDefined();
      expect(alert!.readAt).not.toBeNull();
      expect((await service.unreadCount(OWNER)).unread).toBe(0);
    });

    it('never resurrects a read or dismissed notification when data still triggers it', async () => {
      await seedMedication(['00:00']);
      const result = await service.list(OWNER, { page: 1, limit: 20 });
      const due = result.items.find((n) => n.type === 'MEDICATION_DUE')!;

      await service.markRead(OWNER, due.id);
      const again = await service.list(OWNER, { page: 1, limit: 20 });
      const stillThere = again.items.find((n) => n.type === 'MEDICATION_DUE');

      expect(stillThere).toBeDefined();
      expect(stillThere!.readAt).not.toBeNull();
    });
  });

  describe('actions', () => {
    it('marks a single notification as read', async () => {
      await seedParsedReport();
      const result = await service.list(OWNER, { page: 1, limit: 20 });
      const item = result.items[0]!;
      expect(item.readAt).toBeNull();

      const updated = await service.markRead(OWNER, item.id);

      expect(updated.readAt).not.toBeNull();
      expect((await service.unreadCount(OWNER)).unread).toBe(0);
    });

    it('marks all notifications as read', async () => {
      await seedParsedReport();
      await seedFailedReport();
      await service.list(OWNER, { page: 1, limit: 20 });

      const result = await service.markAllRead(OWNER);

      expect(result.marked).toBe(2);
      expect((await service.unreadCount(OWNER)).unread).toBe(0);
    });

    it('deletes a notification', async () => {
      await seedParsedReport();
      const result = await service.list(OWNER, { page: 1, limit: 20 });
      const item = result.items[0]!;

      const removed = await service.remove(OWNER, item.id);

      expect(removed.deleted).toBe(true);
      const after = await service.list(OWNER, { page: 1, limit: 20 });
      expect(after.items.find((n) => n.id === item.id)).toBeUndefined();
    });

    it('returns 404 for a notification owned by another user', async () => {
      const other = await notificationRepository.upsert({
        userId: OTHER,
        type: 'REPORT_PROCESSED',
        severity: 'SUCCESS',
        title: 'Other',
        body: 'Other body',
        dedupKey: 'report-parsed:other',
      });

      await expect(service.markRead(OWNER, other.id)).rejects.toMatchObject({ statusCode: 404 });
      await expect(service.remove(OWNER, other.id)).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});
