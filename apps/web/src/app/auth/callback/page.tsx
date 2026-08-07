'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { apiRefresh } from '@/lib/auth-api';
import { useAuthStore } from '@/lib/auth-store';
import { isApiClientError } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AuthCallbackPage() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const session = await apiRefresh();
        if (cancelled) return;
        setSession(session.accessToken, session.user);
        toast.success(`Signed in as ${session.user.firstName}!`);
        router.replace('/account');
      } catch (error) {
        if (cancelled) return;
        toast.error(
          isApiClientError(error) ? error.message : 'Sign in with Google did not complete.',
        );
        router.replace('/auth/login');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, setSession]);

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-16rem)] max-w-md flex-col justify-center px-4 py-12">
      <Card>
        <CardHeader className="text-center">
          <Loader2
            className="mx-auto size-10 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
          <CardTitle className="text-2xl">Completing sign in</CardTitle>
          <CardDescription>Please wait while we finish signing you in…</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          You&apos;ll be redirected automatically.
        </CardContent>
      </Card>
    </div>
  );
}
