'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';

interface GuestOnlyProps {
  children: ReactNode;
  redirectTo?: string;
}

export function GuestOnly({ children, redirectTo = '/account' }: GuestOnlyProps) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(redirectTo);
    }
  }, [isAuthenticated, redirectTo, router]);

  if (isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
