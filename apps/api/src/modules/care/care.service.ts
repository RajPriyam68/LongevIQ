import { createHash, randomInt } from 'node:crypto';
import {
  CARE_CODE_ALPHABET,
  CARE_GRANT_TTL_DAYS,
  type CareConnection,
  type CareGrantCreated,
} from '@longeviq/shared';
import { AppError } from '../../utils/app-error.js';
import type { AuditSink } from '../metrics/metrics.repository.types.js';
import type { CareRepository } from './care.repository.types.js';

export interface RequestContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class CareService {
  constructor(
    private readonly repository: CareRepository,
    private readonly audit?: AuditSink,
  ) {}

  async createGrant(
    patientId: string,
    ctx: RequestContext = {},
  ): Promise<{ grant: CareGrantCreated }> {
    const code = generateCareCode();
    const expiresAt = new Date(Date.now() + CARE_GRANT_TTL_DAYS * 24 * 60 * 60 * 1000);
    const grant = await this.repository.createGrant({
      patientId,
      codeHash: hashCode(code),
      expiresAt,
    });

    await this.audit?.recordAudit({
      userId: patientId,
      action: 'DATA.CARE_GRANT_CREATE',
      entity: 'PatientAccessGrant',
      entityId: grant.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { expiresAt: expiresAt.toISOString() },
    });

    return { grant: { id: grant.id, code, expiresAt: expiresAt.toISOString() } };
  }

  async listConnections(patientId: string): Promise<{ connections: CareConnection[] }> {
    const rows = await this.repository.listConnectionsByPatient(patientId);
    return {
      connections: rows
        .filter((row) => row.doctor)
        .map((row) => ({
          id: row.id,
          doctor: {
            id: row.doctor!.id,
            firstName: row.doctor!.firstName,
            lastName: row.doctor!.lastName,
            email: row.doctor!.email,
          },
          connectedAt: row.connectedAt.toISOString(),
        })),
    };
  }

  async revokeConnection(
    patientId: string,
    connectionId: string,
    ctx: RequestContext = {},
  ): Promise<{ revoked: boolean }> {
    const connection = await this.repository.findConnectionById(connectionId);
    if (!connection || connection.patientId !== patientId) {
      throw AppError.notFound('Connection not found.');
    }

    await this.repository.revokeConnection(connectionId, patientId);

    await this.audit?.recordAudit({
      userId: patientId,
      action: 'DATA.CARE_CONNECTION_REVOKE',
      entity: 'DoctorPatient',
      entityId: connectionId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { doctorId: connection.doctorId },
    });

    return { revoked: true };
  }
}

export function generateCareCode(): string {
  const chars: string[] = [];
  for (let i = 0; i < 12; i += 1) {
    const char = CARE_CODE_ALPHABET[randomInt(CARE_CODE_ALPHABET.length)];
    if (char === undefined) throw new Error('Failed to generate a care code.');
    chars.push(char);
  }
  const body = chars.join('');
  return `LV-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 12)}`;
}

export function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}
