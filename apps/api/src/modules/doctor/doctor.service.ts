import type {
  AnalyticsInsights,
  AnalyticsSummary,
  DoctorConnection,
  DoctorReportListResult,
  HealthScoreResult,
  ListMetricsQuery,
  ListReportsQuery,
  RedeemConnectionInput,
} from '@longeviq/shared';
import { AppError } from '../../utils/app-error.js';
import type { AuthRepository } from '../auth/auth.repository.types.js';
import type { AuditSink } from '../metrics/metrics.repository.types.js';
import type { DashboardService } from '../dashboard/dashboard.service.js';
import type { MetricsService } from '../metrics/metrics.service.js';
import type { ReportsService } from '../reports/reports.service.js';
import type { AnalyticsService } from '../analytics/analytics.service.js';
import type { CareRepository } from '../care/care.repository.types.js';
import { hashCode } from '../care/care.service.js';

export interface RequestContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

interface PatientRef {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export class DoctorService {
  constructor(
    private readonly repository: CareRepository,
    private readonly authRepository: AuthRepository,
    private readonly dashboardService: DashboardService,
    private readonly metricsService: MetricsService,
    private readonly reportsService: ReportsService,
    private readonly analyticsService: AnalyticsService,
    private readonly audit?: AuditSink,
  ) {}

  async redeem(
    doctorId: string,
    input: RedeemConnectionInput,
    ctx: RequestContext = {},
  ): Promise<{ connection: DoctorConnection }> {
    const code = input.code.trim().toUpperCase();
    const grant = await this.repository.findGrantByCodeHash(hashCode(code));
    if (!grant || grant.usedAt !== null || grant.expiresAt.getTime() <= Date.now()) {
      throw AppError.conflict('Invalid or expired share code.');
    }

    const patient = await this.authRepository.findById(grant.patientId);
    if (!patient) {
      throw AppError.conflict('Invalid or expired share code.');
    }

    await this.repository.consumeGrant(grant.id);

    const existing = await this.repository.findActiveConnection(doctorId, grant.patientId);
    const connection =
      existing ?? (await this.repository.createConnection(doctorId, grant.patientId));

    await this.audit?.recordAudit({
      userId: doctorId,
      action: 'DATA.CARE_CONNECTION_ACCEPT',
      entity: 'DoctorPatient',
      entityId: connection.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { patientId: grant.patientId },
    });

    return {
      connection: {
        id: connection.id,
        patient: toPatientRef(patient),
        connectedAt: connection.connectedAt.toISOString(),
      },
    };
  }

  async listConnections(doctorId: string): Promise<{ connections: DoctorConnection[] }> {
    const rows = await this.repository.listActiveConnectionsByDoctor(doctorId);
    return {
      connections: rows
        .filter((row) => row.patient)
        .map((row) => ({
          id: row.id,
          patient: {
            id: row.patient!.id,
            firstName: row.patient!.firstName,
            lastName: row.patient!.lastName,
            email: row.patient!.email,
          },
          connectedAt: row.connectedAt.toISOString(),
        })),
    };
  }

  async disconnect(
    doctorId: string,
    patientId: string,
    ctx: RequestContext = {},
  ): Promise<{ disconnected: boolean }> {
    const connection = await this.repository.findActiveConnection(doctorId, patientId);
    if (!connection) {
      throw AppError.notFound('Connection not found.');
    }

    await this.repository.revokeConnection(connection.id, doctorId);

    await this.audit?.recordAudit({
      userId: doctorId,
      action: 'DATA.CARE_CONNECTION_DISCONNECT',
      entity: 'DoctorPatient',
      entityId: connection.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { patientId },
    });

    return { disconnected: true };
  }

  async getPatientOverview(
    doctorId: string,
    patientId: string,
  ): Promise<{ overview: Awaited<ReturnType<DashboardService['overview']>> }> {
    await this.requireActiveConnection(doctorId, patientId);
    const overview = await this.dashboardService.overview(patientId);
    return { overview };
  }

  async getPatientMetrics(
    doctorId: string,
    patientId: string,
    query: ListMetricsQuery,
  ): Promise<{ metrics: Awaited<ReturnType<MetricsService['listMetrics']>> }> {
    await this.requireActiveConnection(doctorId, patientId);
    const metrics = await this.metricsService.listMetrics(patientId, query);
    return { metrics };
  }

  async getPatientReports(
    doctorId: string,
    patientId: string,
    query: ListReportsQuery,
  ): Promise<{ reports: DoctorReportListResult }> {
    await this.requireActiveConnection(doctorId, patientId);
    const { items, pagination } = await this.reportsService.listReports(patientId, query);

    const details = await Promise.all(
      items.map(async (report) => {
        const detail = await this.reportsService.getReport(patientId, report.id);
        return {
          ...report,
          findings: detail.findings,
        };
      }),
    );

    return { reports: { items: details, pagination } };
  }

  async getPatientAnalytics(
    doctorId: string,
    patientId: string,
    days: number,
  ): Promise<{
    analytics: {
      summary: AnalyticsSummary;
      score: HealthScoreResult;
      insights: AnalyticsInsights;
    };
  }> {
    await this.requireActiveConnection(doctorId, patientId);
    const [summary, score, insights] = await Promise.all([
      this.analyticsService.summary(patientId, days),
      this.analyticsService.score(patientId),
      this.analyticsService.insights(patientId, days),
    ]);
    return { analytics: { summary, score, insights } };
  }

  private async requireActiveConnection(doctorId: string, patientId: string): Promise<void> {
    const connection = await this.repository.findActiveConnection(doctorId, patientId);
    if (!connection) {
      throw AppError.notFound('Patient not found.');
    }
  }
}

function toPatientRef(patient: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}): PatientRef {
  return {
    id: patient.id,
    firstName: patient.firstName,
    lastName: patient.lastName,
    email: patient.email,
  };
}
