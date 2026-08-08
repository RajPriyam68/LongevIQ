import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';

const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

describeIntegration('Metrics & Dashboard API (integration)', () => {
  const app = createApp();
  const prisma = new PrismaClient();
  const base = `${env.API_PREFIX}/${env.API_VERSION}`;

  let tokenA = '';
  let tokenB = '';
  let userIdA = '';

  async function registerAndLogin(email: string) {
    const register = await request(app).post(`${base}/auth/register`).send({
      email,
      password: 'Str0ngPass!',
      firstName: 'Integ',
      lastName: 'Metric',
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

    tokenA = await registerAndLogin('metrics-a@example.com');
    tokenB = await registerAndLogin('metrics-b@example.com');
    const me = await request(app).get(`${base}/users/me`).set('Authorization', `Bearer ${tokenA}`);
    userIdA = me.body.data.user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('rejects metrics without authentication', async () => {
    const res = await request(app).post(`${base}/metrics`).send({ type: 'WEIGHT', value: 80 });
    expect(res.status).toBe(401);
  });

  it('creates and lists metrics', async () => {
    const created = await request(app)
      .post(`${base}/metrics`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ type: 'WEIGHT', value: 80.5, notes: 'morning' });
    expect(created.status).toBe(201);
    expect(created.body.data.metric.unit).toBe('kg');
    expect(created.body.data.metric.notes).toBe('morning');

    await request(app)
      .post(`${base}/metrics`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ type: 'WEIGHT', value: 81, recordedAt: '2026-08-01T08:00:00.000Z' });
    await request(app)
      .post(`${base}/metrics`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ type: 'BLOOD_PRESSURE', value: 120, valueSecondary: 80 });

    const list = await request(app)
      .get(`${base}/metrics?type=WEIGHT&limit=1`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(list.status).toBe(200);
    expect(list.body.data.pagination.total).toBe(2);
    expect(list.body.data.items).toHaveLength(1);
    expect(list.body.data.items[0].value).toBe(80.5);
  });

  it('validates blood pressure requires a secondary value', async () => {
    const res = await request(app)
      .post(`${base}/metrics`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ type: 'BLOOD_PRESSURE', value: 120 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects out-of-range values', async () => {
    const res = await request(app)
      .post(`${base}/metrics`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ type: 'SLEEP_HOURS', value: 42 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('isolates data between users', async () => {
    const list = await request(app).get(`${base}/metrics`).set('Authorization', `Bearer ${tokenB}`);
    expect(list.status).toBe(200);
    expect(list.body.data.pagination.total).toBe(0);

    const all = await request(app)
      .get(`${base}/metrics?limit=100`)
      .set('Authorization', `Bearer ${tokenA}`);
    const foreign = all.body.data.items[0]!;
    const denied = await request(app)
      .get(`${base}/metrics/${foreign.id}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(denied.status).toBe(404);
  });

  it('updates and deletes an owned metric', async () => {
    const created = await request(app)
      .post(`${base}/metrics`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ type: 'HEART_RATE', value: 72 });
    const id = created.body.data.metric.id;

    const updated = await request(app)
      .patch(`${base}/metrics/${id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ value: 68, notes: 'resting' });
    expect(updated.status).toBe(200);
    expect(updated.body.data.metric.value).toBe(68);

    const deleted = await request(app)
      .delete(`${base}/metrics/${id}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(deleted.status).toBe(200);

    const gone = await request(app)
      .get(`${base}/metrics/${id}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(gone.status).toBe(404);
  });

  it('returns a dashboard overview with trend deltas', async () => {
    const overview = await request(app)
      .get(`${base}/dashboard/overview`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(overview.status).toBe(200);

    const weight = overview.body.data.overview.summary.find(
      (s: { type: string }) => s.type === 'WEIGHT',
    );
    expect(weight.count).toBe(2);
    expect(weight.latest.value).toBe(80.5);
    expect(weight.delta).toBe(-0.5);

    expect(overview.body.data.overview.recent.length).toBeGreaterThan(0);
  });

  it('requires auth for dashboard', async () => {
    const res = await request(app).get(`${base}/dashboard/overview`);
    expect(res.status).toBe(401);
  });
});
