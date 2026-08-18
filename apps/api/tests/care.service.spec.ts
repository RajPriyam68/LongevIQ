import { beforeEach, describe, expect, it } from 'vitest';
import {
  CARE_CODE_ALPHABET,
  CARE_CODE_REGEX,
  CARE_GRANT_TTL_DAYS,
  type CareConnection,
} from '@longeviq/shared';
import { CareService, generateCareCode, hashCode } from '../src/modules/care/care.service.js';
import { AppError } from '../src/utils/app-error.js';
import { FakeCareRepository } from './fakes.js';

const PATIENT = 'usr_patient';
const DOCTOR = 'usr_doctor';
const OTHER = 'usr_other';

describe('care code', () => {
  it('generates codes matching the documented format and alphabet', () => {
    for (let i = 0; i < 100; i += 1) {
      const code = generateCareCode();
      expect(code).toMatch(CARE_CODE_REGEX);
      for (const char of code) {
        if (char === '-' || char === 'L' || char === 'V') continue;
        expect(CARE_CODE_ALPHABET).toContain(char);
      }
    }
  });

  it('hashes codes with sha256 (hex)', () => {
    const hash = hashCode('LV-ABCD-WXYZ-2345');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hashCode('LV-ABCD-WXYZ-2345')).toBe(hash);
    expect(hashCode('LV-ABCD-WXYZ-2346')).not.toBe(hash);
  });
});

describe('CareService', () => {
  let repository: FakeCareRepository;
  let service: CareService;

  beforeEach(() => {
    repository = new FakeCareRepository();
    service = new CareService(repository);
  });

  function addUser(id: string, firstName: string, lastName: string, email: string) {
    repository.users.set(id, { id, firstName, lastName, email });
  }

  async function seedConnection(doctorId: string, patientId: string): Promise<{ id: string }> {
    return repository.createConnection(doctorId, patientId);
  }

  describe('createGrant', () => {
    it('returns a one-time code, hashes it at rest, and sets the expiry', async () => {
      const { grant } = await service.createGrant(PATIENT);

      expect(grant.code).toMatch(CARE_CODE_REGEX);
      expect(new Date(grant.expiresAt).getTime()).toBeGreaterThan(Date.now());
      const ttlMs = CARE_GRANT_TTL_DAYS * 24 * 60 * 60 * 1000;
      expect(new Date(grant.expiresAt).getTime()).toBeCloseTo(Date.now() + ttlMs, -4);

      const stored = [...repository.grants.values()][0];
      expect(stored?.codeHash).toBe(hashCode(grant.code));
      expect(stored?.codeHash).not.toContain(grant.code);
      expect(stored?.patientId).toBe(PATIENT);
    });

    it('records a CARE_GRANT_CREATE audit event', async () => {
      const audit = { events: [] as string[] };
      const auditedService = new CareService(repository, {
        recordAudit: (input) => {
          audit.events.push(input.action);
          return Promise.resolve();
        },
      });

      await auditedService.createGrant(PATIENT);

      expect(audit.events).toEqual(['DATA.CARE_GRANT_CREATE']);
    });
  });

  describe('listConnections', () => {
    it('returns only active connections with doctor details', async () => {
      addUser(DOCTOR, 'Sarah', 'Chen', 'sarah@example.com');
      const { id } = await seedConnection(DOCTOR, PATIENT);
      addUser('usr_doc2', 'Ann', 'Lee', 'ann@example.com');
      const second = await seedConnection('usr_doc2', PATIENT);
      await repository.revokeConnection(second.id, PATIENT);

      const { connections } = await service.listConnections(PATIENT);

      expect(connections).toHaveLength(1);
      const connection = connections[0] as CareConnection;
      expect(connection.id).toBe(id);
      expect(connection.doctor).toEqual({
        id: DOCTOR,
        firstName: 'Sarah',
        lastName: 'Chen',
        email: 'sarah@example.com',
      });
    });

    it('returns an empty list for a patient with no connections', async () => {
      const { connections } = await service.listConnections(PATIENT);
      expect(connections).toEqual([]);
    });
  });

  describe('revokeConnection', () => {
    it('revokes a connection owned by the patient', async () => {
      const { id } = await seedConnection(DOCTOR, PATIENT);

      const result = await service.revokeConnection(PATIENT, id);

      expect(result.revoked).toBe(true);
      const stored = repository.connections.get(id);
      expect(stored?.revokedAt).not.toBeNull();
      expect(stored?.revokedById).toBe(PATIENT);
    });

    it('returns 404 for a connection owned by another patient', async () => {
      const { id } = await seedConnection(DOCTOR, PATIENT);

      await expect(service.revokeConnection(OTHER, id)).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    });

    it('returns 404 for a missing connection', async () => {
      await expect(service.revokeConnection(PATIENT, 'missing')).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    });
  });
});
