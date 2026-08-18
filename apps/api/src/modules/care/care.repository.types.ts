export interface CareGrantRecord {
  id: string;
  patientId: string;
  codeHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface UserRef {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface CareConnectionRecord {
  id: string;
  doctorId: string;
  patientId: string;
  connectedAt: Date;
  revokedAt: Date | null;
  revokedById: string | null;
  doctor?: UserRef | null;
}

export interface DoctorConnectionRecord {
  id: string;
  doctorId: string;
  patientId: string;
  connectedAt: Date;
  revokedAt: Date | null;
  revokedById: string | null;
  patient?: UserRef | null;
}

export interface CreateGrantInput {
  patientId: string;
  codeHash: string;
  expiresAt: Date;
}

export interface CareRepository {
  createGrant(input: CreateGrantInput): Promise<CareGrantRecord>;
  findGrantByCodeHash(codeHash: string): Promise<CareGrantRecord | null>;
  consumeGrant(id: string): Promise<void>;
  listConnectionsByPatient(patientId: string): Promise<CareConnectionRecord[]>;
  listActiveConnectionsByDoctor(doctorId: string): Promise<DoctorConnectionRecord[]>;
  findActiveConnection(doctorId: string, patientId: string): Promise<CareConnectionRecord | null>;
  findConnectionById(id: string): Promise<CareConnectionRecord | null>;
  createConnection(doctorId: string, patientId: string): Promise<CareConnectionRecord>;
  revokeConnection(id: string, revokedById: string): Promise<void>;
}
