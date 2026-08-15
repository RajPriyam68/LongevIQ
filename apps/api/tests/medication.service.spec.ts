import { describe, expect, it } from 'vitest';
import { MedicationService } from '../src/modules/medications/medication.service.js';
import type { AuditSink } from '../src/modules/metrics/metrics.repository.types.js';
import { FakeMedicationRepository } from './fakes.js';

const USER = 'usr_user';
const OTHER = 'usr_other';

const INPUT = {
  name: 'Metformin',
  dosage: '500 mg',
  form: 'PILL' as const,
  reminderTimes: ['20:00', '08:00', '08:00'],
  instructions: 'Take with food.',
  notes: 'Refill monthly.',
  startDate: '2026-08-10',
  endDate: '2026-08-31',
  active: true,
};

function makeService() {
  const repository = new FakeMedicationRepository();
  const service = new MedicationService(
    repository as unknown as ConstructorParameters<typeof MedicationService>[0],
    repository as unknown as AuditSink,
  );
  return { repository, service };
}

describe('MedicationService.createMedication', () => {
  it('persists the medication with normalized reminder times', async () => {
    const { repository, service } = makeService();
    const medication = await service.createMedication(USER, INPUT);

    expect(medication.id).toBeTruthy();
    expect(medication.reminderTimes).toEqual(['08:00', '20:00']);
    expect(medication.startDate).toBe('2026-08-10');
    expect(medication.endDate).toBe('2026-08-31');

    const stored = repository.medications.get(medication.id)!;
    expect(stored.name).toBe('Metformin');
    expect(repository.auditCalls.some((call) => call.action === 'DATA.MEDICATION_CREATE')).toBe(
      true,
    );
  });

  it('defaults the start date to today and end date to null', async () => {
    const { service } = makeService();
    const medication = await service.createMedication(USER, {
      ...INPUT,
      startDate: undefined,
      endDate: undefined,
    });
    expect(medication.startDate).toBe(new Date().toISOString().slice(0, 10));
    expect(medication.endDate).toBeNull();
  });

  it('serializes ISO timestamps', async () => {
    const { service } = makeService();
    const medication = await service.createMedication(USER, INPUT);
    expect(new Date(medication.createdAt).getTime()).not.toBeNaN();
  });
});

describe('MedicationService.listMedications', () => {
  it('paginates medications with dose counts and hides day schedules', async () => {
    const { service } = makeService();
    await service.createMedication(USER, INPUT);
    await service.createMedication(USER, {
      ...INPUT,
      name: 'Atorvastatin',
      reminderTimes: ['22:00'],
    });

    const result = await service.listMedications(USER, { page: 1, limit: 10 });
    expect(result.pagination.total).toBe(2);
    expect(result.pagination.totalPages).toBe(1);
    expect(result.items.map((item) => item.name)).toEqual(['Atorvastatin', 'Metformin']);
    expect(result.items[0]!.doseCount).toBe(1);
  });

  it('filters by active flag', async () => {
    const { service } = makeService();
    await service.createMedication(USER, { ...INPUT, active: false });

    const active = await service.listMedications(USER, { page: 1, limit: 10, active: true });
    expect(active.items).toHaveLength(0);

    const all = await service.listMedications(USER, { page: 1, limit: 10, active: false });
    expect(all.items).toHaveLength(1);
  });

  it('never leaks other users medications', async () => {
    const { service } = makeService();
    await service.createMedication(USER, INPUT);
    const result = await service.listMedications(OTHER, { page: 1, limit: 10 });
    expect(result.items).toEqual([]);
    expect(result.pagination.total).toBe(0);
  });
});

describe('MedicationService.getMedication', () => {
  it('returns an owned medication', async () => {
    const { service } = makeService();
    const created = await service.createMedication(USER, INPUT);
    const medication = await service.getMedication(USER, created.id);
    expect(medication.id).toBe(created.id);
  });

  it('returns 404 for another users medication', async () => {
    const { service } = makeService();
    const created = await service.createMedication(USER, INPUT);
    await expect(service.getMedication(OTHER, created.id)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('returns 404 for a missing medication', async () => {
    const { service } = makeService();
    await expect(service.getMedication(USER, 'nope')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('MedicationService.updateMedication', () => {
  it('updates fields and normalizes times', async () => {
    const { service } = makeService();
    const created = await service.createMedication(USER, INPUT);
    const updated = await service.updateMedication(USER, created.id, {
      name: 'Metformin ER',
      reminderTimes: ['08:00', '08:00'],
    });
    expect(updated.name).toBe('Metformin ER');
    expect(updated.reminderTimes).toEqual(['08:00']);
  });

  it('returns 404 for another users medication', async () => {
    const { service } = makeService();
    const created = await service.createMedication(USER, INPUT);
    await expect(service.updateMedication(OTHER, created.id, { name: 'X' })).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('rejects an end date before the start date', async () => {
    const { service } = makeService();
    const created = await service.createMedication(USER, INPUT);
    await expect(
      service.updateMedication(USER, created.id, { startDate: '2026-09-01' }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('MedicationService.deleteMedication', () => {
  it('deletes an owned medication and audits the event', async () => {
    const { repository, service } = makeService();
    const created = await service.createMedication(USER, INPUT);
    await service.deleteMedication(USER, created.id);
    expect(repository.medications.has(created.id)).toBe(false);
    expect(repository.auditCalls.some((call) => call.action === 'DATA.MEDICATION_DELETE')).toBe(
      true,
    );
  });

  it('refuses to delete another users medication', async () => {
    const { repository, service } = makeService();
    const created = await service.createMedication(USER, INPUT);
    await expect(service.deleteMedication(OTHER, created.id)).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(repository.medications.has(created.id)).toBe(true);
  });
});

describe('MedicationService.getSchedule', () => {
  it('builds a date-scoped schedule of pending doses sorted by time', async () => {
    const { service } = makeService();
    const medication = await service.createMedication(USER, INPUT);

    const schedule = await service.getSchedule(USER, '2026-08-15');
    expect(schedule.date).toBe('2026-08-15');
    expect(schedule.doses).toHaveLength(2);
    expect(schedule.doses.map((dose) => dose.time)).toEqual(['08:00', '20:00']);
    expect(schedule.doses.every((dose) => dose.status === 'PENDING')).toBe(true);
    expect(schedule.doses[0]!.medicationId).toBe(medication.id);
  });

  it('excludes medications outside their date range and inactive ones', async () => {
    const { service } = makeService();
    await service.createMedication(USER, INPUT);
    await service.createMedication(USER, {
      ...INPUT,
      name: 'Inactive',
      startDate: '2026-07-01',
      endDate: '2026-07-31',
    });

    const schedule = await service.getSchedule(USER, '2026-08-15');
    expect(schedule.doses.every((dose) => dose.medicationName !== 'Inactive')).toBe(true);
  });

  it('never leaks other users medications into the schedule', async () => {
    const { service } = makeService();
    await service.createMedication(USER, INPUT);
    const schedule = await service.getSchedule(OTHER, '2026-08-15');
    expect(schedule.doses).toEqual([]);
  });
});

describe('MedicationService.setDoseStatus', () => {
  it('marks a scheduled dose as taken and returns the refreshed schedule', async () => {
    const { service } = makeService();
    const medication = await service.createMedication(USER, INPUT);

    const schedule = await service.setDoseStatus(USER, medication.id, {
      date: '2026-08-15',
      time: '08:00',
      status: 'TAKEN',
    });
    const dose = schedule.doses.find((entry) => entry.time === '08:00')!;
    expect(dose.status).toBe('TAKEN');
    expect(dose.adherenceId).toBeTruthy();
    expect(new Date(dose.takenAt!).getTime()).not.toBeNaN();
  });

  it('reverts a dose back to pending', async () => {
    const { service } = makeService();
    const medication = await service.createMedication(USER, INPUT);
    await service.setDoseStatus(USER, medication.id, {
      date: '2026-08-15',
      time: '08:00',
      status: 'TAKEN',
    });
    const schedule = await service.setDoseStatus(USER, medication.id, {
      date: '2026-08-15',
      time: '08:00',
      status: 'PENDING',
    });
    const dose = schedule.doses.find((entry) => entry.time === '08:00')!;
    expect(dose.status).toBe('PENDING');
    expect(dose.adherenceId).toBeNull();
  });

  it('returns 404 when the time is not a scheduled reminder', async () => {
    const { service } = makeService();
    const medication = await service.createMedication(USER, INPUT);
    await expect(
      service.setDoseStatus(USER, medication.id, {
        date: '2026-08-15',
        time: '13:00',
        status: 'TAKEN',
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('returns 400 when the date falls after the end date', async () => {
    const { service } = makeService();
    const medication = await service.createMedication(USER, INPUT);
    await expect(
      service.setDoseStatus(USER, medication.id, {
        date: '2026-09-05',
        time: '08:00',
        status: 'TAKEN',
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('returns 404 when marking a dose for another users medication', async () => {
    const { service } = makeService();
    const medication = await service.createMedication(USER, INPUT);
    await expect(
      service.setDoseStatus(OTHER, medication.id, {
        date: '2026-08-15',
        time: '08:00',
        status: 'TAKEN',
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('audits dose status changes', async () => {
    const { repository, service } = makeService();
    const medication = await service.createMedication(USER, INPUT);
    await service.setDoseStatus(USER, medication.id, {
      date: '2026-08-15',
      time: '08:00',
      status: 'SKIPPED',
    });
    expect(
      repository.auditCalls.some((call) => call.action === 'DATA.MEDICATION_DOSE_STATUS'),
    ).toBe(true);
  });
});
