import type {
  CreateMedicationInput as CreateMedicationApiInput,
  Medication,
  MedicationListResult,
  MedicationListItem,
  MedicationSchedule,
  MedicationScheduleDose,
  SetDoseStatusInput,
  UpdateMedicationInput,
} from '@longeviq/shared';
import { AppError } from '../../utils/app-error.js';
import type { AuditSink } from '../metrics/metrics.repository.types.js';
import type {
  CreateMedicationInput,
  MedicationListItem as MedicationListItemRecord,
  MedicationRecord,
  MedicationRepository,
} from './medication.repository.types.js';

export interface RequestContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

// Parses a YYYY-MM-DD string to a Date normalized to UTC midnight.
function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!));
}

function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

// Sorts and de-duplicates the reminder times so the schedule is deterministic.
function normalizeTimes(times: string[]): string[] {
  return [...new Set(times)].sort();
}

export class MedicationService {
  constructor(
    private readonly repository: MedicationRepository,
    private readonly audit?: AuditSink,
  ) {}

  async createMedication(
    userId: string,
    input: CreateMedicationApiInput,
    ctx: RequestContext = {},
  ): Promise<Medication> {
    const medication = await this.repository.create({
      userId,
      name: input.name,
      dosage: input.dosage,
      form: input.form,
      reminderTimes: normalizeTimes(input.reminderTimes),
      instructions: input.instructions ?? null,
      notes: input.notes ?? null,
      startDate: input.startDate ? parseDateOnly(input.startDate) : startOfUtcDay(new Date()),
      endDate: input.endDate ? parseDateOnly(input.endDate) : null,
      active: input.active ?? true,
    });

    await this.audit?.recordAudit({
      userId,
      action: 'DATA.MEDICATION_CREATE',
      entity: 'Medication',
      entityId: medication.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: {
        form: medication.form,
        doseCount: medication.reminderTimes.length,
        active: medication.active,
      },
    });

    return serializeMedication(medication);
  }

  async listMedications(
    userId: string,
    query: { page: number; limit: number; active?: boolean },
  ): Promise<MedicationListResult> {
    const { items, total } = await this.repository.listByUser(userId, query);
    return {
      items: items.map(serializeMedicationListItem),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getMedication(userId: string, medicationId: string): Promise<Medication> {
    const medication = await this.requireOwnedMedication(userId, medicationId);
    return serializeMedication(medication);
  }

  async updateMedication(
    userId: string,
    medicationId: string,
    input: UpdateMedicationInput,
    ctx: RequestContext = {},
  ): Promise<Medication> {
    const medication = await this.requireOwnedMedication(userId, medicationId);

    const data: Partial<CreateMedicationInput> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.dosage !== undefined) data.dosage = input.dosage;
    if (input.form !== undefined) data.form = input.form;
    if (input.reminderTimes !== undefined) {
      data.reminderTimes = normalizeTimes(input.reminderTimes);
    }
    if (input.instructions !== undefined) data.instructions = input.instructions ?? null;
    if (input.notes !== undefined) data.notes = input.notes ?? null;
    if (input.startDate !== undefined) data.startDate = parseDateOnly(input.startDate);
    if (input.endDate !== undefined) {
      data.endDate = input.endDate === null ? null : parseDateOnly(input.endDate);
    }
    if (input.active !== undefined) data.active = input.active;

    const effectiveStart = data.startDate ?? medication.startDate;
    const effectiveEnd = data.endDate === undefined ? medication.endDate : data.endDate;
    if (effectiveEnd !== null && effectiveEnd < effectiveStart) {
      throw AppError.badRequest('End date must not be before the start date.');
    }

    const updated = await this.repository.update(medication.id, data);

    await this.audit?.recordAudit({
      userId,
      action: 'DATA.MEDICATION_UPDATE',
      entity: 'Medication',
      entityId: updated.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: {
        form: updated.form,
        doseCount: updated.reminderTimes.length,
        active: updated.active,
      },
    });

    return serializeMedication(updated);
  }

  async deleteMedication(
    userId: string,
    medicationId: string,
    ctx: RequestContext = {},
  ): Promise<void> {
    const medication = await this.requireOwnedMedication(userId, medicationId);
    await this.repository.delete(medication.id);

    await this.audit?.recordAudit({
      userId,
      action: 'DATA.MEDICATION_DELETE',
      entity: 'Medication',
      entityId: medication.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { form: medication.form, active: medication.active },
    });
  }

  async getSchedule(userId: string, date?: string): Promise<MedicationSchedule> {
    const day = date ? parseDateOnly(date) : startOfUtcDay(new Date());
    const [medications, adherenceRows] = await Promise.all([
      this.repository.listScheduledForDate(userId, day),
      this.repository.listAdherenceForDate(userId, day),
    ]);

    const adherenceByKey = new Map(
      adherenceRows.map((row) => [`${row.medicationId}:${row.time}`, row]),
    );

    const doses: MedicationScheduleDose[] = [];
    for (const medication of medications) {
      for (const time of medication.reminderTimes) {
        const adherence = adherenceByKey.get(`${medication.id}:${time}`);
        doses.push({
          medicationId: medication.id,
          medicationName: medication.name,
          dosage: medication.dosage,
          form: medication.form,
          time,
          status: adherence?.status ?? 'PENDING',
          takenAt: adherence?.takenAt?.toISOString() ?? null,
          adherenceId: adherence?.id ?? null,
        });
      }
    }
    doses.sort((a, b) => a.time.localeCompare(b.time));

    return { date: formatDateOnly(day), doses };
  }

  async setDoseStatus(
    userId: string,
    medicationId: string,
    input: SetDoseStatusInput,
    ctx: RequestContext = {},
  ): Promise<MedicationSchedule> {
    const medication = await this.requireOwnedMedication(userId, medicationId);

    if (!medication.reminderTimes.includes(input.time)) {
      throw AppError.notFound('No reminder is scheduled at that time for this medication.');
    }
    const date = parseDateOnly(input.date);
    const effectiveEnd = medication.endDate;
    if (effectiveEnd !== null && date > effectiveEnd) {
      throw AppError.badRequest('This medication is not scheduled for that date.');
    }

    if (input.status === 'PENDING') {
      await this.repository.deleteAdherence(medication.id, input.time, date);
    } else {
      await this.repository.upsertAdherence({
        medicationId: medication.id,
        time: input.time,
        date,
        status: input.status,
        takenAt: input.status === 'TAKEN' ? new Date() : null,
      });
    }

    await this.audit?.recordAudit({
      userId,
      action: 'DATA.MEDICATION_DOSE_STATUS',
      entity: 'MedicationAdherence',
      entityId: medication.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { time: input.time, status: input.status },
    });

    return this.getSchedule(userId, formatDateOnly(date));
  }

  private async requireOwnedMedication(
    userId: string,
    medicationId: string,
  ): Promise<MedicationRecord> {
    const medication = await this.repository.findById(medicationId);
    if (!medication || medication.userId !== userId) {
      throw AppError.notFound('Medication not found.');
    }
    return medication;
  }
}

function serializeMedication(medication: MedicationRecord): Medication {
  return {
    id: medication.id,
    name: medication.name,
    dosage: medication.dosage,
    form: medication.form,
    reminderTimes: medication.reminderTimes,
    instructions: medication.instructions,
    notes: medication.notes,
    startDate: formatDateOnly(medication.startDate),
    endDate: medication.endDate ? formatDateOnly(medication.endDate) : null,
    active: medication.active,
    createdAt: medication.createdAt.toISOString(),
    updatedAt: medication.updatedAt.toISOString(),
  };
}

function serializeMedicationListItem(medication: MedicationListItemRecord): MedicationListItem {
  return {
    ...serializeMedication(medication),
    doseCount: medication.doseCount,
  };
}
