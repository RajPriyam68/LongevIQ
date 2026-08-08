import type {
  MedicalReport,
  ReportCategory,
  ReportListResult,
  ReportStatus,
  UpdateReportInput,
} from '@longeviq/shared';
import { apiClient, apiDelete, apiGet, apiPatch } from '@/lib/api-client';

export interface ReportFormMetadata {
  title: string;
  reportDate: string;
  source?: string;
  category: ReportCategory;
  notes?: string;
}

export interface ListReportsParams {
  page?: number;
  limit?: number;
  sort?: 'asc' | 'desc';
  category?: ReportCategory;
  status?: ReportStatus;
}

export function apiCreateReport(
  file: File,
  metadata: ReportFormMetadata,
): Promise<{ report: MedicalReport }> {
  const form = new FormData();
  form.append('file', file);
  form.append('title', metadata.title);
  form.append('reportDate', metadata.reportDate);
  form.append('category', metadata.category);
  if (metadata.source) form.append('source', metadata.source);
  if (metadata.notes) form.append('notes', metadata.notes);
  return apiClient
    .post<{ success: true; data: { report: MedicalReport } }>('/reports', form)
    .then((response) => response.data.data);
}

export function apiListReports(params: ListReportsParams = {}): Promise<ReportListResult> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.sort) query.set('sort', params.sort);
  if (params.category) query.set('category', params.category);
  if (params.status) query.set('status', params.status);
  const suffix = query.toString();
  return apiGet<ReportListResult>(`/reports${suffix ? `?${suffix}` : ''}`);
}

export function apiGetReport(id: string): Promise<{ report: MedicalReport }> {
  return apiGet<{ report: MedicalReport }>(`/reports/${id}`);
}

export function apiUpdateReport(
  id: string,
  input: UpdateReportInput,
): Promise<{ report: MedicalReport }> {
  return apiPatch<{ report: MedicalReport }>(`/reports/${id}`, input);
}

export function apiDeleteReport(id: string): Promise<{ deleted: boolean }> {
  return apiDelete<{ deleted: boolean }>(`/reports/${id}`);
}

export async function apiDownloadReport(id: string): Promise<Blob> {
  const response = await apiClient.get<Blob>(`/reports/${id}/file`, { responseType: 'blob' });
  return response.data;
}
