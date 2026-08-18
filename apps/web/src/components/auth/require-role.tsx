'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { UserRole } from '@longeviq/shared';
import { useAuthStore } from '@/lib/auth-store';

interface RequireRoleProps {
  roles: UserRole[];
  children: ReactNode;
  redirectTo?: string;
}

export function RequireRole({ roles, children, redirectTo = '/dashboard' }: RequireRoleProps) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth/login');
      return;
    }
    if (user && !roles.includes(user.role)) {
      toast.error('You do not have permission to access that page.');
      router.replace(redirectTo);
    }
  }, [isAuthenticated, user, roles, redirectTo, router]);

  if (!isAuthenticated || !user || !roles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
