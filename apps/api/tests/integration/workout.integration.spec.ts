import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { computeWorkoutTargets } from '../../src/modules/workout/planner/targets.js';

const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

describeIntegration('Workout API (integration)', () => {
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
      lastName: 'Workout',
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
      prisma.workoutExercise.deleteMany(),
      prisma.workoutDay.deleteMany(),
      prisma.workoutPlan.deleteMany(),
      prisma.nutritionMeal.deleteMany(),
      prisma.nutritionPlan.deleteMany(),
      prisma.medicalReport.deleteMany(),
      prisma.healthMetric.deleteMany(),
      prisma.user.deleteMany(),
    ]);

    userToken = await registerAndLogin('workout-user@example.com');
    user2Token = await registerAndLogin('workout-user2@example.com');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const payload = {
    age: 32,
    sex: 'FEMALE',
    weightKg: 65,
    heightCm: 168,
    goal: 'GENERAL_FITNESS',
    fitnessLevel: 'BEGINNER',
    equipment: 'NONE',
    daysPerWeek: 3,
    sessionDurationMinutes: 30,
  };

  it('requires authentication to create a plan', async () => {
    const res = await request(app).post(`${base}/workout/plans`).send(payload);
    expect(res.status).toBe(401);
  });

  it('validates the request body', async () => {
    const res = await request(app)
      .post(`${base}/workout/plans`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ ...payload, age: 15 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');

    const badGoal = await request(app)
      .post(`${base}/workout/plans`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ ...payload, goal: 'BULK_UP' });
    expect(badGoal.status).toBe(400);

    const badDays = await request(app)
      .post(`${base}/workout/plans`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ ...payload, daysPerWeek: 9 });
    expect(badDays.status).toBe(400);

    const badDuration = await request(app)
      .post(`${base}/workout/plans`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ ...payload, sessionDurationMinutes: 5 });
    expect(badDuration.status).toBe(400);
  });

  it('creates a plan with computed targets and a full week', async () => {
    const res = await request(app)
      .post(`${base}/workout/plans`)
      .set('Authorization', `Bearer ${userToken}`)
      .send(payload);

    expect(res.status).toBe(200);
    const plan = res.body.data.plan;
    const targets = computeWorkoutTargets(payload);

    expect(plan.weeklyMinutes).toBe(targets.weeklyMinutes);
    expect(plan.strengthSessions).toBe(targets.strengthSessions);
    expect(plan.cardioSessions).toBe(targets.cardioSessions);
    expect(plan.mainMinutesPerSession).toBe(targets.mainMinutesPerSession);
    expect(plan.days).toHaveLength(3);
    expect(plan.days.map((day: { dayNumber: number }) => day.dayNumber)).toEqual([1, 2, 3]);
    for (const day of plan.days) {
      expect(day.exercises.length).toBeGreaterThan(0);
      expect(day.warmupMinutes + day.mainMinutes + day.cooldownMinutes).toBe(30);
    }

    const stored = await prisma.workoutPlan.findUnique({
      where: { id: plan.id },
      include: { days: { include: { exercises: true } } },
    });
    expect(stored).not.toBeNull();
    expect(stored!.days).toHaveLength(3);
    expect(stored!.days.flatMap((day) => day.exercises).length).toBeGreaterThan(0);
  });

  it('lists the users plans with day counts', async () => {
    const res = await request(app)
      .get(`${base}/workout/plans`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThan(0);
    expect(res.body.data.items[0]!.dayCount).toBe(3);
    expect(res.body.data.items[0]!.days).toBeUndefined();
  });

  it('returns a plan detail with days and exercises', async () => {
    const list = await request(app)
      .get(`${base}/workout/plans`)
      .set('Authorization', `Bearer ${userToken}`);
    const planId = list.body.data.items[0]!.id;

    const res = await request(app)
      .get(`${base}/workout/plans/${planId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.plan.days).toHaveLength(3);
    expect(res.body.data.plan.id).toBe(planId);
  });

  it('hides other users plans with 404', async () => {
    const list = await request(app)
      .get(`${base}/workout/plans`)
      .set('Authorization', `Bearer ${userToken}`);
    const planId = list.body.data.items[0]!.id;

    const get = await request(app)
      .get(`${base}/workout/plans/${planId}`)
      .set('Authorization', `Bearer ${user2Token}`);
    expect(get.status).toBe(404);

    const del = await request(app)
      .delete(`${base}/workout/plans/${planId}`)
      .set('Authorization', `Bearer ${user2Token}`);
    expect(del.status).toBe(404);
  });

  it('supports advanced gym plans with rotating splits', async () => {
    const res = await request(app)
      .post(`${base}/workout/plans`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        ...payload,
        age: 45,
        weightKg: 90,
        heightCm: 180,
        sex: 'MALE',
        goal: 'MUSCLE_GAIN',
        fitnessLevel: 'ADVANCED',
        equipment: 'FULL_GYM',
        daysPerWeek: 5,
        sessionDurationMinutes: 60,
      });

    expect(res.status).toBe(200);
    const plan = res.body.data.plan;
    expect(plan.days).toHaveLength(5);
    expect(plan.strengthSessions).toBe(4);
    expect(plan.cardioSessions).toBe(1);
    expect(plan.mainMinutesPerSession).toBeGreaterThanOrEqual(40);
    const focuses = new Set(
      plan.days
        .filter((day: { focus: string }) => day.focus !== 'CARDIO')
        .map((day: { focus: string }) => day.focus),
    );
    expect(focuses.size).toBeGreaterThan(1);
  });

  it('deletes an owned plan', async () => {
    const created = await request(app)
      .post(`${base}/workout/plans`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send(payload);
    const planId = created.body.data.plan.id;

    const del = await request(app)
      .delete(`${base}/workout/plans/${planId}`)
      .set('Authorization', `Bearer ${user2Token}`);
    expect(del.status).toBe(200);
    expect(del.body.data.deleted).toBe(true);

    const get = await request(app)
      .get(`${base}/workout/plans/${planId}`)
      .set('Authorization', `Bearer ${user2Token}`);
    expect(get.status).toBe(404);
  });
});
