import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';

const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

describeIntegration('Admin dashboard API (integration)', () => {
  const app = createApp();
  const prisma = new PrismaClient();
  const base = `${env.API_PREFIX}/${env.API_VERSION}`;

  let adminToken = '';
  let doctorToken = '';
  let userToken = '';
  let userId = '';

  async function registerAndLogin(
    email: string,
    role: 'USER' | 'DOCTOR' | 'ADMIN' = 'USER',
  ): Promise<string> {
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
    return login.body.data.accessToken as string;
  }

  beforeAll(async () => {
    await prisma.$transaction([
      prisma.auditLog.deleteMany(),
      prisma.emailVerificationToken.deleteMany(),
      prisma.refreshToken.deleteMany(),
      prisma.patientAccessGrant.deleteMany(),
      prisma.doctorPatient.deleteMany(),
      prisma.medicalReport.deleteMany(),
      prisma.healthMetric.deleteMany(),
      prisma.user.deleteMany(),
    ]);

    adminToken = await registerAndLogin('admin-test@example.com', 'ADMIN');
    doctorToken = await registerAndLogin('admin-doctor@example.com', 'DOCTOR');
    userToken = await registerAndLogin('admin-user@example.com');

    const me = await request(app)
      .get(`${base}/users/me`)
      .set('Authorization', `Bearer ${adminToken}`);
    userId = me.body.data.user.id;

    await request(app)
      .post(`${base}/metrics`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ type: 'WEIGHT', value: 70 });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('rejects admin endpoints without authentication', async () => {
    await request(app).get(`${base}/admin/summary`).expect(401);
    await request(app).get(`${base}/admin/users`).expect(401);
    await request(app).get(`${base}/admin/audit-logs`).expect(401);
  });

  it('forbids non-ADMIN users from the admin dashboard', async () => {
    await request(app)
      .get(`${base}/admin/summary`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
    await request(app)
      .get(`${base}/admin/users`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
    await request(app)
      .get(`${base}/admin/audit-logs`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .expect(403);
  });

  it('returns an aggregate platform summary to an admin', async () => {
    const res = await request(app)
      .get(`${base}/admin/summary`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.summary.users.total).toBe(3);
    expect(res.body.data.summary.users.byRole).toEqual({
      USER: 1,
      DOCTOR: 1,
      ADMIN: 1,
    });
    expect(res.body.data.summary.users.verified).toBe(3);
    expect(res.body.data.summary.content.healthMetrics).toBe(1);
    expect(res.body.data.summary.auditEvents).toBeGreaterThan(0);
    expect(res.body.data.summary.generatedAt).toEqual(expect.any(String));
  });

  it('lists users with defaults', async () => {
    const res = await request(app)
      .get(`${base}/admin/users`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.users.items).toHaveLength(3);
    expect(res.body.data.users.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 3,
      totalPages: 1,
    });
    const adminRow = res.body.data.users.items.find(
      (row: { email: string }) => row.email === 'admin-test@example.com',
    );
    expect(adminRow).toMatchObject({ role: 'ADMIN', isActive: true });
    expect(adminRow.lastLoginAt).toEqual(expect.any(String));
  });

  it('filters users by search and role', async () => {
    const res = await request(app)
      .get(`${base}/admin/users`)
      .query({ search: 'admin-doctor', role: 'DOCTOR' })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.users.items).toHaveLength(1);
    expect(res.body.data.users.items[0].email).toBe('admin-doctor@example.com');
    expect(res.body.data.users.pagination.total).toBe(1);
  });

  it('paginates users', async () => {
    const res = await request(app)
      .get(`${base}/admin/users`)
      .query({ page: 1, limit: 2 })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.users.items).toHaveLength(2);
    expect(res.body.data.users.pagination.totalPages).toBe(2);
  });

  it('rejects invalid admin user query params', async () => {
    const res = await request(app)
      .get(`${base}/admin/users`)
      .query({ role: 'SUPERUSER' })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('lists audit log entries with the actor email', async () => {
    const res = await request(app)
      .get(`${base}/admin/audit-logs`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.logs.items.length).toBeGreaterThan(0);
    const adminLogin = res.body.data.logs.items.find(
      (row: { action: string; userEmail: string }) =>
        row.action === 'AUTH.LOGIN' && row.userEmail === 'admin-test@example.com',
    );
    expect(adminLogin).toBeDefined();
    expect(adminLogin.createdAt).toEqual(expect.any(String));
  });

  it('filters audit log entries by action', async () => {
    const res = await request(app)
      .get(`${base}/admin/audit-logs`)
      .query({ action: 'AUTH' })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.logs.items.length).toBeGreaterThan(0);
    for (const row of res.body.data.logs.items) {
      expect(row.action).toMatch(/^AUTH/);
    }
  });

  it('filters audit log entries by actor user', async () => {
    const res = await request(app)
      .get(`${base}/admin/audit-logs`)
      .query({ userId })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.logs.items.length).toBeGreaterThan(0);
    for (const row of res.body.data.logs.items) {
      expect(row.userId).toBe(userId);
    }
  });

  it('rejects invalid audit log query params', async () => {
    const res = await request(app)
      .get(`${base}/admin/audit-logs`)
      .query({ from: 'not-a-date' })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects role escalation on register', async () => {
    const res = await request(app).post(`${base}/auth/register`).send({
      email: 'escalate@example.com',
      password: 'Str0ngPass!',
      firstName: 'Esc',
      lastName: 'Alate',
      role: 'ADMIN',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects role escalation on profile update', async () => {
    const res = await request(app)
      .patch(`${base}/users/me`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ firstName: 'Changed', role: 'ADMIN' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
