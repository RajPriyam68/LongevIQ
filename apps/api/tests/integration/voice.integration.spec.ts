import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';

const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

describeIntegration('Voice API (integration)', () => {
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
      lastName: 'Voice',
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
      prisma.voicePreference.deleteMany(),
      prisma.user.deleteMany(),
    ]);

    userToken = await registerAndLogin('voice-user@example.com');
    user2Token = await registerAndLogin('voice-user2@example.com');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('requires authentication', async () => {
    const get = await request(app).get(`${base}/voice/preferences`);
    expect(get.status).toBe(401);

    const put = await request(app).put(`${base}/voice/preferences`).send({ readAloud: false });
    expect(put.status).toBe(401);
  });

  it('returns default preferences for a new user', async () => {
    const res = await request(app)
      .get(`${base}/voice/preferences`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.preferences).toEqual({
      readAloud: true,
      autoListen: false,
      speechRate: 1,
      speechPitch: 1,
      voiceLocale: null,
    });
  });

  it('rejects out-of-range speech rate', async () => {
    const res = await request(app)
      .put(`${base}/voice/preferences`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ speechRate: 5 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('updates and persists preferences', async () => {
    const res = await request(app)
      .put(`${base}/voice/preferences`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ readAloud: false, autoListen: true, speechRate: 1.3, voiceLocale: 'en-GB' });

    expect(res.status).toBe(200);
    expect(res.body.data.preferences).toEqual({
      readAloud: false,
      autoListen: true,
      speechRate: 1.3,
      speechPitch: 1,
      voiceLocale: 'en-GB',
    });

    const stored = await prisma.voicePreference.findUnique({
      where: {
        userId: (await prisma.user.findUnique({ where: { email: 'voice-user@example.com' } }))!.id,
      },
    });
    expect(stored?.readAloud).toBe(false);
    expect(stored?.speechRate).toBe(1.3);

    const get = await request(app)
      .get(`${base}/voice/preferences`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(get.body.data.preferences.voiceLocale).toBe('en-GB');
  });

  it('keeps each user preferences isolated', async () => {
    const defaults = await request(app)
      .get(`${base}/voice/preferences`)
      .set('Authorization', `Bearer ${user2Token}`);
    expect(defaults.body.data.preferences.readAloud).toBe(true);

    await request(app)
      .put(`${base}/voice/preferences`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ readAloud: true, voiceLocale: 'fr-FR' });

    const first = await request(app)
      .get(`${base}/voice/preferences`)
      .set('Authorization', `Bearer ${userToken}`);
    const second = await request(app)
      .get(`${base}/voice/preferences`)
      .set('Authorization', `Bearer ${user2Token}`);
    expect(first.body.data.preferences.readAloud).toBe(false);
    expect(first.body.data.preferences.voiceLocale).toBe('en-GB');
    expect(second.body.data.preferences.readAloud).toBe(true);
    expect(second.body.data.preferences.voiceLocale).toBe('fr-FR');
  });

  it('advertises the speech capabilities', async () => {
    const res = await request(app)
      .get(`${base}/voice/config`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.capabilities).toEqual({
      sttEngine: 'BROWSER_SPEECH_RECOGNITION',
      ttsEngine: 'BROWSER_SPEECH_SYNTHESIS',
      speechRate: { min: 0.5, max: 2 },
      speechPitch: { min: 0, max: 2 },
      maxSpeechChunkChars: expect.any(Number),
    });
  });

  it('audits preference updates', async () => {
    const res = await request(app)
      .put(`${base}/voice/preferences`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ autoListen: true });

    expect(res.status).toBe(200);
    const audit = await prisma.auditLog.findFirst({
      where: { action: 'DATA.VOICE_PREFERENCE_UPDATE' },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit).not.toBeNull();
    expect(audit?.metadata).toMatchObject({ readAloud: false, autoListen: true });
  });
});
