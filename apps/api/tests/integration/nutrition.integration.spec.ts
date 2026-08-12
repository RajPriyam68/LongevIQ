import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { computeNutritionTargets } from '../../src/modules/nutrition/planner/targets.js';

const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

describeIntegration('Nutrition API (integration)', () => {
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
      lastName: 'Nutrition',
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
      prisma.nutritionMeal.deleteMany(),
      prisma.nutritionPlan.deleteMany(),
      prisma.medicalReport.deleteMany(),
      prisma.healthMetric.deleteMany(),
      prisma.user.deleteMany(),
    ]);

    userToken = await registerAndLogin('nutrition-user@example.com');
    user2Token = await registerAndLogin('nutrition-user2@example.com');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const payload = {
    age: 32,
    sex: 'FEMALE',
    weightKg: 65,
    heightCm: 168,
    goal: 'MAINTAIN_WEIGHT',
    activityLevel: 'MODERATE',
    dietaryPreferences: ['VEGETARIAN'],
  };

  it('requires authentication to create a plan', async () => {
    const res = await request(app).post(`${base}/nutrition/plans`).send(payload);
    expect(res.status).toBe(401);
  });

  it('validates the request body', async () => {
    const res = await request(app)
      .post(`${base}/nutrition/plans`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ ...payload, age: 15 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');

    const badGoal = await request(app)
      .post(`${base}/nutrition/plans`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ ...payload, goal: 'BULK_UP' });
    expect(badGoal.status).toBe(400);
    expect(badGoal.body.error.code).toBe('VALIDATION_ERROR');

    const badWeight = await request(app)
      .post(`${base}/nutrition/plans`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ ...payload, weightKg: -5 });
    expect(badWeight.status).toBe(400);
  });

  it('creates a plan with computed targets and four scaled meals', async () => {
    const res = await request(app)
      .post(`${base}/nutrition/plans`)
      .set('Authorization', `Bearer ${userToken}`)
      .send(payload);

    expect(res.status).toBe(200);
    const plan = res.body.data.plan;
    const targets = computeNutritionTargets({
      age: 32,
      sex: 'FEMALE',
      weightKg: 65,
      heightCm: 168,
      goal: 'MAINTAIN_WEIGHT',
      activityLevel: 'MODERATE',
    });

    expect(plan.targetCalories).toBe(targets.targetCalories);
    expect(plan.bmrCalories).toBe(targets.bmrCalories);
    expect(plan.proteinGrams).toBe(targets.proteinGrams);
    expect(plan.waterLitres).toBe(targets.waterLitres);
    expect(plan.meals).toHaveLength(4);
    expect(plan.meals.map((meal: { mealType: string }) => meal.mealType)).toEqual([
      'BREAKFAST',
      'LUNCH',
      'DINNER',
      'SNACK',
    ]);

    const mealCalories = plan.meals.reduce(
      (sum: number, meal: { calories: number }) => sum + meal.calories,
      0,
    );
    expect(Math.abs(mealCalories - plan.targetCalories)).toBeLessThanOrEqual(4);

    const stored = await prisma.nutritionPlan.findUnique({
      where: { id: plan.id },
      include: { meals: true },
    });
    expect(stored).not.toBeNull();
    expect(stored!.meals).toHaveLength(4);
    expect(stored!.dietaryPreferences).toEqual(['VEGETARIAN']);
  });

  it('lists the users plans with meal counts', async () => {
    const res = await request(app)
      .get(`${base}/nutrition/plans`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThan(0);
    expect(res.body.data.items[0]!.mealCount).toBe(4);
    expect(res.body.data.items[0]!.meals).toBeUndefined();
  });

  it('returns a plan detail with meals', async () => {
    const list = await request(app)
      .get(`${base}/nutrition/plans`)
      .set('Authorization', `Bearer ${userToken}`);
    const planId = list.body.data.items[0]!.id;

    const res = await request(app)
      .get(`${base}/nutrition/plans/${planId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.plan.meals).toHaveLength(4);
    expect(res.body.data.plan.id).toBe(planId);
  });

  it('hides other users plans with 404', async () => {
    const list = await request(app)
      .get(`${base}/nutrition/plans`)
      .set('Authorization', `Bearer ${userToken}`);
    const planId = list.body.data.items[0]!.id;

    const get = await request(app)
      .get(`${base}/nutrition/plans/${planId}`)
      .set('Authorization', `Bearer ${user2Token}`);
    expect(get.status).toBe(404);

    const del = await request(app)
      .delete(`${base}/nutrition/plans/${planId}`)
      .set('Authorization', `Bearer ${user2Token}`);
    expect(del.status).toBe(404);
  });

  it('supports weight-loss plans and dietary preferences', async () => {
    const res = await request(app)
      .post(`${base}/nutrition/plans`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        ...payload,
        age: 45,
        weightKg: 80,
        heightCm: 175,
        sex: 'MALE',
        goal: 'LOSE_WEIGHT',
        activityLevel: 'LIGHT',
        dietaryPreferences: ['VEGAN', 'GLUTEN_FREE', 'DAIRY_FREE'],
      });

    expect(res.status).toBe(200);
    const plan = res.body.data.plan;
    expect(plan.targetCalories).toBeLessThan(plan.tdeeCalories);
    expect(plan.proteinGrams).toBeGreaterThanOrEqual(plan.weightKg * 1.8 - 1);
    expect(plan.meals).toHaveLength(4);
    expect(plan.dietaryPreferences).toEqual(['VEGAN', 'GLUTEN_FREE', 'DAIRY_FREE']);
  });

  it('deletes an owned plan', async () => {
    const created = await request(app)
      .post(`${base}/nutrition/plans`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send(payload);
    const planId = created.body.data.plan.id;

    const del = await request(app)
      .delete(`${base}/nutrition/plans/${planId}`)
      .set('Authorization', `Bearer ${user2Token}`);
    expect(del.status).toBe(200);
    expect(del.body.data.deleted).toBe(true);

    const get = await request(app)
      .get(`${base}/nutrition/plans/${planId}`)
      .set('Authorization', `Bearer ${user2Token}`);
    expect(get.status).toBe(404);
  });
});
