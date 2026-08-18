import type {
  PatientAccessGrant as PatientAccessGrantModel,
  DoctorPatient as DoctorPatientModel,
  User as UserModel,
} from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import type {
  CareConnectionRecord,
  CareGrantRecord,
  CareRepository,
  CreateGrantInput,
  DoctorConnectionRecord,
  UserRef,
} from './care.repository.types.js';

export class PrismaCareRepository implements CareRepository {
  async createGrant(input: CreateGrantInput): Promise<CareGrantRecord> {
    const row = await prisma.patientAccessGrant.create({
      data: {
        patientId: input.patientId,
        codeHash: input.codeHash,
        expiresAt: input.expiresAt,
      },
    });
    return toGrantRecord(row);
  }

  async findGrantByCodeHash(codeHash: string): Promise<CareGrantRecord | null> {
    const row = await prisma.patientAccessGrant.findUnique({ where: { codeHash } });
    return row ? toGrantRecord(row) : null;
  }

  async consumeGrant(id: string): Promise<void> {
    await prisma.patientAccessGrant.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async listConnectionsByPatient(patientId: string): Promise<CareConnectionRecord[]> {
    const rows = await prisma.doctorPatient.findMany({
      where: { patientId, revokedAt: null },
      include: { doctor: true },
      orderBy: { connectedAt: 'desc' },
    });
    return rows.map(toCareConnectionRecord);
  }

  async listActiveConnectionsByDoctor(doctorId: string): Promise<DoctorConnectionRecord[]> {
    const rows = await prisma.doctorPatient.findMany({
      where: { doctorId, revokedAt: null },
      include: { patient: true },
      orderBy: { connectedAt: 'desc' },
    });
    return rows.map(toDoctorConnectionRecord);
  }

  async findActiveConnection(
    doctorId: string,
    patientId: string,
  ): Promise<CareConnectionRecord | null> {
    const row = await prisma.doctorPatient.findFirst({
      where: { doctorId, patientId, revokedAt: null },
    });
    return row ? toCareConnectionRecord(row) : null;
  }

  async findConnectionById(id: string): Promise<CareConnectionRecord | null> {
    const row = await prisma.doctorPatient.findUnique({ where: { id } });
    return row ? toCareConnectionRecord(row) : null;
  }

  async createConnection(doctorId: string, patientId: string): Promise<CareConnectionRecord> {
    const row = await prisma.doctorPatient.create({
      data: { doctorId, patientId },
    });
    return toCareConnectionRecord(row);
  }

  async revokeConnection(id: string, revokedById: string): Promise<void> {
    await prisma.doctorPatient.update({
      where: { id },
      data: { revokedAt: new Date(), revokedById },
    });
  }
}

function toGrantRecord(row: PatientAccessGrantModel): CareGrantRecord {
  return {
    id: row.id,
    patientId: row.patientId,
    codeHash: row.codeHash,
    expiresAt: row.expiresAt,
    usedAt: row.usedAt,
    createdAt: row.createdAt,
  };
}

function toCareConnectionRecord(
  row: DoctorPatientModel & { doctor?: UserModel | null },
): CareConnectionRecord {
  return {
    id: row.id,
    doctorId: row.doctorId,
    patientId: row.patientId,
    connectedAt: row.connectedAt,
    revokedAt: row.revokedAt,
    revokedById: row.revokedById,
    doctor: row.doctor ? toUserRef(row.doctor) : null,
  };
}

function toDoctorConnectionRecord(
  row: DoctorPatientModel & { patient?: UserModel | null },
): DoctorConnectionRecord {
  return {
    id: row.id,
    doctorId: row.doctorId,
    patientId: row.patientId,
    connectedAt: row.connectedAt,
    revokedAt: row.revokedAt,
    revokedById: row.revokedById,
    patient: row.patient ? toUserRef(row.patient) : null,
  };
}

function toUserRef(user: UserModel): UserRef {
  return { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email };
}
