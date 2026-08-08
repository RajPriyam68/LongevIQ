import type {
  CreateMetricInput,
  DashboardOverview,
  HealthMetric,
  HealthMetricType,
  ListMetricsQuery,
  MetricListResult,
  UpdateMetricInput,
} from '@longeviq/shared';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api-client';

export interface ListMetricsParams {
  type?: HealthMetricType;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  sort?: ListMetricsQuery['sort'];
}

export function apiCreateMetric(input: CreateMetricInput): Promise<{ metric: HealthMetric }> {
  return apiPost<{ metric: HealthMetric }>('/metrics', input);
}

export function apiListMetrics(params: ListMetricsParams = {}): Promise<MetricListResult> {
  const query = new URLSearchParams();
  if (params.type) query.set('type', params.type);
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.sort) query.set('sort', params.sort);
  const suffix = query.toString();
  return apiGet<MetricListResult>(`/metrics${suffix ? `?${suffix}` : ''}`);
}

export function apiGetMetric(id: string): Promise<{ metric: HealthMetric }> {
  return apiGet<{ metric: HealthMetric }>(`/metrics/${id}`);
}

export function apiUpdateMetric(
  id: string,
  input: UpdateMetricInput,
): Promise<{ metric: HealthMetric }> {
  return apiPatch<{ metric: HealthMetric }>(`/metrics/${id}`, input);
}

export function apiDeleteMetric(id: string): Promise<{ deleted: boolean }> {
  return apiDelete<{ deleted: boolean }>(`/metrics/${id}`);
}

export function apiGetDashboardOverview(): Promise<{ overview: DashboardOverview }> {
  return apiGet<{ overview: DashboardOverview }>('/dashboard/overview');
}
