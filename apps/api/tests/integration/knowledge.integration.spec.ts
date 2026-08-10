import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';

const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

describeIntegration('Knowledge API (integration)', () => {
  const app = createApp();
  const prisma = new PrismaClient();
  const base = `${env.API_PREFIX}/${env.API_VERSION}`;

  let userToken = '';
  let adminToken = '';

  async function registerAndLogin(email: string, password = 'Str0ngPass!') {
    const register = await request(app).post(`${base}/auth/register`).send({
      email,
      password,
      firstName: 'Integ',
      lastName: 'Knowledge',
    });
    const token = new URL(register.body.data.verificationUrl).searchParams.get('token')!;
    await request(app).post(`${base}/auth/verify-email`).send({ token });
    const login = await request(app).post(`${base}/auth/login`).send({ email, password });
    return login.body.data.accessToken as string;
  }

  const createPayload = {
    slug: 'test-glucose-guide',
    title: 'Glucose Monitoring Guide',
    summary: 'A short guide to interpreting glucose readings.',
    category: 'LABS',
    source: 'Integ Test Lab',
    status: 'DRAFT',
    language: 'english',
    content:
      '## Fasting glucose\n\nA fasting glucose below 100 mg/dL is normal.\n\n## HbA1c\n\nHbA1c below 5.7 percent is normal.',
  };

  beforeAll(async () => {
    await prisma.$transaction([
      prisma.auditLog.deleteMany(),
      prisma.emailVerificationToken.deleteMany(),
      prisma.refreshToken.deleteMany(),
      prisma.knowledgeChunk.deleteMany(),
      prisma.knowledgeDocument.deleteMany(),
      prisma.medicalReport.deleteMany(),
      prisma.healthMetric.deleteMany(),
      prisma.user.deleteMany(),
    ]);

    userToken = await registerAndLogin('knowledge-user@example.com');

    const adminEmail = 'knowledge-admin@example.com';
    const adminPassword = 'Str0ngPass!';
    const register = await request(app).post(`${base}/auth/register`).send({
      email: adminEmail,
      password: adminPassword,
      firstName: 'Integ',
      lastName: 'Admin',
    });
    const verificationToken = new URL(register.body.data.verificationUrl).searchParams.get(
      'token',
    )!;
    await request(app).post(`${base}/auth/verify-email`).send({ token: verificationToken });
    // Promote before login so the access token embeds the ADMIN role.
    await prisma.user.update({ where: { email: adminEmail }, data: { role: 'ADMIN' } });
    const login = await request(app)
      .post(`${base}/auth/login`)
      .send({ email: adminEmail, password: adminPassword });
    adminToken = login.body.data.accessToken as string;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('requires authentication for search', async () => {
    const res = await request(app).get(`${base}/knowledge/search?q=glucose`);
    expect(res.status).toBe(401);
  });

  it('returns an empty search before anything is published', async () => {
    const res = await request(app)
      .get(`${base}/knowledge/search?q=glucose`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.results).toEqual([]);
  });

  it('forbids non-admins from creating documents', async () => {
    const res = await request(app)
      .post(`${base}/knowledge`)
      .set('Authorization', `Bearer ${userToken}`)
      .send(createPayload);
    expect(res.status).toBe(403);
  });

  it('lets an admin create a draft document with chunks', async () => {
    const res = await request(app)
      .post(`${base}/knowledge`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(createPayload);
    expect(res.status).toBe(201);
    expect(res.body.data.document.status).toBe('DRAFT');
    expect(res.body.data.document.chunks).toHaveLength(2);
    expect(res.body.data.document.chunks[0]!.title).toBe('Fasting glucose');
    expect(res.body.data.document.chunks[1]!.title).toBe('HbA1c');
  });

  it('hides drafts from regular users in list and search', async () => {
    const list = await request(app)
      .get(`${base}/knowledge`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.items).toHaveLength(0);

    const search = await request(app)
      .get(`${base}/knowledge/search?q=glucose`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(search.body.data.results).toEqual([]);
  });

  it('rejects a duplicate slug with a conflict', async () => {
    const res = await request(app)
      .post(`${base}/knowledge`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(createPayload);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('publishes the document via admin update', async () => {
    const list = await request(app)
      .get(`${base}/knowledge?status=DRAFT`)
      .set('Authorization', `Bearer ${adminToken}`);
    const id = list.body.data.items[0]!.id;

    const res = await request(app)
      .patch(`${base}/knowledge/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'PUBLISHED' });
    expect(res.status).toBe(200);
    expect(res.body.data.document.status).toBe('PUBLISHED');
  });

  it('finds the published document via full-text search', async () => {
    const res = await request(app)
      .get(`${base}/knowledge/search?q=HbA1c`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.results.length).toBeGreaterThan(0);
    const hit = res.body.data.results.find((r: { slug: string }) => r.slug === createPayload.slug);
    expect(hit).toBeTruthy();
    expect(hit.snippet).toContain('<mark>');
    expect(typeof hit.score).toBe('number');
  });

  it('filters search results by category', async () => {
    const res = await request(app)
      .get(`${base}/knowledge/search?q=glucose&category=NUTRITION`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.results).toEqual([]);
  });

  it('returns the document detail with ordered chunks', async () => {
    const search = await request(app)
      .get(`${base}/knowledge/search?q=HbA1c`)
      .set('Authorization', `Bearer ${userToken}`);
    const documentId = search.body.data.results[0]!.documentId;

    const res = await request(app)
      .get(`${base}/knowledge/${documentId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.document.chunks[0]!.chunkIndex).toBe(0);
    expect(res.body.data.document.chunks[1]!.chunkIndex).toBe(1);
  });

  it('forbids non-admins from deleting documents', async () => {
    const search = await request(app)
      .get(`${base}/knowledge/search?q=HbA1c`)
      .set('Authorization', `Bearer ${userToken}`);
    const documentId = search.body.data.results[0]!.documentId;

    const res = await request(app)
      .delete(`${base}/knowledge/${documentId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  it('lets an admin delete a document', async () => {
    const search = await request(app)
      .get(`${base}/knowledge/search?q=HbA1c`)
      .set('Authorization', `Bearer ${userToken}`);
    const documentId = search.body.data.results[0]!.documentId;

    const res = await request(app)
      .delete(`${base}/knowledge/${documentId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBe(true);

    const after = await request(app)
      .get(`${base}/knowledge/search?q=HbA1c`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(after.body.data.results).toEqual([]);
  });
});
