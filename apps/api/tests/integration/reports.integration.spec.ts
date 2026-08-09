import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { FakeReportProcessor } from '../fakes.js';

const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

const pdfBuffer = Buffer.concat([
  Buffer.from('%PDF-1.7\n'),
  Buffer.from('%\xe2\xe3\xcf\xd3\n'),
  Buffer.from('%%EOF\n'),
]);
const invalidBuffer = Buffer.from('this is not a report file');

describeIntegration('Reports API (integration)', () => {
  const app = createApp({ container: { reportProcessor: new FakeReportProcessor() } });
  const prisma = new PrismaClient();
  const base = `${env.API_PREFIX}/${env.API_VERSION}`;

  let tokenA = '';
  let tokenB = '';

  async function registerAndLogin(email: string) {
    const register = await request(app).post(`${base}/auth/register`).send({
      email,
      password: 'Str0ngPass!',
      firstName: 'Integ',
      lastName: 'Report',
    });
    const token = new URL(register.body.data.verificationUrl).searchParams.get('token')!;
    await request(app).post(`${base}/auth/verify-email`).send({ token });
    const login = await request(app)
      .post(`${base}/auth/login`)
      .send({ email, password: 'Str0ngPass!' });
    return login.body.data.accessToken as string;
  }

  function upload(pdf = true, overrides: Record<string, string> = {}) {
    let req = request(app)
      .post(`${base}/reports`)
      .set('Authorization', `Bearer ${tokenA}`)
      .field('title', overrides.title ?? 'Annual bloodwork')
      .field('reportDate', overrides.reportDate ?? '2026-08-01')
      .field('category', overrides.category ?? 'BLOODWORK')
      .field('source', overrides.source ?? 'Central Lab');
    const buffer = pdf ? pdfBuffer : invalidBuffer;
    return req.attach('file', buffer, overrides.fileName ?? (pdf ? 'bloodwork.pdf' : 'note.txt'));
  }

  beforeAll(async () => {
    await prisma.$transaction([
      prisma.auditLog.deleteMany(),
      prisma.emailVerificationToken.deleteMany(),
      prisma.refreshToken.deleteMany(),
      prisma.medicalReport.deleteMany(),
      prisma.healthMetric.deleteMany(),
      prisma.user.deleteMany(),
    ]);

    tokenA = await registerAndLogin('reports-a@example.com');
    tokenB = await registerAndLogin('reports-b@example.com');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('rejects reports without authentication', async () => {
    const res = await request(app)
      .post(`${base}/reports`)
      .field('title', 'No auth')
      .field('reportDate', '2026-08-01')
      .attach('file', pdfBuffer, 'a.pdf');
    expect(res.status).toBe(401);
  });

  it('uploads a PDF report with metadata', async () => {
    const res = await upload();
    expect(res.status).toBe(201);
    expect(res.body.data.report.title).toBe('Annual bloodwork');
    expect(res.body.data.report.category).toBe('BLOODWORK');
    expect(res.body.data.report.source).toBe('Central Lab');
    expect(res.body.data.report.status).toBe('PARSED');
    expect(res.body.data.report.mimeType).toBe('application/pdf');
    expect(res.body.data.report.fileSizeBytes).toBe(pdfBuffer.length);
    expect(res.body.data.report.fileName).toBe('bloodwork.pdf');
  });

  it('uploads a PNG report and uses the detected content type', async () => {
    const png = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.from('image data'),
    ]);
    const res = await request(app)
      .post(`${base}/reports`)
      .set('Authorization', `Bearer ${tokenA}`)
      .field('title', 'X-ray')
      .field('reportDate', '2026-08-02')
      .field('category', 'IMAGING')
      .attach('file', png, 'xray.png');
    expect(res.status).toBe(201);
    expect(res.body.data.report.mimeType).toBe('image/png');
  });

  it('rejects unsupported file types', async () => {
    const res = await upload(false);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects files over the configured size limit', async () => {
    const big = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(4096)]);
    const res = await request(app)
      .post(`${base}/reports`)
      .set('Authorization', `Bearer ${tokenA}`)
      .field('title', 'Big report')
      .field('reportDate', '2026-08-01')
      .attach('file', big, 'big.pdf');
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('lists, filters, and paginates reports', async () => {
    const list = await request(app)
      .get(`${base}/reports?category=BLOODWORK&limit=1`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(list.status).toBe(200);
    expect(list.body.data.pagination.total).toBe(1);
    expect(list.body.data.items).toHaveLength(1);
    expect(list.body.data.items[0].category).toBe('BLOODWORK');

    const all = await request(app)
      .get(`${base}/reports?limit=100`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(all.body.data.pagination.total).toBe(2);
  });

  it('gets, downloads, updates, and deletes an owned report', async () => {
    const created = await upload(true, { title: 'Editable' });
    const id = created.body.data.report.id;

    const detail = await request(app)
      .get(`${base}/reports/${id}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.report.title).toBe('Editable');
    expect(detail.body.data.report.status).toBe('PARSED');
    expect(detail.body.data.report.parsedText).toContain('GLUCOSE');
    expect(detail.body.data.report.parsedAt).toBeTruthy();
    expect(detail.body.data.report.findings).toHaveLength(0);

    const download = await request(app)
      .get(`${base}/reports/${id}/file`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(download.status).toBe(200);
    expect(download.headers['content-type']).toBe('application/pdf');
    expect(download.body.equals(pdfBuffer)).toBe(true);

    const updated = await request(app)
      .patch(`${base}/reports/${id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: 'Renamed', notes: null });
    expect(updated.status).toBe(200);
    expect(updated.body.data.report.title).toBe('Renamed');
    expect(updated.body.data.report.notes).toBeNull();

    const deleted = await request(app)
      .delete(`${base}/reports/${id}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(deleted.status).toBe(200);

    const gone = await request(app)
      .get(`${base}/reports/${id}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(gone.status).toBe(404);
  });

  it('isolates reports between users', async () => {
    const created = await upload(true, { title: 'Secret' });
    const id = created.body.data.report.id;

    const foreignList = await request(app)
      .get(`${base}/reports`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(foreignList.body.data.pagination.total).toBe(0);

    const foreignGet = await request(app)
      .get(`${base}/reports/${id}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(foreignGet.status).toBe(404);

    const foreignDownload = await request(app)
      .get(`${base}/reports/${id}/file`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(foreignDownload.status).toBe(404);

    const foreignDelete = await request(app)
      .delete(`${base}/reports/${id}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(foreignDelete.status).toBe(404);
  });

  it('requires metadata fields on upload', async () => {
    const res = await request(app)
      .post(`${base}/reports`)
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('file', pdfBuffer, 'a.pdf');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('surfaces processing failures as FAILED with the error message', async () => {
    const failing = new FakeReportProcessor();
    failing.error = new Error('Tesseract crashed');
    const failingApp = createApp({ container: { reportProcessor: failing } });

    const res = await request(failingApp)
      .post(`${base}/reports`)
      .set('Authorization', `Bearer ${tokenA}`)
      .field('title', 'Broken scan')
      .field('reportDate', '2026-08-01')
      .field('category', 'GENERAL')
      .attach('file', pdfBuffer, 'broken.pdf');
    expect(res.status).toBe(201);
    expect(res.body.data.report.status).toBe('FAILED');

    const detail = await request(failingApp)
      .get(`${base}/reports/${res.body.data.report.id}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.report.status).toBe('FAILED');
    expect(detail.body.data.report.processingError).toBe('Tesseract crashed');
    expect(detail.body.data.report.findings).toHaveLength(0);
  });
});
