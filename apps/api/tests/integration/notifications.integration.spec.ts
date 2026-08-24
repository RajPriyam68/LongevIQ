import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';

const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

describeIntegration('Notifications API (integration)', () => {
  const app = createApp();
  const prisma = new PrismaClient();
  const base = `${env.API_PREFIX}/${env.API_VERSION}`;

  let ownerToken = '';
  let otherToken = '';
  let ownerId = '';
  let doctorId = '';

  async function registerAndLogin(
    email: string,
    role: 'USER' | 'DOCTOR' | 'ADMIN' = 'USER',
  ): Promise<{ token: string; userId: string }> {
    const register = await request(app)
      .post(`${base}/auth/register`)
      .send({
        email,
        password: 'Str0ngPass!',
        firstName: 'Integ',
        lastName: role === 'DOCTOR' ? 'Doctor' : 'User',
      });
    const token = new URL(register.body.data.verificationUrl).searchParams.get('token')!;
    await request(app).post(`${base}/auth/verify-email`).send({ token });
    if (role !== 'USER') {
      await prisma.user.update({ where: { email }, data: { role } });
    }
    const login = await request(app)
      .post(`${base}/auth/login`)
      .send({ email, password: 'Str0ngPass!' });
    const userId = login.body.data.user.id;
    return { token: login.body.data.accessToken as string, userId };
  }

  beforeAll(async () => {
    await prisma.$transaction([
      prisma.notification.deleteMany(),
      prisma.medicationAdherence.deleteMany(),
      prisma.medication.deleteMany(),
      prisma.doctorPatient.deleteMany(),
      prisma.patientAccessGrant.deleteMany(),
      prisma.medicalReport.deleteMany(),
      prisma.healthMetric.deleteMany(),
      prisma.auditLog.deleteMany(),
      prisma.emailVerificationToken.deleteMany(),
      prisma.refreshToken.deleteMany(),
      prisma.user.deleteMany(),
    ]);

    const owner = await registerAndLogin('notif-owner@example.com');
    ownerToken = owner.token;
    ownerId = owner.userId;

    const other = await registerAndLogin('notif-other@example.com');
    otherToken = other.token;

    const doctor = await registerAndLogin('notif-doctor@example.com', 'DOCTOR');
    doctorId = doctor.userId;

    await request(app)
      .post(`${base}/medications`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Metformin',
        dosage: '500mg',
        form: 'PILL',
        reminderTimes: ['00:00'],
        active: true,
      });

    await request(app)
      .post(`${base}/metrics`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ type: 'HEART_RATE', value: 150, recordedAt: new Date().toISOString() });

    await prisma.medicalReport.create({
      data: {
        userId: ownerId,
        title: 'Annual blood work',
        reportDate: new Date(),
        category: 'BLOODWORK',
        status: 'PARSED',
        fileName: 'annual.pdf',
        fileSizeBytes: 120,
        mimeType: 'application/pdf',
        storageKey: `notif_parsed_${Date.now()}`,
      },
    });
    await prisma.medicalReport.create({
      data: {
        userId: ownerId,
        title: 'Unreadable scan',
        reportDate: new Date(),
        category: 'IMAGING',
        status: 'FAILED',
        fileName: 'scan.pdf',
        fileSizeBytes: 120,
        mimeType: 'application/pdf',
        storageKey: `notif_failed_${Date.now()}`,
      },
    });

    await prisma.doctorPatient.create({
      data: { doctorId, patientId: ownerId },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('rejects notifications endpoints without authentication', async () => {
    await request(app).get(`${base}/notifications`).expect(401);
    await request(app).get(`${base}/notifications/unread-count`).expect(401);
    await request(app).patch(`${base}/notifications/read-all`).expect(401);
    await request(app).patch(`${base}/notifications/any/read`).expect(401);
    await request(app).delete(`${base}/notifications/any`).expect(401);
  });

  it('materializes notifications from existing data on first read', async () => {
    const res = await request(app)
      .get(`${base}/notifications`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    const items = res.body.data.items as Array<Record<string, unknown>>;
    const types = items.map((item) => item.type);
    expect(types).toEqual(
      expect.arrayContaining([
        'MEDICATION_DUE',
        'REPORT_PROCESSED',
        'REPORT_FAILED',
        'METRIC_ALERT',
        'CARE_CONNECTION',
      ]),
    );

    const due = items.find((item) => item.type === 'MEDICATION_DUE')!;
    expect(due.readAt).toBeNull();
    expect(due.metadata).toMatchObject({ time: '00:00' });
    expect(due.dedupKey).toBeUndefined();
    expect(res.body.data.pagination).toMatchObject({ page: 1, limit: 20 });
  });

  it('is idempotent across repeated reads', async () => {
    const first = await request(app)
      .get(`${base}/notifications?limit=100`)
      .set('Authorization', `Bearer ${ownerToken}`);
    const second = await request(app)
      .get(`${base}/notifications?limit=100`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(second.body.data.pagination.total).toBe(first.body.data.pagination.total);
  });

  it('supports unread filtering', async () => {
    const res = await request(app)
      .get(`${base}/notifications?read=false`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThan(0);
    expect(
      res.body.data.items.every((item: { readAt: string | null }) => item.readAt === null),
    ).toBe(true);
  });

  it('supports type filtering', async () => {
    const res = await request(app)
      .get(`${base}/notifications?type=REPORT_PROCESSED`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].type).toBe('REPORT_PROCESSED');
  });

  it('returns an unread count', async () => {
    const res = await request(app)
      .get(`${base}/notifications/unread-count`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.unread).toBeGreaterThan(0);
  });

  it('marks a single notification as read', async () => {
    const list = await request(app)
      .get(`${base}/notifications`)
      .set('Authorization', `Bearer ${ownerToken}`);
    const target = list.body.data.items.find(
      (item: { type: string }) => item.type === 'MEDICATION_DUE',
    );

    const res = await request(app)
      .patch(`${base}/notifications/${target.id}/read`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.readAt).not.toBeNull();

    const unread = await request(app)
      .get(`${base}/notifications/unread-count`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(unread.body.data.unread).toBeLessThanOrEqual(4);
  });

  it('marks all notifications as read', async () => {
    const res = await request(app)
      .patch(`${base}/notifications/read-all`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.marked).toBeGreaterThan(0);

    const unread = await request(app)
      .get(`${base}/notifications/unread-count`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(unread.body.data.unread).toBe(0);
  });

  it('deletes a notification', async () => {
    const list = await request(app)
      .get(`${base}/notifications`)
      .set('Authorization', `Bearer ${ownerToken}`);
    const target = list.body.data.items[0];

    const res = await request(app)
      .delete(`${base}/notifications/${target.id}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBe(true);

    const after = await request(app)
      .get(`${base}/notifications`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(
      after.body.data.items.find((item: { id: string }) => item.id === target.id),
    ).toBeUndefined();
  });

  it('returns 404 when acting on another users notification', async () => {
    const list = await request(app)
      .get(`${base}/notifications`)
      .set('Authorization', `Bearer ${ownerToken}`);
    const target = list.body.data.items[0];

    await request(app)
      .patch(`${base}/notifications/${target.id}/read`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
    await request(app)
      .delete(`${base}/notifications/${target.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
  });

  it('never materializes notifications for another user', async () => {
    const res = await request(app)
      .get(`${base}/notifications`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBe(0);
    expect(res.body.data.pagination.total).toBe(0);
  });

  it('rejects invalid query parameters', async () => {
    await request(app)
      .get(`${base}/notifications?type=NOT_A_TYPE`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(400);
    await request(app)
      .get(`${base}/notifications?limit=1000`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(400);
  });

  it('applies pagination to the notifications list', async () => {
    const res = await request(app)
      .get(`${base}/notifications?page=1&limit=2`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeLessThanOrEqual(2);
    expect(res.body.data.pagination.page).toBe(1);
    expect(res.body.data.pagination.limit).toBe(2);
  });
});
