import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';

const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

describeIntegration('Auth API (integration)', () => {
  const app = createApp();
  const prisma = new PrismaClient();
  const base = `${env.API_PREFIX}/${env.API_VERSION}`;

  beforeAll(async () => {
    await prisma.$transaction([
      prisma.auditLog.deleteMany(),
      prisma.emailVerificationToken.deleteMany(),
      prisma.refreshToken.deleteMany(),
      prisma.user.deleteMany(),
    ]);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('health check responds ok', async () => {
    const res = await request(app).get(`${base}/health`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('rejects unauthenticated /users/me', async () => {
    const res = await request(app).get(`${base}/users/me`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('registers, verifies email, and logs in', async () => {
    const email = `user-${Date.now()}@example.com`;

    const register = await request(app)
      .post(`${base}/auth/register`)
      .send({ email, password: 'Str0ngPass!', firstName: 'Integ', lastName: 'Test' });
    expect(register.status).toBe(201);
    expect(register.body.data.user.email).toBe(email);
    expect(register.body.data.user.passwordHash).toBeUndefined();
    expect(register.body.data.verificationUrl).toContain('/auth/verify-email?token=');

    const loginBeforeVerify = await request(app)
      .post(`${base}/auth/login`)
      .send({ email, password: 'Str0ngPass!' });
    expect(loginBeforeVerify.status).toBe(403);
    expect(loginBeforeVerify.body.error.code).toBe('EMAIL_NOT_VERIFIED');

    const token = new URL(register.body.data.verificationUrl).searchParams.get('token')!;
    const verify = await request(app).post(`${base}/auth/verify-email`).send({ token });
    expect(verify.status).toBe(200);
    expect(verify.body.data.verified).toBe(true);

    const login = await request(app)
      .post(`${base}/auth/login`)
      .send({ email, password: 'Str0ngPass!' });
    expect(login.status).toBe(200);
    expect(login.body.data.accessToken).toBeTruthy();
    expect(login.body.data.user.email).toBe(email);

    const me = await request(app)
      .get(`${base}/users/me`)
      .set('Authorization', `Bearer ${login.body.data.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe(email);

    const logout = await request(app)
      .post(`${base}/auth/logout`)
      .set('Cookie', [`lq_refresh=${login.headers['set-cookie']?.[0].split('=')[1]}`]);
    expect(logout.status).toBe(200);
  });

  it('returns validation errors for malformed payloads', async () => {
    const res = await request(app)
      .post(`${base}/auth/register`)
      .send({ email: 'not-an-email', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects duplicate registration', async () => {
    const email = `dup-${Date.now()}@example.com`;
    const body = { email, password: 'Str0ngPass!', firstName: 'Dup', lastName: 'Test' };

    const first = await request(app).post(`${base}/auth/register`).send(body);
    expect(first.status).toBe(201);

    const second = await request(app).post(`${base}/auth/register`).send(body);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('CONFLICT');
  });
});
