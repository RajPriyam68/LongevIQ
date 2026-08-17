import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';

const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

describeIntegration('Analytics API (integration)', () => {
  const app = createApp();
  const prisma = new PrismaClient();
  const base = `${env.API_PREFIX}/${env.API_VERSION}`;

  let tokenA = '';
  let tokenB = '';

  async function registerAndLogin(email: string) {
    const register = await request(app).post(`${base}/auth/register`).send({
      email,
      password: 'Str0ngPass!',
      firstName: 'Integ',
      lastName: 'Analytics',
    });
    const token = new URL(register.body.data.verificationUrl).searchParams.get('token')!;
    await request(app).post(`${base}/auth/verify-email`).send({ token });
    const login = await request(app)
      .post(`${base}/auth/login`)
      .send({ email, password: 'Str0ngPass!' });
    return login.body.data.accessToken as string;
  }

  beforeAll(async () => {
    await prisma.$transaction([
      prisma.auditLog.deleteMany(),
      prisma.emailVerificationToken.deleteMany(),
      prisma.refreshToken.deleteMany(),
      prisma.healthMetric.deleteMany(),
      prisma.user.deleteMany(),
    ]);

    tokenA = await registerAndLogin('analytics-a@example.com');
    tokenB = await registerAndLogin('analytics-b@example.com');

    await request(app)
      .post(`${base}/metrics`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ type: 'SLEEP_HOURS', value: 8 });
    await request(app)
      .post(`${base}/metrics`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ type: 'HEART_RATE', value: 70 });
    await request(app)
      .post(`${base}/metrics`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ type: 'BLOOD_PRESSURE', value: 120, valueSecondary: 80 });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('rejects analytics without authentication', async () => {
    await request(app).get(`${base}/analytics/summary`).expect(401);
    await request(app).get(`${base}/analytics/score`).expect(401);
    await request(app).get(`${base}/analytics/insights`).expect(401);
  });

  it('rejects an invalid days window', async () => {
    const tooSmall = await request(app)
      .get(`${base}/analytics/summary?days=0`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(tooSmall.status).toBe(400);
    expect(tooSmall.body.error.code).toBe('VALIDATION_ERROR');

    const tooLarge = await request(app)
      .get(`${base}/analytics/insights?days=999`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(tooLarge.status).toBe(400);
  });

  it('returns a per-metric summary for the window', async () => {
    const res = await request(app)
      .get(`${base}/analytics/summary?days=30`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);

    const metrics = res.body.data.summary.metrics;
    expect(metrics).toHaveLength(8);
    const sleep = metrics.find((m: { type: string }) => m.type === 'SLEEP_HOURS');
    expect(sleep.count).toBe(1);
    expect(sleep.latest).toBe(8);
    expect(sleep.average).toBe(8);
    expect(sleep.status).toBe('normal');
    expect(sleep.series).toHaveLength(1);
    expect(sleep.recommendedRange.min).toBe(7);

    const steps = metrics.find((m: { type: string }) => m.type === 'STEPS');
    expect(steps.count).toBe(0);
    expect(steps.series).toHaveLength(0);
  });

  it('computes a health score from scored components', async () => {
    const res = await request(app)
      .get(`${base}/analytics/score`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);

    const score = res.body.data.score;
    expect(score.overall).toBe(100);
    expect(score.label).toBe('Excellent');
    expect(score.coverage.scored).toBe(3);
    expect(score.coverage.total).toBe(7);
    expect(score.components).toHaveLength(7);
    const heartRate = score.components.find((c: { type: string }) => c.type === 'HEART_RATE');
    expect(heartRate.score).toBe(100);
    expect(heartRate.readings).toBe(1);
  });

  it('returns deterministic insights', async () => {
    const res = await request(app)
      .get(`${base}/analytics/insights?days=30`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);

    const items = res.body.data.insights.items;
    expect(items.length).toBeGreaterThan(0);
    expect(
      items.every((item: { severity: string }) =>
        ['info', 'warning', 'positive'].includes(item.severity),
      ),
    ).toBe(true);
    expect(items.some((item: { severity: string }) => item.severity === 'positive')).toBe(true);
  });

  it('isolates analytics between users', async () => {
    const summary = await request(app)
      .get(`${base}/analytics/summary`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(summary.status).toBe(200);
    expect(summary.body.data.summary.metrics.every((m: { count: number }) => m.count === 0)).toBe(
      true,
    );

    const score = await request(app)
      .get(`${base}/analytics/score`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(score.body.data.score.overall).toBeNull();
    expect(score.body.data.score.label).toBe('Insufficient data');
  });
});
