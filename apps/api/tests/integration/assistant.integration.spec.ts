import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { LlmNotConfiguredError } from '../../src/modules/assistant/llm/llm-client.js';
import type { LlmClient } from '../../src/modules/assistant/llm/llm-client.js';
import { FakeLlmClient } from '../fakes.js';

const describeIntegration = process.env.DATABASE_URL ? describe : describe.skip;

describeIntegration('Assistant API (integration)', () => {
  const defaultLlm = new FakeLlmClient();
  const app = createApp({ container: { llmClient: defaultLlm as unknown as LlmClient } });
  const prisma = new PrismaClient();
  const base = `${env.API_PREFIX}/${env.API_VERSION}`;

  let userToken = '';
  let user2Token = '';
  let adminToken = '';

  async function registerAndLogin(email: string, password = 'Str0ngPass!') {
    const register = await request(app).post(`${base}/auth/register`).send({
      email,
      password,
      firstName: 'Integ',
      lastName: 'Chat',
    });
    const token = new URL(register.body.data.verificationUrl).searchParams.get('token')!;
    await request(app).post(`${base}/auth/verify-email`).send({ token });
    const login = await request(app).post(`${base}/auth/login`).send({ email, password });
    return login.body.data.accessToken as string;
  }

  async function publishKnowledgeDocument() {
    const res = await request(app)
      .post(`${base}/knowledge`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        slug: 'assistant-glucose-guide',
        title: 'Glucose Monitoring Guide',
        summary: 'Plain-language glucose guidance.',
        category: 'LABS',
        status: 'PUBLISHED',
        language: 'english',
        content:
          '## Fasting glucose\n\nA fasting glucose below 100 mg/dL is considered normal.\n\n' +
          '## HbA1c\n\nAn HbA1c below 5.7 percent is considered normal.',
      });
    return res.body.data.document;
  }

  beforeAll(async () => {
    await prisma.$transaction([
      prisma.auditLog.deleteMany(),
      prisma.emailVerificationToken.deleteMany(),
      prisma.refreshToken.deleteMany(),
      prisma.chatMessage.deleteMany(),
      prisma.chatSession.deleteMany(),
      prisma.knowledgeChunk.deleteMany(),
      prisma.knowledgeDocument.deleteMany(),
      prisma.medicalReport.deleteMany(),
      prisma.healthMetric.deleteMany(),
      prisma.user.deleteMany(),
    ]);

    userToken = await registerAndLogin('assistant-user@example.com');
    user2Token = await registerAndLogin('assistant-user2@example.com');

    const adminEmail = 'assistant-admin@example.com';
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
    await prisma.user.update({ where: { email: adminEmail }, data: { role: 'ADMIN' } });
    const login = await request(app)
      .post(`${base}/auth/login`)
      .send({ email: adminEmail, password: adminPassword });
    adminToken = login.body.data.accessToken as string;

    await publishKnowledgeDocument();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('requires authentication for chat', async () => {
    const res = await request(app).post(`${base}/assistant/chat`).send({ message: 'Hi' });
    expect(res.status).toBe(401);
  });

  it('validates the request body', async () => {
    const res = await request(app)
      .post(`${base}/assistant/chat`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ message: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('answers a question with retrieval sources and persists both messages', async () => {
    const res = await request(app)
      .post(`${base}/assistant/chat`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ message: 'What is a normal fasting glucose?' });

    expect(res.status).toBe(200);
    const body = res.body.data;
    expect(body.providerConfigured).toBe(true);
    expect(body.disclaimer).toContain('educational purposes only');
    expect(body.session.title).toBe('What is a normal fasting glucose?');
    expect(body.session.messages).toHaveLength(2);
    expect(body.session.messages[0]!.role).toBe('USER');
    expect(body.session.messages[1]!.role).toBe('ASSISTANT');
    expect(body.session.messages[1]!.sources).toHaveLength(1);
    expect(body.session.messages[1]!.sources[0]!.documentTitle).toBe('Glucose Monitoring Guide');

    const stored = await prisma.chatMessage.findMany({
      where: { sessionId: body.session.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(stored).toHaveLength(2);
    expect(stored[1]!.content).toBe(body.session.messages[1]!.content);
  });

  it('reuses the session for follow-ups and includes history in the prompt', async () => {
    const first = await request(app)
      .post(`${base}/assistant/chat`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ message: 'Tell me about HbA1c' });
    const sessionId = first.body.data.session.id;

    const second = await request(app)
      .post(`${base}/assistant/chat`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ sessionId, message: 'What does an elevated value mean?' });

    expect(second.body.data.session.id).toBe(sessionId);
    expect(second.body.data.session.messages).toHaveLength(4);
  });

  it('lists the users sessions with message counts', async () => {
    const res = await request(app)
      .get(`${base}/assistant/sessions`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThan(0);
    expect(res.body.data.items[0]!.messageCount).toBeGreaterThan(0);
  });

  it('returns a session detail with chronological messages', async () => {
    const list = await request(app)
      .get(`${base}/assistant/sessions`)
      .set('Authorization', `Bearer ${userToken}`);
    const sessionId = list.body.data.items[0]!.id;

    const res = await request(app)
      .get(`${base}/assistant/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.session.messages[0]!.role).toBe('USER');
  });

  it('hides other users sessions with 404', async () => {
    const list = await request(app)
      .get(`${base}/assistant/sessions`)
      .set('Authorization', `Bearer ${userToken}`);
    const sessionId = list.body.data.items[0]!.id;

    const get = await request(app)
      .get(`${base}/assistant/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${user2Token}`);
    expect(get.status).toBe(404);

    const del = await request(app)
      .delete(`${base}/assistant/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${user2Token}`);
    expect(del.status).toBe(404);
  });

  it('deletes a session owned by the user', async () => {
    const res = await request(app)
      .post(`${base}/assistant/chat`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ message: 'A disposable conversation' });
    const sessionId = res.body.data.session.id;

    const del = await request(app)
      .delete(`${base}/assistant/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${user2Token}`);
    expect(del.status).toBe(200);
    expect(del.body.data.deleted).toBe(true);

    const get = await request(app)
      .get(`${base}/assistant/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${user2Token}`);
    expect(get.status).toBe(404);
  });

  it('degrades gracefully when no LLM key is configured', async () => {
    const notConfigured: LlmClient = {
      chat: async () => {
        throw new LlmNotConfiguredError();
      },
    };
    const offlineApp = createApp({ container: { llmClient: notConfigured } });

    const res = await request(offlineApp)
      .post(`${base}/assistant/chat`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ message: 'Should I worry about my glucose?' });

    expect(res.status).toBe(200);
    expect(res.body.data.providerConfigured).toBe(false);
    const assistant = res.body.data.session.messages[1]!;
    expect(assistant.isError).toBe(true);
    expect(assistant.content).toContain('not configured');

    const stored = await prisma.chatMessage.findMany({
      where: { id: assistant.id },
    });
    expect(stored[0]!.isError).toBe(true);
  });

  it('recovers from an upstream LLM failure with an error notice', async () => {
    const failing: LlmClient = {
      chat: async () => {
        const error = new Error('network down');
        error.name = 'LlmUpstreamError';
        throw error;
      },
    };
    const offlineApp = createApp({ container: { llmClient: failing } });

    const res = await request(offlineApp)
      .post(`${base}/assistant/chat`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ message: 'Tell me about sleep hygiene' });

    expect(res.status).toBe(200);
    expect(res.body.data.providerConfigured).toBe(true);
    const assistant = res.body.data.session.messages[1]!;
    expect(assistant.isError).toBe(true);
    expect(assistant.content).toContain("couldn't reach the AI provider");
  });

  it('still works end to end with the real fake LLM client wired via container', async () => {
    const fake = new FakeLlmClient();
    const wiredApp = createApp({ container: { llmClient: fake as unknown as LlmClient } });

    const res = await request(wiredApp)
      .post(`${base}/assistant/chat`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ message: 'What are the signs of good sleep?' });

    expect(res.status).toBe(200);
    expect(res.body.data.session.messages[1]!.content).toBe(fake.reply);
    expect(fake.calls).toBe(1);
  });

  it('returns an empty session list after all sessions are deleted', async () => {
    await prisma.chatSession.deleteMany({
      where: { user: { email: 'assistant-user2@example.com' } },
    });
    const res = await request(app)
      .get(`${base}/assistant/sessions`)
      .set('Authorization', `Bearer ${user2Token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([]);
  });
});
