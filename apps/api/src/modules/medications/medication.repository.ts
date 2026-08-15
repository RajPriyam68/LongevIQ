import type {
  Medication as MedicationModel,
  MedicationAdherence as MedicationAdherenceModel,
} from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import type {
  CreateMedicationInput,
  MedicationAdherenceRecord,
  MedicationListItem,
  MedicationRecord,
  MedicationRepository,
  UpsertAdherenceInput,
} from './medication.repository.types.js';

export class PrismaMedicationRepository implements MedicationRepository {
  async create(input: CreateMedicationInput): Promise<MedicationRecord> {
    const medication = await prisma.medication.create({ data: input });
    return toRecord(medication);
  }

  async findById(id: string): Promise<MedicationRecord | null> {
    const medication = await prisma.medication.findUnique({ where: { id } });
    return medication ? toRecord(medication) : null;
  }

  async listByUser(
    userId: string,
    filter: { page: number; limit: number; active?: boolean },
  ): Promise<{ items: MedicationListItem[]; total: number }> {
    const where = { userId, ...(filter.active === undefined ? {} : { active: filter.active }) };
    const [rows, total] = await prisma.$transaction([
      prisma.medication.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      prisma.medication.count({ where }),
    ]);

    const items: MedicationListItem[] = rows.map((row) => ({
      ...toRecord(row),
      doseCount: row.reminderTimes.length,
    }));
    return { items, total };
  }

  async update(id: string, data: Partial<CreateMedicationInput>): Promise<MedicationRecord> {
    const medication = await prisma.medication.update({ where: { id }, data });
    return toRecord(medication);
  }

  async delete(id: string): Promise<void> {
    await prisma.medication.delete({ where: { id } });
  }

  async listScheduledForDate(userId: string, date: Date): Promise<MedicationRecord[]> {
    const medications = await prisma.medication.findMany({
      where: {
        userId,
        active: true,
        startDate: { lte: date },
        OR: [{ endDate: null }, { endDate: { gte: date } }],
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
    return medications.map(toRecord);
  }

  async listAdherenceForDate(userId: string, date: Date): Promise<MedicationAdherenceRecord[]> {
    const rows = await prisma.medicationAdherence.findMany({
      where: { date, medication: { userId } },
    });
    return rows.map(toAdherenceRecord);
  }

  async upsertAdherence(input: UpsertAdherenceInput): Promise<MedicationAdherenceRecord> {
    const row = await prisma.medicationAdherence.upsert({
      where: {
        medicationId_time_date: {
          medicationId: input.medicationId,
          time: input.time,
          date: input.date,
        },
      },
      create: input,
      update: { status: input.status, takenAt: input.takenAt },
    });
    return toAdherenceRecord(row);
  }

  async deleteAdherence(medicationId: string, time: string, date: Date): Promise<void> {
    await prisma.medicationAdherence.deleteMany({ where: { medicationId, time, date } });
  }
}

function toRecord(medication: MedicationModel): MedicationRecord {
  return {
    id: medication.id,
    userId: medication.userId,
    name: medication.name,
    dosage: medication.dosage,
    form: medication.form,
    reminderTimes: medication.reminderTimes,
    instructions: medication.instructions,
    notes: medication.notes,
    startDate: medication.startDate,
    endDate: medication.endDate,
    active: medication.active,
    createdAt: medication.createdAt,
    updatedAt: medication.updatedAt,
  };
}

function toAdherenceRecord(row: MedicationAdherenceModel): MedicationAdherenceRecord {
  return {
    id: row.id,
    medicationId: row.medicationId,
    time: row.time,
    date: row.date,
    status: row.status,
    takenAt: row.takenAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
