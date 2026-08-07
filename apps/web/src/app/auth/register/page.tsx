'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { registerSchema, type RegisterInput } from '@longeviq/shared';
import { apiGetGoogleLoginUrl, apiRegister } from '@/lib/auth-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { isApiClientError } from '@/lib/api-client';

interface RegisterSuccess {
  verificationUrl?: string;
}

export default function RegisterPage() {
  const [success, setSuccess] = React.useState<RegisterSuccess | null>(null);
  const [googleLoading, setGoogleLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', firstName: '', lastName: '' },
  });

  const onSubmit = async (values: RegisterInput) => {
    try {
      const result = await apiRegister(values);
      setSuccess({ verificationUrl: result.verificationUrl });
      toast.success('Account created! Please verify your email to continue.');
    } catch (error) {
      toast.error(isApiClientError(error) ? error.message : 'Unable to create your account.');
    }
  };

  const onGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const { url } = await apiGetGoogleLoginUrl();
      window.location.assign(url);
    } catch (error) {
      setGoogleLoading(false);
      toast.error(isApiClientError(error) ? error.message : 'Unable to start Google sign in.');
    }
  };

  if (success) {
    return (
      <div className="container mx-auto flex min-h-[calc(100vh-16rem)] max-w-md flex-col justify-center px-4 py-12">
        <Card>
          <CardHeader className="text-center">
            <CheckCircle2 className="mx-auto size-10 text-emerald-500" aria-hidden="true" />
            <CardTitle className="text-2xl">Check your email</CardTitle>
            <CardDescription>
              We&apos;ve sent a verification link to your inbox. Click it to activate your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {success.verificationUrl ? (
              <p className="rounded-md border bg-muted/50 p-3 text-xs text-muted-foreground">
                Development preview: your verification link is
                <br />
                <Link
                  href={success.verificationUrl}
                  className="break-all font-medium text-primary underline-offset-4 hover:underline"
                >
                  {success.verificationUrl}
                </Link>
              </p>
            ) : null}
            <Button asChild className="w-full">
              <Link href="/auth/login">Go to sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-16rem)] max-w-md flex-col justify-center px-4 py-12">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>Start your longevity journey with LongevIQ.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="firstName"
                    autoComplete="given-name"
                    placeholder="Ada"
                    className="pl-9"
                    aria-invalid={Boolean(errors.firstName)}
                    {...register('firstName')}
                  />
                </div>
                {errors.firstName ? (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.firstName.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="lastName"
                    autoComplete="family-name"
                    placeholder="Lovelace"
                    className="pl-9"
                    aria-invalid={Boolean(errors.lastName)}
                    {...register('lastName')}
                  />
                </div>
                {errors.lastName ? (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.lastName.message}
                  </p>
                ) : null}
              </div>
            </div>

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

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  className="pl-9"
                  aria-invalid={Boolean(errors.password)}
                  {...register('password')}
                />
              </div>
              {errors.password ? (
                <p className="text-sm text-destructive" role="alert">
                  {errors.password.message}
                </p>
              ) : null}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden="true" />
                  Creating account…
                </>
              ) : (
                'Create account'
              )}
            </Button>
          </form>

          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
            <Separator className="flex-1" />
            or
            <Separator className="flex-1" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onGoogleLogin}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <>
                <Loader2 className="animate-spin" aria-hidden="true" />
                Redirecting to Google…
              </>
            ) : (
              <>
                <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
                  />
                </svg>
                Continue with Google
              </>
            )}
          </Button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              href="/auth/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
