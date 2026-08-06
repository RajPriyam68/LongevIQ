'use client';

import * as React from 'react';
import { useEffect } from 'react';
import { RotateCcw, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlert className="size-7" aria-hidden="true" />
      </span>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Something went wrong</h2>
        <p className="max-w-md text-muted-foreground">
          An unexpected error occurred while rendering this page. Please try again.
        </p>
        {error.digest ? (
          <p className="text-xs text-muted-foreground">Error reference: {error.digest}</p>
        ) : null}
      </div>
      <Button onClick={reset} className="gap-2">
        <RotateCcw className="size-4" aria-hidden="true" />
        Try again
      </Button>
    </div>
  );
}
