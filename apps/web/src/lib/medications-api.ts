import type {
  CreateMedicationInput,
  Medication,
  MedicationListResult,
  MedicationSchedule,
  SetDoseStatusInput,
  UpdateMedicationInput,
} from '@longeviq/shared';
import { apiClient, apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api-client';

export function apiCreateMedication(
  input: CreateMedicationInput,
): Promise<{ medication: Medication }> {
  return apiClient
    .post<{ success: true; data: { medication: Medication } }>('/medications', input)
    .then((response) => response.data.data);
}

export function apiListMedications(
  page = 1,
  limit = 50,
  active?: boolean,
): Promise<MedicationListResult> {
  const activeParam = active === undefined ? '' : `&active=${active}`;
  return apiGet<MedicationListResult>(`/medications?page=${page}&limit=${limit}${activeParam}`);
}

export function apiGetMedication(id: string): Promise<{ medication: Medication }> {
  return apiGet<{ medication: Medication }>(`/medications/${id}`);
}

export function apiUpdateMedication(
  id: string,
  input: UpdateMedicationInput,
): Promise<{ medication: Medication }> {
  return apiPatch<{ medication: Medication }>(`/medications/${id}`, input);
}

export function apiDeleteMedication(id: string): Promise<{ deleted: boolean }> {
  return apiDelete<{ deleted: boolean }>(`/medications/${id}`);
}

export function apiGetMedicationSchedule(date: string): Promise<{ schedule: MedicationSchedule }> {
  return apiGet<{ schedule: MedicationSchedule }>(`/medications/schedule?date=${date}`);
}

export function apiSetDoseStatus(
  id: string,
  input: SetDoseStatusInput,
): Promise<{ schedule: MedicationSchedule }> {
  return apiPost<{ schedule: MedicationSchedule }>(`/medications/${id}/adherence`, input);
}
