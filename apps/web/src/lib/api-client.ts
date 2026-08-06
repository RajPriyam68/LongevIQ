import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';
import type { ApiErrorResponse } from '@longeviq/shared';

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

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1',
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    const status = error.response?.status ?? 0;
    const apiError = error.response?.data?.error;
    const message = apiError?.message ?? 'Something went wrong. Please try again.';
    const code = apiError?.code ?? 'NETWORK_ERROR';
    return Promise.reject(new ApiClientError(message, status, code));
  },
);

export async function apiGet<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.request<{ success: true; data: T }>(config);
  return response.data.data;
}
