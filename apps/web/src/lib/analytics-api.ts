import type { AnalyticsInsights, AnalyticsSummary, HealthScoreResult } from '@longeviq/shared';
import { apiGet } from '@/lib/api-client';

export function apiGetAnalyticsSummary(days: number): Promise<{ summary: AnalyticsSummary }> {
  return apiGet<{ summary: AnalyticsSummary }>(`/analytics/summary?days=${days}`);
}

export function apiGetHealthScore(): Promise<{ score: HealthScoreResult }> {
  return apiGet<{ score: HealthScoreResult }>('/analytics/score');
}

export function apiGetAnalyticsInsights(days: number): Promise<{ insights: AnalyticsInsights }> {
  return apiGet<{ insights: AnalyticsInsights }>(`/analytics/insights?days=${days}`);
}
