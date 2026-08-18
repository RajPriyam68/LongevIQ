'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, LogOut, ShieldCheck } from 'lucide-react';
import {
  UserRole,
  changePasswordSchema,
  updateProfileSchema,
  type ChangePasswordInput,
  type UpdateProfileInput,
} from '@longeviq/shared';
import { apiChangePassword, apiLogout, apiUpdateProfile } from '@/lib/auth-api';
import { useAuthStore } from '@/lib/auth-store';
import { isApiClientError } from '@/lib/api-client';
import { RequireAuth } from '@/components/auth/require-auth';
import { CareShareCard } from '@/components/care/care-share-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

function initialsOf(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export default function AccountPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [loggingOut, setLoggingOut] = React.useState(false);

  const profileForm = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    values: { firstName: user?.firstName ?? '', lastName: user?.lastName ?? '' },
  });

  const passwordForm = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '' },
  });

  const onUpdateProfile = async (values: UpdateProfileInput) => {
    try {
      const result = await apiUpdateProfile(values);
      setUser(result.user);
      toast.success('Profile updated.');
    } catch (error) {
      toast.error(isApiClientError(error) ? error.message : 'Unable to update your profile.');
    }
  };

  const onChangePassword = async (values: ChangePasswordInput) => {
    try {
      await apiChangePassword(values);
      clearSession();
      toast.success('Password changed. Please sign in again.');
      router.replace('/auth/login');
    } catch (error) {
      toast.error(isApiClientError(error) ? error.message : 'Unable to change your password.');
    }
  };

  const onLogout = async () => {
    setLoggingOut(true);
    try {
      await apiLogout();
    } catch {
      // Log out locally even if the server call fails.
    } finally {
      clearSession();
      toast.success('Signed out.');
      router.replace('/');
    }
  };

  if (!user) {
    return null;
  }

  return (
    <RequireAuth>
      <div className="container mx-auto max-w-3xl space-y-6 px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span
              className="flex size-12 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground"
              aria-hidden="true"
            >
              {initialsOf(user.firstName, user.lastName)}
            </span>
            <div>
              <h1 className="text-2xl font-semibold">
                {user.firstName} {user.lastName}
              </h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <Button variant="outline" onClick={onLogout} disabled={loggingOut} aria-label="Sign out">
            {loggingOut ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <LogOut aria-hidden="true" />
            )}
            Sign out
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your personal details.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={profileForm.handleSubmit(onUpdateProfile)}
              className="space-y-4"
              noValidate
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="profile-firstName">First name</Label>
                  <Input
                    id="profile-firstName"
                    autoComplete="given-name"
                    aria-invalid={Boolean(profileForm.formState.errors.firstName)}
                    {...profileForm.register('firstName')}
                  />
                  {profileForm.formState.errors.firstName ? (
                    <p className="text-sm text-destructive" role="alert">
                      {profileForm.formState.errors.firstName.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-lastName">Last name</Label>
                  <Input
                    id="profile-lastName"
                    autoComplete="family-name"
                    aria-invalid={Boolean(profileForm.formState.errors.lastName)}
                    {...profileForm.register('lastName')}
                  />
                  {profileForm.formState.errors.lastName ? (
                    <p className="text-sm text-destructive" role="alert">
                      {profileForm.formState.errors.lastName.message}
                    </p>
                  ) : null}
                </div>
              </div>
              <Button type="submit" disabled={profileForm.formState.isSubmitting}>
                {profileForm.formState.isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden="true" />
                    Saving…
                  </>
                ) : (
                  'Save changes'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
            <CardDescription>
              Use a strong password you don&apos;t use elsewhere. All other sessions will be signed
              out.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={passwordForm.handleSubmit(onChangePassword)}
              className="space-y-4"
              noValidate
            >
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={Boolean(passwordForm.formState.errors.currentPassword)}
                  {...passwordForm.register('currentPassword')}
                />
                {passwordForm.formState.errors.currentPassword ? (
                  <p className="text-sm text-destructive" role="alert">
                    {passwordForm.formState.errors.currentPassword.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  aria-invalid={Boolean(passwordForm.formState.errors.newPassword)}
                  {...passwordForm.register('newPassword')}
                />
                {passwordForm.formState.errors.newPassword ? (
                  <p className="text-sm text-destructive" role="alert">
                    {passwordForm.formState.errors.newPassword.message}
                  </p>
                ) : null}
              </div>
              <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
                {passwordForm.formState.isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden="true" />
                    Changing password…
                  </>
                ) : (
                  'Change password'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Separator />

        {user.role === UserRole.USER ? <CareShareCard /> : null}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="size-4" aria-hidden="true" />
          Account role: <span className="font-medium text-foreground">{user.role}</span>
        </div>
      </div>
    </RequireAuth>
  );
}
