import type {
  AnalyticsInsights,
  AnalyticsSummary,
  DashboardOverview,
  DoctorConnection,
  DoctorReportListResult,
  HealthScoreResult,
  ListMetricsQuery,
  MetricListResult,
} from '@longeviq/shared';
import { apiDelete, apiGet, apiPost } from '@/lib/api-client';

export interface DoctorPatientAnalytics {
  analytics: {
    summary: AnalyticsSummary;
    score: HealthScoreResult;
    insights: AnalyticsInsights;
  };
}

export function apiDoctorRedeem(code: string): Promise<{ connection: DoctorConnection }> {
  return apiPost<{ connection: DoctorConnection }>('/doctor/connections', { code });
}

export function apiDoctorListConnections(): Promise<{ connections: DoctorConnection[] }> {
  return apiGet<{ connections: DoctorConnection[] }>('/doctor/connections');
}

export function apiDoctorDisconnect(patientId: string): Promise<{ disconnected: boolean }> {
  return apiDelete<{ disconnected: boolean }>(`/doctor/connections/${patientId}`);
}

export function apiDoctorPatientOverview(
  patientId: string,
): Promise<{ overview: DashboardOverview }> {
  return apiGet<{ overview: DashboardOverview }>(`/doctor/patients/${patientId}/overview`);
}

export function apiDoctorPatientMetrics(
  patientId: string,
  params: Partial<ListMetricsQuery> = {},
): Promise<{ metrics: MetricListResult }> {
  const query = new URLSearchParams();
  if (params.type) query.set('type', params.type);
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.sort) query.set('sort', params.sort);
  const suffix = query.toString();
  return apiGet<{ metrics: MetricListResult }>(
    `/doctor/patients/${patientId}/metrics${suffix ? `?${suffix}` : ''}`,
  );
}

export function apiDoctorPatientReports(
  patientId: string,
): Promise<{ reports: DoctorReportListResult }> {
  return apiGet<{ reports: DoctorReportListResult }>(`/doctor/patients/${patientId}/reports`);
}

export function apiDoctorPatientAnalytics(
  patientId: string,
  days = 30,
): Promise<DoctorPatientAnalytics> {
  return apiGet<DoctorPatientAnalytics>(`/doctor/patients/${patientId}/analytics?days=${days}`);
}
