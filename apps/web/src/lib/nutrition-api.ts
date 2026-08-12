import type {
  CreateNutritionPlanInput,
  NutritionPlanDetail,
  NutritionPlanListResult,
} from '@longeviq/shared';
import { apiClient, apiDelete, apiGet } from '@/lib/api-client';

export function apiCreateNutritionPlan(
  input: CreateNutritionPlanInput,
): Promise<{ plan: NutritionPlanDetail }> {
  return apiClient
    .post<{ success: true; data: { plan: NutritionPlanDetail } }>('/nutrition/plans', input)
    .then((response) => response.data.data);
}

export function apiListNutritionPlans(page = 1, limit = 20): Promise<NutritionPlanListResult> {
  return apiGet<NutritionPlanListResult>(`/nutrition/plans?page=${page}&limit=${limit}`);
}

export function apiGetNutritionPlan(id: string): Promise<{ plan: NutritionPlanDetail }> {
  return apiGet<{ plan: NutritionPlanDetail }>(`/nutrition/plans/${id}`);
}

export function apiDeleteNutritionPlan(id: string): Promise<{ deleted: boolean }> {
  return apiDelete<{ deleted: boolean }>(`/nutrition/plans/${id}`);
}
