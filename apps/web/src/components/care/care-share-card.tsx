'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Copy, KeyRound, Loader2, UserRound, X } from 'lucide-react';
import {
  apiCreateCareGrant,
  apiListCareConnections,
  apiRevokeCareConnection,
} from '@/lib/care-api';
import { isApiClientError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateLabel, formatPersonName } from '@/lib/doctor-format';

function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = React.useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Share code copied to clipboard.');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Unable to copy the code. Please copy it manually.');
    }
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={onCopy} aria-label="Copy share code">
      {copied ? (
        <Check className="size-4" aria-hidden="true" />
      ) : (
        <Copy className="size-4" aria-hidden="true" />
      )}
      Copy
    </Button>
  );
}

export function CareShareCard() {
  const queryClient = useQueryClient();

  const connectionsQuery = useQuery({
    queryKey: ['care-connections'],
    queryFn: () => apiListCareConnections(),
  });

  const generateMutation = useMutation({
    mutationFn: () => apiCreateCareGrant(),
    onError: (error: unknown) => {
      toast.error(isApiClientError(error) ? error.message : 'Unable to generate a share code.');
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (connectionId: string) => apiRevokeCareConnection(connectionId),
    onSuccess: async () => {
      toast.success('Access revoked.');
      await queryClient.invalidateQueries({ queryKey: ['care-connections'] });
    },
    onError: (error: unknown) => {
      toast.error(isApiClientError(error) ? error.message : 'Unable to revoke access.');
    },
  });

  const grant = generateMutation.data?.grant;
  const connections = connectionsQuery.data?.connections ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Care connections</CardTitle>
        <CardDescription>
          Generate a one-time share code to let your doctor view your health data. Codes expire
          after 7 days, and you can revoke access at any time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {grant ? (
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Your share code · expires {formatDateLabel(grant.expiresAt)}
              </p>
              <p className="truncate font-mono text-lg font-semibold">{grant.code}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Share this code with your doctor, who enters it in their portal to connect.
            </p>
          )}
          <div className="flex items-center gap-2">
            {grant ? <CopyCodeButton code={grant.code} /> : null}
            <Button
              type="button"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <KeyRound className="size-4" aria-hidden="true" />
              )}
              {grant ? 'Generate another code' : 'Generate share code'}
            </Button>
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold">Doctors with access</h3>
          {connectionsQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : connections.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No doctors are connected yet. Share a code to get started.
            </p>
          ) : (
            <div className="divide-y rounded-lg border">
              {connections.map((connection) => (
                <div
                  key={connection.id}
                  className="flex flex-wrap items-center justify-between gap-2 p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
                      aria-hidden="true"
                    >
                      <UserRound className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {formatPersonName(connection.doctor)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {connection.doctor.email} · connected{' '}
                        {formatDateLabel(connection.connectedAt)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={revokeMutation.isPending}
                    onClick={() => revokeMutation.mutate(connection.id)}
                  >
                    <X className="size-4" aria-hidden="true" />
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
