import type {
  CreateWorkoutPlanInput,
  WorkoutPlanDetail,
  WorkoutPlanListResult,
} from '@longeviq/shared';
import { apiClient, apiDelete, apiGet } from '@/lib/api-client';

export function apiCreateWorkoutPlan(
  input: CreateWorkoutPlanInput,
): Promise<{ plan: WorkoutPlanDetail }> {
  return apiClient
    .post<{ success: true; data: { plan: WorkoutPlanDetail } }>('/workout/plans', input)
    .then((response) => response.data.data);
}

export function apiListWorkoutPlans(page = 1, limit = 20): Promise<WorkoutPlanListResult> {
  return apiGet<WorkoutPlanListResult>(`/workout/plans?page=${page}&limit=${limit}`);
}

export function apiGetWorkoutPlan(id: string): Promise<{ plan: WorkoutPlanDetail }> {
  return apiGet<{ plan: WorkoutPlanDetail }>(`/workout/plans/${id}`);
}

export function apiDeleteWorkoutPlan(id: string): Promise<{ deleted: boolean }> {
  return apiDelete<{ deleted: boolean }>(`/workout/plans/${id}`);
}
