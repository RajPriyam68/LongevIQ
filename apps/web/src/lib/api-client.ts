import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';
import type { ApiErrorResponse } from '@longeviq/shared';
import { useAuthStore } from '@/lib/auth-store';

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

interface RetryableConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

let refreshPromise: Promise<boolean> | null = null;

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1',
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    config.headers.delete('Content-Type');
  }
  return config;
});

function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = apiClient
      .post<{ data: { accessToken: string } }>('/auth/refresh')
      .then((response) => {
        useAuthStore.getState().setAccessToken(response.data.data.accessToken);
        return true;
      })
      .catch(() => {
        useAuthStore.getState().clearSession();
        return false;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const config = error.config as RetryableConfig | undefined;
    const status = error.response?.status ?? 0;

    const hasRefreshCookie =
      typeof document !== 'undefined' &&
      document.cookie.split(';').some((part) => part.trim().startsWith('lq_refresh='));

    if (status === 401 && config && !config._retry && hasRefreshCookie) {
      config._retry = true;
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        const token = useAuthStore.getState().accessToken;
        config.headers = { ...(config.headers ?? {}), Authorization: `Bearer ${token ?? ''}` };
        return apiClient.request(config);
      }
    }

    const apiError = error.response?.data?.error;
    const message = apiError?.message ?? 'Something went wrong. Please try again.';
    const code = apiError?.code ?? 'NETWORK_ERROR';
    return Promise.reject(new ApiClientError(message, status, code));
  },
);

export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.request<{ success: true; data: T }>({
    url,
    method: 'GET',
    ...config,
  });
  return response.data.data;
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const response = await apiClient.post<{ success: true; data: T }>(url, body);
  return response.data.data;
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  const response = await apiClient.patch<{ success: true; data: T }>(url, body);
  return response.data.data;
}

export async function apiPut<T>(url: string, body?: unknown): Promise<T> {
  const response = await apiClient.put<{ success: true; data: T }>(url, body);
  return response.data.data;
}

export async function apiDelete<T>(url: string): Promise<T> {
  const response = await apiClient.delete<{ success: true; data: T }>(url);
  return response.data.data;
}

export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}
