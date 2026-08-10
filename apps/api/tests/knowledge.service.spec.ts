import { beforeEach, describe, expect, it } from 'vitest';
import { KnowledgeService } from '../src/modules/knowledge/knowledge.service.js';
import { FakeKnowledgeRepository } from './fakes.js';

const ctx = { ipAddress: '127.0.0.1', userAgent: 'vitest' };
const ADMIN = 'usr_admin';
const USER = 'usr_user';

const baseArticle = {
  slug: 'understanding-blood-pressure',
  title: 'Understanding Blood Pressure',
  summary: 'How blood pressure is measured.',
  category: 'METRICS' as const,
  source: 'LongevIQ',
  status: 'DRAFT' as const,
  language: 'english',
  content: '## Systolic\n\nThe top number measures the force when the heart contracts.',
};

describe('KnowledgeService', () => {
  let repository: FakeKnowledgeRepository;
  let service: KnowledgeService;

  beforeEach(() => {
    repository = new FakeKnowledgeRepository();
    service = new KnowledgeService(
      repository as unknown as ConstructorParameters<typeof KnowledgeService>[0],
      repository as unknown as ConstructorParameters<typeof KnowledgeService>[1],
    );
  });

  it('creates a document with chunked content and audits the event', async () => {
    const document = await service.createDocument(
      ADMIN,
      'ADMIN',
      { ...baseArticle, status: 'PUBLISHED' },
      ctx,
    );
    expect(document.slug).toBe(baseArticle.slug);
    expect(document.status).toBe('PUBLISHED');
    expect(document.chunks).toHaveLength(1);
    expect(document.chunks[0]!.title).toBe('Systolic');
    expect(repository.auditCalls.some((a) => a.action === 'DATA.KNOWLEDGE_CREATE')).toBe(true);
  });

  it('rejects document creation for non-admins', async () => {
    await expect(service.createDocument(USER, 'USER', baseArticle, ctx)).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });
  });

  it('rejects a duplicate slug with a conflict', async () => {
    await service.createDocument(ADMIN, 'ADMIN', baseArticle, ctx);
    await expect(service.createDocument(ADMIN, 'ADMIN', baseArticle, ctx)).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT',
    });
  });

  it('updates metadata and re-chunks when content changes', async () => {
    const document = await service.createDocument(ADMIN, 'ADMIN', baseArticle, ctx);
    const updated = await service.updateDocument(ADMIN, 'ADMIN', document.id, {
      title: 'Blood Pressure 101',
      content: '## Intro\n\nNew content that replaces the old text.',
    });
    expect(updated.title).toBe('Blood Pressure 101');
    expect(updated.chunks).toHaveLength(1);
    expect(updated.chunks[0]!.content).toContain('New content');
    expect(repository.auditCalls.some((a) => a.action === 'DATA.KNOWLEDGE_UPDATE')).toBe(true);
  });

  it('deletes a document and audits the event', async () => {
    const document = await service.createDocument(ADMIN, 'ADMIN', baseArticle, ctx);
    await service.deleteDocument(ADMIN, 'ADMIN', document.id, ctx);
    await expect(service.getDocument('ADMIN', document.id)).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(repository.auditCalls.some((a) => a.action === 'DATA.KNOWLEDGE_DELETE')).toBe(true);
  });

  it('hides drafts from regular users', async () => {
    const draft = await service.createDocument(ADMIN, 'ADMIN', baseArticle, ctx);
    await expect(service.getDocument('USER', draft.id)).rejects.toMatchObject({
      statusCode: 404,
    });

    const published = await service.createDocument(ADMIN, 'ADMIN', {
      ...baseArticle,
      slug: 'published-article',
      status: 'PUBLISHED',
    });
    const detail = await service.getDocument('USER', published.id);
    expect(detail.slug).toBe('published-article');
  });

  it('only lists published documents for regular users', async () => {
    await service.createDocument(ADMIN, 'ADMIN', baseArticle, ctx);
    await service.createDocument(ADMIN, 'ADMIN', {
      ...baseArticle,
      slug: 'published-article',
      status: 'PUBLISHED',
    });

    const userView = await service.listDocuments('USER', { page: 1, limit: 10 });
    expect(userView.items).toHaveLength(1);
    expect(userView.items[0]!.slug).toBe('published-article');

    const adminView = await service.listDocuments('ADMIN', { page: 1, limit: 10 });
    expect(adminView.items).toHaveLength(2);
  });

  it('returns 404 for unknown documents', async () => {
    await expect(service.getDocument('USER', 'missing')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
