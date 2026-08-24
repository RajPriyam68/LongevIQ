import type {
  AppNotification,
  ListNotificationsQuery,
  NotificationListResult,
  NotificationUnreadCount,
  NotificationType,
} from '@longeviq/shared';
import {
  HEALTH_METRIC_META,
  MedicationAdherenceStatus,
  metricStatusForValue,
  NotificationSeverity,
  recommendedRangeFor,
} from '@longeviq/shared';
import { AppError } from '../../utils/app-error.js';
import type { CareRepository } from '../care/care.repository.types.js';
import type { MedicationRepository } from '../medications/medication.repository.types.js';
import type { MetricsRepository } from '../metrics/metrics.repository.types.js';
import type { ReportsRepository } from '../reports/reports.repository.types.js';
import type {
  ListNotificationsFilter,
  NotificationRecord,
  NotificationRepository,
} from './notification.repository.types.js';

const RECENT_REPORTS_LIMIT = 50;

function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function hhmm(value: Date): string {
  return `${String(value.getUTCHours()).padStart(2, '0')}:${String(value.getUTCMinutes()).padStart(
    2,
    '0',
  )}`;
}

export interface NotificationServiceDeps {
  notificationRepository: NotificationRepository;
  medicationRepository: MedicationRepository;
  reportsRepository: ReportsRepository;
  metricsRepository: MetricsRepository;
  careRepository: CareRepository;
}

export class NotificationService {
  private readonly repository: NotificationRepository;
  private readonly medicationRepository: MedicationRepository;
  private readonly reportsRepository: ReportsRepository;
  private readonly metricsRepository: MetricsRepository;
  private readonly careRepository: CareRepository;

  constructor(deps: NotificationServiceDeps) {
    this.repository = deps.notificationRepository;
    this.medicationRepository = deps.medicationRepository;
    this.reportsRepository = deps.reportsRepository;
    this.metricsRepository = deps.metricsRepository;
    this.careRepository = deps.careRepository;
  }

  async list(userId: string, query: ListNotificationsQuery): Promise<NotificationListResult> {
    await this.refresh(userId);

    const filter: ListNotificationsFilter = {
      page: query.page,
      limit: query.limit,
      read: query.read === undefined ? undefined : query.read === 'true',
      type: query.type,
    };

    const { items, total } = await this.repository.listByUser(userId, filter);
    return {
      items: items.map(toAppNotification),
      pagination: {
        page: filter.page,
        limit: filter.limit,
        total,
        totalPages: Math.ceil(total / filter.limit),
      },
    };
  }

  async unreadCount(userId: string): Promise<NotificationUnreadCount> {
    await this.refresh(userId);
    return { unread: await this.repository.countUnreadByUser(userId) };
  }

  async markRead(userId: string, notificationId: string): Promise<AppNotification> {
    const notification = await this.requireOwnedNotification(userId, notificationId);
    const updated = await this.repository.markRead(notification.id);
    return toAppNotification(updated);
  }

  async markAllRead(userId: string): Promise<{ marked: number }> {
    return { marked: await this.repository.markAllRead(userId) };
  }

  async remove(userId: string, notificationId: string): Promise<{ deleted: boolean }> {
    const notification = await this.requireOwnedNotification(userId, notificationId);
    await this.repository.delete(notification.id);
    return { deleted: true };
  }

  private async requireOwnedNotification(
    userId: string,
    notificationId: string,
  ): Promise<NotificationRecord> {
    const notification = await this.repository.findById(notificationId);
    if (!notification || notification.userId !== userId) {
      throw new AppError(404, 'NOT_FOUND', 'Notification not found.');
    }
    return notification;
  }

  private async refresh(userId: string): Promise<void> {
    const now = new Date();
    const today = startOfUtcDay(now);
    const dateKey = today.toISOString().slice(0, 10);

    await Promise.all([
      this.refreshMedicationDue(userId, now, today, dateKey),
      this.refreshReportStatus(userId),
      this.refreshMetricAlerts(userId),
      this.refreshCareConnections(userId),
    ]);
  }

  private async refreshMedicationDue(
    userId: string,
    now: Date,
    today: Date,
    dateKey: string,
  ): Promise<void> {
    const [medications, adherenceRows] = await Promise.all([
      this.medicationRepository.listScheduledForDate(userId, today),
      this.medicationRepository.listAdherenceForDate(userId, today),
    ]);

    const takenByKey = new Set(
      adherenceRows
        .filter((row) => row.status === MedicationAdherenceStatus.TAKEN)
        .map((row) => `${row.medicationId}:${row.time}`),
    );

    const currentTime = hhmm(now);
    const desiredKeys: string[] = [];

    for (const medication of medications) {
      for (const time of medication.reminderTimes) {
        if (time > currentTime) continue;
        if (takenByKey.has(`${medication.id}:${time}`)) continue;

        const dedupKey = `medication-due:${medication.id}:${dateKey}:${time}`;
        desiredKeys.push(dedupKey);
        await this.repository.upsert({
          userId,
          type: 'MEDICATION_DUE',
          severity: NotificationSeverity.WARNING,
          title: 'Medication due',
          body: `${medication.name} (${medication.dosage}) is due at ${time}.`,
          dedupKey,
          metadata: { medicationId: medication.id, time, date: dateKey },
        });
      }
    }

    await this.resolveReadState(userId, 'MEDICATION_DUE', desiredKeys);
  }

  private async refreshReportStatus(userId: string): Promise<void> {
    const [parsed, failed] = await Promise.all([
      this.reportsRepository.listByUser(userId, {
        status: 'PARSED',
        page: 1,
        limit: RECENT_REPORTS_LIMIT,
        sort: 'desc',
      }),
      this.reportsRepository.listByUser(userId, {
        status: 'FAILED',
        page: 1,
        limit: RECENT_REPORTS_LIMIT,
        sort: 'desc',
      }),
    ]);

    const upserts = [
      ...parsed.items.map((report) =>
        this.repository.upsert({
          userId,
          type: 'REPORT_PROCESSED',
          severity: NotificationSeverity.SUCCESS,
          title: 'Report processed',
          body: `"${report.title}" was processed successfully.`,
          dedupKey: `report-parsed:${report.id}`,
          metadata: { reportId: report.id, category: report.category },
        }),
      ),
      ...failed.items.map((report) =>
        this.repository.upsert({
          userId,
          type: 'REPORT_FAILED',
          severity: NotificationSeverity.CRITICAL,
          title: 'Report processing failed',
          body: `"${report.title}" could not be processed. Please review and re-upload it.`,
          dedupKey: `report-failed:${report.id}`,
          metadata: { reportId: report.id, category: report.category },
        }),
      ),
    ];

    await Promise.all(upserts);
  }

  private async refreshMetricAlerts(userId: string): Promise<void> {
    const latest = await this.metricsRepository.latestPerType(
      userId,
      Object.keys(HEALTH_METRIC_META) as Array<keyof typeof HEALTH_METRIC_META>,
    );

    const desiredKeys: string[] = [];

    for (const metric of latest) {
      const status = metricStatusForValue(metric.type, metric.value);
      if (status === 'normal' || status === 'unknown') continue;

      const range = recommendedRangeFor(metric.type);
      if (!range) continue;

      const meta = HEALTH_METRIC_META[metric.type];
      const rangeLabel =
        range.max === null
          ? `${range.min}+ ${range.unit}`
          : `${range.min}-${range.max} ${range.unit}`;

      const dedupKey = `metric-alert:${metric.type}`;
      desiredKeys.push(dedupKey);
      await this.repository.upsert({
        userId,
        type: 'METRIC_ALERT',
        severity: NotificationSeverity.WARNING,
        title: `${meta.label} outside recommended range`,
        body: `Your latest ${meta.label} reading is ${metric.value} ${metric.unit} (recommended ${rangeLabel}).`,
        dedupKey,
        metadata: { type: metric.type, value: metric.value, status },
      });
    }

    await this.resolveReadState(userId, 'METRIC_ALERT', desiredKeys);
  }

  private async refreshCareConnections(userId: string): Promise<void> {
    const connections = await this.careRepository.listConnectionsByPatient(userId);

    await Promise.all(
      connections.map((connection) => {
        const doctor = connection.doctor;
        const doctorLabel = doctor ? `${doctor.firstName} ${doctor.lastName}` : 'your doctor';

        return this.repository.upsert({
          userId,
          type: 'CARE_CONNECTION',
          severity: NotificationSeverity.INFO,
          title: 'Doctor connected',
          body: `${doctorLabel} can now view your health data and care plan.`,
          dedupKey: `care-connection:${connection.id}`,
          metadata: { connectionId: connection.id, doctorId: doctor?.id ?? null },
        });
      }),
    );
  }

  private async resolveReadState(
    userId: string,
    type: NotificationType,
    desiredKeys: string[],
  ): Promise<void> {
    const existing = await this.repository.listDedupKeysByType(userId, type);
    const desired = new Set(desiredKeys);
    const stale = existing.filter((key) => !desired.has(key));
    if (stale.length > 0) {
      await this.repository.markReadByDedupKeys(userId, stale);
    }
  }
}

function toAppNotification(row: NotificationRecord): AppNotification {
  return {
    id: row.id,
    type: row.type,
    severity: row.severity,
    title: row.title,
    body: row.body,
    metadata: row.metadata ?? null,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
