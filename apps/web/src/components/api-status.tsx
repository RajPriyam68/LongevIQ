import { headers } from 'next/headers';
import { Activity } from 'lucide-react';
import type { ApiResponse } from '@longeviq/shared';
import { Badge } from '@/components/ui/badge';

interface HealthData {
  status: 'ok';
  app: string;
  version: string;
  environment: string;
}

async function fetchApiHealth(): Promise<HealthData | null> {
  try {
    const headerStore = await headers();
    const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host') ?? 'localhost:3000';
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const response = await fetch(`${protocol}://${host}/api/v1/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) {
      return null;
    }
    const body = (await response.json()) as ApiResponse<HealthData>;
    return body.success ? body.data : null;
  } catch {
    return null;
  }
}

export async function ApiStatus() {
  const health = await fetchApiHealth();

  if (!health) {
    return (
      <Badge variant="outline" className="gap-1.5 text-muted-foreground">
        <span className="size-2 rounded-full bg-muted-foreground" aria-hidden="true" />
        API offline
      </Badge>
    );
  }

  return (
    <Badge variant="success" className="gap-1.5">
      <Activity className="size-3" aria-hidden="true" />
      API connected
    </Badge>
  );
}
