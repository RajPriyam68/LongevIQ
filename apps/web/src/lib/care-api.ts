import type { CareConnection, CareGrantCreated } from '@longeviq/shared';
import { apiDelete, apiGet, apiPost } from '@/lib/api-client';

export function apiCreateCareGrant(): Promise<{ grant: CareGrantCreated }> {
  return apiPost<{ grant: CareGrantCreated }>('/care/grants');
}

export function apiListCareConnections(): Promise<{ connections: CareConnection[] }> {
  return apiGet<{ connections: CareConnection[] }>('/care/connections');
}

export function apiRevokeCareConnection(connectionId: string): Promise<{ revoked: boolean }> {
  return apiDelete<{ revoked: boolean }>(`/care/connections/${connectionId}`);
}
