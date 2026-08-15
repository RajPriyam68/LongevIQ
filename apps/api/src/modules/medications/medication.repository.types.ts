import type { MedicationAdherenceStatus, MedicationForm } from '@longeviq/shared';

export interface MedicationRecord {
  id: string;
  userId: string;
  name: string;
  dosage: string;
  form: MedicationForm;
  reminderTimes: string[];
  instructions: string | null;
  notes: string | null;
  startDate: Date;
  endDate: Date | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MedicationListItem extends MedicationRecord {
  doseCount: number;
}

export interface MedicationAdherenceRecord {
  id: string;
  medicationId: string;
  time: string;
  date: Date;
  status: MedicationAdherenceStatus;
  takenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMedicationInput {
  userId: string;
  name: string;
  dosage: string;
  form: MedicationForm;
  reminderTimes: string[];
  instructions: string | null;
  notes: string | null;
  startDate: Date;
  endDate: Date | null;
  active: boolean;
}

export interface UpsertAdherenceInput {
  medicationId: string;
  time: string;
  date: Date;
  status: MedicationAdherenceStatus;
  takenAt: Date | null;
}

export interface MedicationRepository {
  create(input: CreateMedicationInput): Promise<MedicationRecord>;
  findById(id: string): Promise<MedicationRecord | null>;
  listByUser(
    userId: string,
    filter: { page: number; limit: number; active?: boolean },
  ): Promise<{ items: MedicationListItem[]; total: number }>;
  update(id: string, data: Partial<CreateMedicationInput>): Promise<MedicationRecord>;
  delete(id: string): Promise<void>;
  listScheduledForDate(userId: string, date: Date): Promise<MedicationRecord[]>;
  listAdherenceForDate(userId: string, date: Date): Promise<MedicationAdherenceRecord[]>;
  upsertAdherence(input: UpsertAdherenceInput): Promise<MedicationAdherenceRecord>;
  deleteAdherence(medicationId: string, time: string, date: Date): Promise<void>;
}
