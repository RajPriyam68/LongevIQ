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

describeIntegration('Doctor portal API (integration)', () => {
  const reportProcessor = new FakeReportProcessor();
  reportProcessor.findings = [
    {
      id: 'f1',
      reportId: 'r1',
      name: 'Glucose',
      value: '95',
      unit: 'mg/dL',
      referenceRange: '70-99',
      flag: 'NORMAL',
      confidence: 0.9,
      sortOrder: 0,
      createdAt: new Date(),
    },
  ];
  const app = createApp({ container: { reportProcessor } });
  const prisma = new PrismaClient();
  const base = `${env.API_PREFIX}/${env.API_VERSION}`;

  let patientToken = '';
  let doctorToken = '';
  let otherDoctorToken = '';
  let regularUserToken = '';
  let patientId = '';
  let grantCode = '';
  let connectionId = '';

  async function registerAndLogin(email: string, role: 'USER' | 'DOCTOR' | 'ADMIN' = 'USER') {
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
      // Promote before login so the access token embeds the role.
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

    patientToken = await registerAndLogin('doctor-patient@example.com');
    doctorToken = await registerAndLogin('doctor-a@example.com', 'DOCTOR');
    otherDoctorToken = await registerAndLogin('doctor-b@example.com', 'DOCTOR');
    regularUserToken = await registerAndLogin('regular-user@example.com');

    const me = await request(app)
      .get(`${base}/users/me`)
      .set('Authorization', `Bearer ${patientToken}`);
    patientId = me.body.data.user.id;

    await request(app)
      .post(`${base}/metrics`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ type: 'SLEEP_HOURS', value: 8 });
    await request(app)
      .post(`${base}/metrics`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ type: 'HEART_RATE', value: 70 });

    await request(app)
      .post(`${base}/reports`)
      .set('Authorization', `Bearer ${patientToken}`)
      .field('title', 'Annual bloodwork')
      .field('reportDate', '2026-08-01')
      .field('category', 'BLOODWORK')
      .attach('file', pdfBuffer, 'bloodwork.pdf');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('rejects care endpoints without authentication', async () => {
    await request(app).post(`${base}/care/grants`).expect(401);
    await request(app).get(`${base}/care/connections`).expect(401);
  });

  it('rejects doctor endpoints without authentication', async () => {
    await request(app).post(`${base}/doctor/connections`).send({ code: 'X' }).expect(401);
    await request(app).get(`${base}/doctor/connections`).expect(401);
  });

  it('forbids non-DOCTOR users from the doctor portal', async () => {
    await request(app)
      .post(`${base}/doctor/connections`)
      .set('Authorization', `Bearer ${regularUserToken}`)
      .send({ code: 'LV-AAAA-BBBB-CCCC' })
      .expect(403);
    await request(app)
      .get(`${base}/doctor/connections`)
      .set('Authorization', `Bearer ${regularUserToken}`)
      .expect(403);
  });

  it('lets a patient create a one-time share grant', async () => {
    const res = await request(app)
      .post(`${base}/care/grants`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(201);
    expect(res.body.data.grant.code).toMatch(/^LV-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    grantCode = res.body.data.grant.code;

    const stored = await prisma.patientAccessGrant.findMany({ where: { patientId } });
    expect(stored).toHaveLength(1);
    expect(stored[0]?.codeHash).not.toContain(grantCode);
    expect(stored[0]?.usedAt).toBeNull();
  });

  it('rejects an invalid code format with 400', async () => {
    const res = await request(app)
      .post(`${base}/doctor/connections`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ code: 'not-a-code' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an unknown code with a masked 409', async () => {
    const res = await request(app)
      .post(`${base}/doctor/connections`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ code: 'LV-ZZZZ-ZZZZ-ZZZZ' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('lets a doctor redeem the grant and connect to the patient', async () => {
    const res = await request(app)
      .post(`${base}/doctor/connections`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ code: grantCode });

    expect(res.status).toBe(201);
    expect(res.body.data.connection.patient.email).toBe('doctor-patient@example.com');
    connectionId = res.body.data.connection.id;

    const grant = await prisma.patientAccessGrant.findFirst({ where: { patientId } });
    expect(grant?.usedAt).not.toBeNull();
  });

  it('rejects reusing the same code', async () => {
    const res = await request(app)
      .post(`${base}/doctor/connections`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ code: grantCode });

    expect(res.status).toBe(409);
  });

  it('returns a connected doctor for the patient', async () => {
    const res = await request(app)
      .get(`${base}/care/connections`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.connections).toHaveLength(1);
    expect(res.body.data.connections[0].doctor.email).toBe('doctor-a@example.com');
  });

  it('lists the patient for the doctor', async () => {
    const res = await request(app)
      .get(`${base}/doctor/connections`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.connections).toHaveLength(1);
    expect(res.body.data.connections[0].patient.id).toBe(patientId);
  });

  it('returns the patient overview to the connected doctor', async () => {
    const res = await request(app)
      .get(`${base}/doctor/patients/${patientId}/overview`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(200);
    const sleep = res.body.data.overview.summary.find(
      (row: { type: string }) => row.type === 'SLEEP_HOURS',
    );
    expect(sleep.count).toBe(1);
    expect(sleep.latest.value).toBe(8);
  });

  it('returns the patient metrics to the connected doctor', async () => {
    const res = await request(app)
      .get(`${base}/doctor/patients/${patientId}/metrics`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.metrics.items).toHaveLength(2);
  });

  it('returns patient reports with findings (no raw file) to the connected doctor', async () => {
    const res = await request(app)
      .get(`${base}/doctor/patients/${patientId}/reports`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.reports.items).toHaveLength(1);
    const report = res.body.data.reports.items[0];
    expect(report.title).toBe('Annual bloodwork');
    expect(report.findings[0].name).toBe('Glucose');
    expect(report).not.toHaveProperty('storageKey');
    expect(report).not.toHaveProperty('parsedText');
  });

  it('returns patient analytics to the connected doctor', async () => {
    const res = await request(app)
      .get(`${base}/doctor/patients/${patientId}/analytics?days=30`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.analytics.score.overall).toBe(100);
    expect(res.body.data.analytics.summary.metrics).toHaveLength(8);
    expect(res.body.data.analytics.insights.items.length).toBeGreaterThan(0);
  });

  it('rejects analytics with an invalid days window', async () => {
    const res = await request(app)
      .get(`${base}/doctor/patients/${patientId}/analytics?days=999`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 to a doctor with no connection', async () => {
    await request(app)
      .get(`${base}/doctor/patients/${patientId}/overview`)
      .set('Authorization', `Bearer ${otherDoctorToken}`)
      .expect(404);
    await request(app)
      .get(`${base}/doctor/patients/${patientId}/metrics`)
      .set('Authorization', `Bearer ${otherDoctorToken}`)
      .expect(404);
  });

  it('lets the patient revoke access and the doctor immediately loses it', async () => {
    const res = await request(app)
      .delete(`${base}/care/connections/${connectionId}`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.revoked).toBe(true);

    await request(app)
      .get(`${base}/doctor/patients/${patientId}/overview`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .expect(404);

    const connections = await request(app)
      .get(`${base}/care/connections`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(connections.body.data.connections).toEqual([]);
  });

  it("returns 404 when revoking a connection that is not the patient's", async () => {
    const res = await request(app)
      .delete(`${base}/care/connections/does-not-exist`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(404);
  });

  it('lets a doctor reconnect and disconnect', async () => {
    const grant = await request(app)
      .post(`${base}/care/grants`)
      .set('Authorization', `Bearer ${patientToken}`);
    const code = grant.body.data.grant.code as string;

    const connect = await request(app)
      .post(`${base}/doctor/connections`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ code });
    expect(connect.status).toBe(201);

    const disconnect = await request(app)
      .delete(`${base}/doctor/connections/${patientId}`)
      .set('Authorization', `Bearer ${doctorToken}`);
    expect(disconnect.status).toBe(200);
    expect(disconnect.body.data.disconnected).toBe(true);

    const doctorList = await request(app)
      .get(`${base}/doctor/connections`)
      .set('Authorization', `Bearer ${doctorToken}`);
    expect(doctorList.body.data.connections).toEqual([]);
  });
});
