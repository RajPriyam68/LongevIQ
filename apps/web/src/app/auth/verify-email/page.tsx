'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, Mail, XCircle } from 'lucide-react';
import { resendVerificationSchema, type ResendVerificationInput } from '@longeviq/shared';
import { apiResendVerification, apiVerifyEmail } from '@/lib/auth-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isApiClientError } from '@/lib/api-client';

type VerifyState = 'verifying' | 'verified' | 'failed' | 'prompt';

export default function VerifyEmailPage() {
  return (
    <React.Suspense fallback={null}>
      <VerifyEmailContent />
    </React.Suspense>
  );
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const sentEmail = searchParams.get('sent');

  const [state, setState] = React.useState<VerifyState>(() => (token ? 'verifying' : 'prompt'));
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResendVerificationInput>({
    resolver: zodResolver(resendVerificationSchema),
    defaultValues: { email: sentEmail ?? '' },
  });

  React.useEffect(() => {
    if (!token || state !== 'verifying') return;
    let cancelled = false;

    (async () => {
      try {
        await apiVerifyEmail({ token });
        if (!cancelled) {
          setState('verified');
          toast.success('Email verified! You can now sign in.');
        }
      } catch (error) {
        if (!cancelled) {
          setState('failed');
          setErrorMessage(isApiClientError(error) ? error.message : 'Verification failed.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, state]);

  const onResend = async (values: ResendVerificationInput) => {
    try {
      const result = await apiResendVerification(values);
      setState('prompt');
      toast.success('Verification email sent!');
      if (result.verificationUrl) {
        setErrorMessage(`Development preview link: ${result.verificationUrl}`);
      }
    } catch (error) {
      toast.error(isApiClientError(error) ? error.message : 'Unable to resend verification email.');
    }
  };

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-16rem)] max-w-md flex-col justify-center px-4 py-12">
      <Card>
        <CardHeader className="text-center">
          {state === 'verified' ? (
            <>
              <CheckCircle2 className="mx-auto size-10 text-emerald-500" aria-hidden="true" />
              <CardTitle className="text-2xl">Email verified</CardTitle>
              <CardDescription>
                Your account is active. You can now sign in to LongevIQ.
              </CardDescription>
            </>
          ) : state === 'failed' ? (
            <>
              <XCircle className="mx-auto size-10 text-destructive" aria-hidden="true" />
              <CardTitle className="text-2xl">Verification failed</CardTitle>
              <CardDescription>
                {errorMessage ?? 'The verification link is invalid or has expired.'}
              </CardDescription>
            </>
          ) : state === 'verifying' ? (
            <>
              <Loader2
                className="mx-auto size-10 animate-spin text-muted-foreground"
                aria-hidden="true"
              />
              <CardTitle className="text-2xl">Verifying your email</CardTitle>
              <CardDescription>Please wait a moment…</CardDescription>
            </>
          ) : (
            <>
              <Mail className="mx-auto size-10 text-muted-foreground" aria-hidden="true" />
              <CardTitle className="text-2xl">Verify your email</CardTitle>
              <CardDescription>
                We sent a verification link to your inbox. Click it to activate your account, or
                request a new link below.
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {state === 'verified' ? (
            <Button asChild className="w-full">
              <Link href="/auth/login">Go to sign in</Link>
            </Button>
          ) : state === 'failed' ? (
            <Button asChild variant="outline" className="w-full">
              <Link href="/auth/register">Register again</Link>
            </Button>
          ) : (
            <form onSubmit={handleSubmit(onResend)} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="pl-9"
                    aria-invalid={Boolean(errors.email)}
                    {...register('email')}
                  />
                </div>
                {errors.email ? (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.email.message}
                  </p>
                ) : null}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden="true" />
                    Sending…
                  </>
                ) : (
                  'Resend verification email'
                )}
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link href="/auth/login">Back to sign in</Link>
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
