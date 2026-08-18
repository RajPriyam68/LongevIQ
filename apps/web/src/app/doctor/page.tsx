'use client';

import * as React from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, Stethoscope, UserRound } from 'lucide-react';
import { UserRole, redeemCodeSchema, type RedeemConnectionInput } from '@longeviq/shared';
import { apiDoctorDisconnect, apiDoctorListConnections, apiDoctorRedeem } from '@/lib/doctor-api';
import { isApiClientError } from '@/lib/api-client';
import { RequireRole } from '@/components/auth/require-role';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateLabel, formatPersonName } from '@/lib/doctor-format';

export default function DoctorPortalPage() {
  const queryClient = useQueryClient();

  const connectionsQuery = useQuery({
    queryKey: ['doctor-connections'],
    queryFn: () => apiDoctorListConnections(),
  });

  const redeemMutation = useMutation({
    mutationFn: (input: RedeemConnectionInput) => apiDoctorRedeem(input.code),
    onSuccess: async () => {
      toast.success('Connected to the patient.');
      await queryClient.invalidateQueries({ queryKey: ['doctor-connections'] });
    },
    onError: (error: unknown) => {
      toast.error(isApiClientError(error) ? error.message : 'Unable to connect to that patient.');
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (patientId: string) => apiDoctorDisconnect(patientId),
    onSuccess: async () => {
      toast.success('Disconnected from the patient.');
      await queryClient.invalidateQueries({ queryKey: ['doctor-connections'] });
    },
    onError: (error: unknown) => {
      toast.error(isApiClientError(error) ? error.message : 'Unable to disconnect.');
    },
  });

  const form = useForm<RedeemConnectionInput>({
    resolver: zodResolver(redeemCodeSchema),
    defaultValues: { code: '' },
  });

  const onSubmit = (values: RedeemConnectionInput) => {
    redeemMutation.mutate(values, {
      onSuccess: () => form.reset(),
    });
  };

  const connections = connectionsQuery.data?.connections ?? [];

  return (
    <RequireRole roles={[UserRole.DOCTOR]}>
      <div className="container mx-auto max-w-4xl space-y-8 px-4 py-10">
        <div className="flex items-center gap-3">
          <span
            className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"
            aria-hidden="true"
          >
            <Stethoscope className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold">Doctor portal</h1>
            <p className="text-sm text-muted-foreground">
              Connect with patients who share a care code with you.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Connect to a patient</CardTitle>
            <CardDescription>
              Enter the share code the patient generated in their account. Codes are one-time use
              and expire after 7 days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-4 sm:flex-row sm:items-start"
              noValidate
            >
              <div className="flex-1 space-y-2">
                <Label htmlFor="care-code">Share code</Label>
                <Input
                  id="care-code"
                  placeholder="LV-XXXX-XXXX-XXXX"
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono uppercase"
                  aria-invalid={Boolean(form.formState.errors.code)}
                  {...form.register('code')}
                />
                {form.formState.errors.code ? (
                  <p className="text-sm text-destructive" role="alert">
                    {form.formState.errors.code.message}
                  </p>
                ) : null}
              </div>
              <Button type="submit" className="mt-0 sm:mt-7" disabled={redeemMutation.isPending}>
                {redeemMutation.isPending ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : null}
                Connect
              </Button>
            </form>
          </CardContent>
        </Card>

        <section aria-label="Connected patients">
          <h2 className="mb-4 text-lg font-semibold">Connected patients</h2>
          {connectionsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, index) => (
                <Skeleton key={index} className="h-20" />
              ))}
            </div>
          ) : connections.length === 0 ? (
            <Card>
              <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
                <UserRound className="size-5" aria-hidden="true" />
                No patients yet. Ask a patient to generate a share code and enter it above.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {connections.map((connection) => (
                <Card key={connection.id}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="font-medium">{formatPersonName(connection.patient)}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {connection.patient.email} · connected{' '}
                        {formatDateLabel(connection.connectedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/doctor/patients/${connection.patient.id}`}>
                          View health data
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={disconnectMutation.isPending}
                        onClick={() => disconnectMutation.mutate(connection.patient.id)}
                      >
                        Disconnect
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <p className="text-xs text-muted-foreground">
          Patient health data shown here is read-only and for educational purposes only. It does not
          replace clinical judgment, diagnosis, or treatment.
        </p>
      </div>
    </RequireRole>
  );
}
