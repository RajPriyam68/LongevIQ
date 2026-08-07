import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AxiosError,
  AxiosHeaders,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { apiClient, apiGet, isApiClientError } from './api-client';
import { useAuthStore } from './auth-store';

const user = {
  id: 'usr_1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'USER' as const,
  emailVerified: true,
  avatarUrl: null,
  createdAt: new Date().toISOString(),
};

function mockRefreshResponse(config: InternalAxiosRequestConfig) {
  return {
    data: { success: true, data: { accessToken: 'fresh-token' } },
    status: 200,
    statusText: 'OK',
    headers: new AxiosHeaders(),
    config,
  };
}

function unauthorizedError(config: InternalAxiosRequestConfig) {
  return new AxiosError('Request failed with status code 401', 'ERR_BAD_REQUEST', config, null, {
    data: { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
    status: 401,
    statusText: 'Unauthorized',
    headers: {},
    config,
  });
}

function installAdapter() {
  const calls: string[] = [];
  const authorization: Array<string | null | undefined> = [];
  let originalRequests = 0;
  const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
    calls.push(String(config.url ?? config.baseURL));
    const headerValue = config.headers.get('Authorization');
    authorization.push(typeof headerValue === 'string' ? headerValue : null);
    if (config.url === '/auth/refresh') {
      return mockRefreshResponse(config);
    }
    originalRequests += 1;
    if (originalRequests === 1) {
      throw unauthorizedError(config);
    }
    return {
      data: { success: true, data: { ok: true } },
      status: 200,
      statusText: 'OK',
      headers: new AxiosHeaders(),
      config,
    };
  });
  apiClient.defaults.adapter = adapter as unknown as AxiosRequestConfig['adapter'];
  return { calls, adapter, authorization };
}

describe('api-client', () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession();
    useAuthStore.getState().setSession('expired-token', user);
    vi.stubGlobal('document', { cookie: 'lq_refresh=abc' });
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
      clear: () => undefined,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete apiClient.defaults.adapter;
  });

  it('attaches the access token to requests', async () => {
    const { authorization } = installAdapter();
    await apiGet<{ ok: boolean }>('/users/me');
    expect(authorization[0]).toBe('Bearer expired-token');
    expect(authorization[2]).toBe('Bearer fresh-token');
  });

  it('refreshes once on a 401 and retries the original request', async () => {
    const { calls } = installAdapter();
    const result = await apiGet<{ ok: boolean }>('/users/me');

    expect(result).toEqual({ ok: true });
    expect(useAuthStore.getState().accessToken).toBe('fresh-token');
    expect(calls.filter((url) => url === '/auth/refresh')).toHaveLength(1);
    expect(calls.filter((url) => url === '/users/me')).toHaveLength(2);
  });

  it('single-flights concurrent refresh attempts', async () => {
    const { calls } = installAdapter();
    const [first, second] = await Promise.all([
      apiGet<{ ok: boolean }>('/users/me'),
      apiGet<{ ok: boolean }>('/users/me'),
    ]);

    expect(first).toEqual({ ok: true });
    expect(second).toEqual({ ok: true });
    expect(calls.filter((url) => url === '/auth/refresh')).toHaveLength(1);
  });

  it('clears the session when refresh fails', async () => {
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      if (config.url === '/auth/refresh') {
        throw new AxiosError('Refresh failed', 'ERR_NETWORK', config);
      }
      throw unauthorizedError(config);
    });
    apiClient.defaults.adapter = adapter as unknown as AxiosRequestConfig['adapter'];

    await expect(apiGet<{ ok: boolean }>('/users/me')).rejects.toBeInstanceOf(Error);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('does not attempt refresh when no refresh cookie is present', async () => {
    vi.stubGlobal('document', { cookie: '' });
    const { calls } = installAdapter();

    await expect(apiGet<{ ok: boolean }>('/users/me')).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
    });
    expect(calls.filter((url) => url === '/auth/refresh')).toHaveLength(0);
  });

  it('isApiClientError narrows rejected errors', async () => {
    vi.stubGlobal('document', { cookie: '' });
    installAdapter();
    try {
      await apiGet<{ ok: boolean }>('/users/me');
      throw new Error('should have thrown');
    } catch (error) {
      expect(isApiClientError(error)).toBe(true);
    }
  });
});
