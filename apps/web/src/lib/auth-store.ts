import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { PublicUser } from '@longeviq/shared';

export interface AuthState {
  accessToken: string | null;
  user: PublicUser | null;
  isAuthenticated: boolean;
  setSession: (accessToken: string, user: PublicUser) => void;
  setUser: (user: PublicUser) => void;
  setAccessToken: (accessToken: string) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      setSession: (accessToken, user) => set({ accessToken, user, isAuthenticated: true }),
      setUser: (user) => set({ user }),
      setAccessToken: (accessToken) => set({ accessToken, isAuthenticated: true }),
      clearSession: () => set({ accessToken: null, user: null, isAuthenticated: false }),
    }),
    {
      name: 'longeviq-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
