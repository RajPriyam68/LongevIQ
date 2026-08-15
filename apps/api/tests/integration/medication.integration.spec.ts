import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';

const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

describeIntegration('Medication API (integration)', () => {
  const app = createApp();
  const prisma = new PrismaClient();
  const base = `${env.API_PREFIX}/${env.API_VERSION}`;

  let userToken = '';
  let user2Token = '';

  async function registerAndLogin(email: string, password = 'Str0ngPass!') {
    const register = await request(app).post(`${base}/auth/register`).send({
      email,
      password,
      firstName: 'Integ',
      lastName: 'Medication',
    });
    const token = new URL(register.body.data.verificationUrl).searchParams.get('token')!;
    await request(app).post(`${base}/auth/verify-email`).send({ token });
    const login = await request(app).post(`${base}/auth/login`).send({ email, password });
    return login.body.data.accessToken as string;
  }

  beforeAll(async () => {
    await prisma.$transaction([
      prisma.auditLog.deleteMany(),
      prisma.emailVerificationToken.deleteMany(),
      prisma.refreshToken.deleteMany(),
      prisma.medicationAdherence.deleteMany(),
      prisma.medication.deleteMany(),
      prisma.workoutExercise.deleteMany(),
      prisma.workoutDay.deleteMany(),
      prisma.workoutPlan.deleteMany(),
      prisma.nutritionMeal.deleteMany(),
      prisma.nutritionPlan.deleteMany(),
      prisma.medicalReport.deleteMany(),
      prisma.healthMetric.deleteMany(),
      prisma.user.deleteMany(),
    ]);

    userToken = await registerAndLogin('medication-user@example.com');
    user2Token = await registerAndLogin('medication-user2@example.com');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const payload = {
    name: 'Metformin',
    dosage: '500 mg',
    form: 'PILL',
    reminderTimes: ['08:00', '20:00'],
    instructions: 'Take with food.',
    startDate: '2026-08-10',
    endDate: '2026-08-31',
    active: true,
  };

  it('requires authentication to create a medication', async () => {
    const res = await request(app).post(`${base}/medications`).send(payload);
    expect(res.status).toBe(401);
  });

  it('validates the request body', async () => {
    const noName = await request(app)
      .post(`${base}/medications`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ ...payload, name: '' });
    expect(noName.status).toBe(400);
    expect(noName.body.error.code).toBe('VALIDATION_ERROR');

    const emptyTimes = await request(app)
      .post(`${base}/medications`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ ...payload, reminderTimes: [] });
    expect(emptyTimes.status).toBe(400);

    const badTime = await request(app)
      .post(`${base}/medications`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ ...payload, reminderTimes: ['25:00'] });
    expect(badTime.status).toBe(400);

    const reversedDates = await request(app)
      .post(`${base}/medications`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ ...payload, startDate: '2026-09-01', endDate: '2026-08-01' });
    expect(reversedDates.status).toBe(400);
  });

  it('creates a medication with normalized reminder times', async () => {
    const res = await request(app)
      .post(`${base}/medications`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ ...payload, reminderTimes: ['20:00', '08:00'] });

    expect(res.status).toBe(201);
    const medication = res.body.data.medication;
    expect(medication.reminderTimes).toEqual(['08:00', '20:00']);
    expect(medication.startDate).toBe('2026-08-10');
    expect(medication.active).toBe(true);

    const stored = await prisma.medication.findUnique({ where: { id: medication.id } });
    expect(stored).not.toBeNull();
    expect(stored!.reminderTimes).toEqual(['08:00', '20:00']);
  });

  it('lists the users medications with dose counts', async () => {
    const res = await request(app)
      .get(`${base}/medications`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThan(0);
    expect(res.body.data.items[0]!.doseCount).toBe(2);
    expect(res.body.data.items[0]!.reminderTimes).toEqual(['08:00', '20:00']);
    expect(res.body.data.items[0]!.days).toBeUndefined();
  });

  it('returns a medication detail and hides other users medications with 404', async () => {
    const list = await request(app)
      .get(`${base}/medications`)
      .set('Authorization', `Bearer ${userToken}`);
    const medicationId = list.body.data.items[0]!.id;

    const get = await request(app)
      .get(`${base}/medications/${medicationId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(get.status).toBe(200);
    expect(get.body.data.medication.id).toBe(medicationId);

    const crossGet = await request(app)
      .get(`${base}/medications/${medicationId}`)
      .set('Authorization', `Bearer ${user2Token}`);
    expect(crossGet.status).toBe(404);

    const crossDel = await request(app)
      .delete(`${base}/medications/${medicationId}`)
      .set('Authorization', `Bearer ${user2Token}`);
    expect(crossDel.status).toBe(404);
  });

  it('updates a medication', async () => {
    const list = await request(app)
      .get(`${base}/medications`)
      .set('Authorization', `Bearer ${userToken}`);
    const medicationId = list.body.data.items[0]!.id;

    const res = await request(app)
      .patch(`${base}/medications/${medicationId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Metformin ER', reminderTimes: ['08:00'] });
    expect(res.status).toBe(200);
    expect(res.body.data.medication.name).toBe('Metformin ER');
    expect(res.body.data.medication.reminderTimes).toEqual(['08:00']);
  });

  it('builds a daily schedule from active medications', async () => {
    const list = await request(app)
      .get(`${base}/medications`)
      .set('Authorization', `Bearer ${userToken}`);
    const medicationId = list.body.data.items[0]!.id;

    const res = await request(app)
      .get(`${base}/medications/schedule?date=2026-08-15`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    const schedule = res.body.data.schedule;
    expect(schedule.date).toBe('2026-08-15');
    expect(schedule.doses).toHaveLength(1);
    expect(schedule.doses[0]!.medicationId).toBe(medicationId);
    expect(schedule.doses[0]!.time).toBe('08:00');
    expect(schedule.doses[0]!.status).toBe('PENDING');
  });

  it('marks a dose as taken and skips it', async () => {
    const list = await request(app)
      .get(`${base}/medications`)
      .set('Authorization', `Bearer ${userToken}`);
    const medicationId = list.body.data.items[0]!.id;

    const taken = await request(app)
      .post(`${base}/medications/${medicationId}/adherence`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ date: '2026-08-15', time: '08:00', status: 'TAKEN' });
    expect(taken.status).toBe(200);
    expect(taken.body.data.schedule.doses[0]!.status).toBe('TAKEN');

    const stored = await prisma.medicationAdherence.findFirst({
      where: { medicationId, date: new Date('2026-08-15T00:00:00.000Z') },
    });
    expect(stored).not.toBeNull();
    expect(stored!.status).toBe('TAKEN');

    const skipped = await request(app)
      .post(`${base}/medications/${medicationId}/adherence`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ date: '2026-08-15', time: '08:00', status: 'SKIPPED' });
    expect(skipped.body.data.schedule.doses[0]!.status).toBe('SKIPPED');

    const pending = await request(app)
      .post(`${base}/medications/${medicationId}/adherence`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ date: '2026-08-15', time: '08:00', status: 'PENDING' });
    expect(pending.body.data.schedule.doses[0]!.status).toBe('PENDING');
    expect(pending.body.data.schedule.doses[0]!.adherenceId).toBeNull();
  });

  it('refuses marking an unscheduled time or a date past the end date', async () => {
    const list = await request(app)
      .get(`${base}/medications`)
      .set('Authorization', `Bearer ${userToken}`);
    const medicationId = list.body.data.items[0]!.id;

    const badTime = await request(app)
      .post(`${base}/medications/${medicationId}/adherence`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ date: '2026-08-15', time: '13:00', status: 'TAKEN' });
    expect(badTime.status).toBe(404);

    const pastEnd = await request(app)
      .post(`${base}/medications/${medicationId}/adherence`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ date: '2026-09-05', time: '08:00', status: 'TAKEN' });
    expect(pastEnd.status).toBe(400);

    const crossUser = await request(app)
      .post(`${base}/medications/${medicationId}/adherence`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ date: '2026-08-15', time: '08:00', status: 'TAKEN' });
    expect(crossUser.status).toBe(404);
  });

  it('deletes an owned medication', async () => {
    const created = await request(app)
      .post(`${base}/medications`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ ...payload, name: 'Lisinopril', reminderTimes: ['07:30'] });
    const medicationId = created.body.data.medication.id;

    const del = await request(app)
      .delete(`${base}/medications/${medicationId}`)
      .set('Authorization', `Bearer ${user2Token}`);
    expect(del.status).toBe(200);
    expect(del.body.data.deleted).toBe(true);

    const get = await request(app)
      .get(`${base}/medications/${medicationId}`)
      .set('Authorization', `Bearer ${user2Token}`);
    expect(get.status).toBe(404);
  });

  it('records audit entries for medication lifecycle events', async () => {
    const created = await request(app)
      .post(`${base}/medications`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ ...payload, name: 'Atorvastatin', reminderTimes: ['22:00'] });
    const medicationId = created.body.data.medication.id;
    await request(app)
      .post(`${base}/medications/${medicationId}/adherence`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ date: '2026-08-15', time: '22:00', status: 'TAKEN' });

    const actions = await prisma.auditLog.findMany({
      where: { action: { in: ['DATA.MEDICATION_CREATE', 'DATA.MEDICATION_DOSE_STATUS'] } },
      orderBy: { createdAt: 'asc' },
    });
    const actionsList = actions.map((entry) => entry.action);
    expect(actionsList).toContain('DATA.MEDICATION_CREATE');
    expect(actionsList).toContain('DATA.MEDICATION_DOSE_STATUS');
  });
});
