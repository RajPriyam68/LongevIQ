import { describe, expect, it, beforeEach } from 'vitest';
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

describe('auth-store', () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession();
  });

  it('starts signed out', () => {
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('setSession stores token and user', () => {
    useAuthStore.getState().setSession('token-123', user);
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.accessToken).toBe('token-123');
    expect(state.user).toEqual(user);
  });

  it('setUser updates only the user', () => {
    useAuthStore.getState().setSession('token-123', user);
    const updated = { ...user, firstName: 'Updated' };
    useAuthStore.getState().setUser(updated);
    expect(useAuthStore.getState().user?.firstName).toBe('Updated');
    expect(useAuthStore.getState().accessToken).toBe('token-123');
  });

  it('setAccessToken updates only the token', () => {
    useAuthStore.getState().setSession('token-123', user);
    useAuthStore.getState().setAccessToken('token-456');
    expect(useAuthStore.getState().accessToken).toBe('token-456');
    expect(useAuthStore.getState().user?.email).toBe('test@example.com');
  });

  it('clearSession resets to signed out', () => {
    useAuthStore.getState().setSession('token-123', user);
    useAuthStore.getState().clearSession();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
