import { beforeEach, describe, expect, it } from 'vitest';
import { AssistantService } from '../src/modules/assistant/assistant.service.js';
import type { AssistantRetriever } from '../src/modules/assistant/assistant.service.js';
import {
  LlmNotConfiguredError,
  LlmUpstreamError,
} from '../src/modules/assistant/llm/llm-client.js';
import { FakeAssistantRepository, FakeLlmClient, makeKnowledgeSearchResult } from './fakes.js';

const USER = 'usr_user';
const OTHER = 'usr_other';

function makeService(input: {
  repository?: FakeAssistantRepository;
  llm?: FakeLlmClient;
  retriever?: AssistantRetriever;
  config?: { retrievalTopK?: number; contextCharLimit?: number; historyMessages?: number };
}) {
  const repository = input.repository ?? new FakeAssistantRepository();
  const llm = input.llm ?? new FakeLlmClient();
  const retriever: AssistantRetriever =
    input.retriever ??
    ({
      search: async () => [makeKnowledgeSearchResult({ documentTitle: 'Glucose Guide' })],
    } as AssistantRetriever);
  return {
    repository,
    llm,
    service: new AssistantService(
      repository as unknown as ConstructorParameters<typeof AssistantService>[0],
      retriever,
      llm as unknown as ConstructorParameters<typeof AssistantService>[2],
      {
        retrievalTopK: input.config?.retrievalTopK ?? 4,
        contextCharLimit: input.config?.contextCharLimit ?? 12_000,
        historyMessages: input.config?.historyMessages ?? 12,
      },
      repository as unknown as ConstructorParameters<typeof AssistantService>[4],
    ),
  };
}

describe('AssistantService.chat', () => {
  it('creates a session titled from the first message and persists both messages', async () => {
    const { repository, llm, service } = makeService({});
    const result = await service.chat(USER, { message: 'What is a good fasting glucose?' });

    expect(result.providerConfigured).toBe(true);
    expect(result.disclaimer).toContain('educational purposes only');
    expect(result.session.title).toBe('What is a good fasting glucose?');
    expect(result.session.messages).toHaveLength(2);
    expect(result.session.messages[0]!.role).toBe('USER');
    expect(result.session.messages[1]!.role).toBe('ASSISTANT');
    expect(result.session.messages[1]!.content).toBe(llm.reply);
    expect(llm.calls).toBe(1);
    expect(repository.auditCalls.some((a) => a.action === 'DATA.ASSISTANT_CHAT')).toBe(true);
  });

  it('reuses an existing session when sessionId is provided', async () => {
    const { repository, service } = makeService({});
    const first = await service.chat(USER, { message: 'Hello there, how are you today?' });
    const second = await service.chat(USER, {
      sessionId: first.session.id,
      message: 'What about sleep?',
    });

    expect(second.session.id).toBe(first.session.id);
    expect(second.session.messages).toHaveLength(4);
    expect(repository.sessions.size).toBe(1);
  });

  it('rejects chat against another users session with 404', async () => {
    const { service } = makeService({});
    const first = await service.chat(USER, { message: 'First message' });
    await expect(
      service.chat(OTHER, { sessionId: first.session.id, message: 'sneak in' }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  it('sends retrieved context to the LLM and stores the sources', async () => {
    const { llm, service } = makeService({});
    const result = await service.chat(USER, { message: 'fasting glucose' });

    const prompt = llm.prompts[0]!;
    expect(prompt[0]!.role).toBe('system');
    expect(prompt[prompt.length - 1]!.content).toContain('<knowledge>');
    expect(prompt[prompt.length - 1]!.content).toContain('Glucose Guide');

    const assistant = result.session.messages[1]!;
    expect(assistant.sources).toHaveLength(1);
    expect(assistant.sources![0]!.documentTitle).toBe('Glucose Guide');
  });

  it('feeds prior conversation history to the LLM but not the current question twice', async () => {
    const { llm, service } = makeService({});
    const first = await service.chat(USER, { message: 'First question' });
    llm.prompts = [];
    await service.chat(USER, { sessionId: first.session.id, message: 'Second question' });

    const prompt = llm.prompts[0]!;
    expect(prompt.some((m) => m.content === 'First question')).toBe(true);
    expect(prompt[prompt.length - 1]!.content).toContain('Question: Second question');
    expect(prompt.filter((m) => m.content.includes('Second question'))).toHaveLength(1);
  });

  it('degrades gracefully when the LLM provider is not configured', async () => {
    const llm = new FakeLlmClient();
    llm.error = new LlmNotConfiguredError();
    const { service } = makeService({ llm });

    const result = await service.chat(USER, { message: 'Any health question' });

    expect(result.providerConfigured).toBe(false);
    const assistant = result.session.messages[1]!;
    expect(assistant.isError).toBe(true);
    expect(assistant.content).toContain('not configured');
    expect(assistant.sources).toBeNull();
  });

  it('returns an error notice when the upstream call fails', async () => {
    const llm = new FakeLlmClient();
    llm.error = new LlmUpstreamError('HTTP 429');
    const { service } = makeService({ llm });

    const result = await service.chat(USER, { message: 'Any health question' });

    expect(result.providerConfigured).toBe(true);
    const assistant = result.session.messages[1]!;
    expect(assistant.isError).toBe(true);
    expect(assistant.content).toContain("couldn't reach the AI provider");
  });

  it('truncates an oversized first message when building the session title', async () => {
    const { service } = makeService({});
    const long = 'a'.repeat(200);
    const result = await service.chat(USER, { message: long });
    expect(result.session.title.length).toBeLessThanOrEqual(50);
  });

  it('attributes voice-dictated messages in the audit metadata', async () => {
    const { repository, service } = makeService({});
    await service.chat(USER, { message: 'Read my glucose levels', inputMethod: 'VOICE' });

    const chatAudit = repository.auditCalls.find((entry) => entry.action === 'DATA.ASSISTANT_CHAT');
    expect(chatAudit).toBeDefined();
    const metadata = chatAudit?.metadata as { inputMethod?: string };
    expect(metadata.inputMethod).toBe('VOICE');
  });

  it('defaults the audit input method to TEXT when not provided', async () => {
    const { repository, service } = makeService({});
    await service.chat(USER, { message: 'A typed question' });

    const chatAudit = repository.auditCalls.find((entry) => entry.action === 'DATA.ASSISTANT_CHAT');
    const metadata = chatAudit?.metadata as { inputMethod?: string };
    expect(metadata.inputMethod).toBe('TEXT');
  });
});

describe('AssistantService sessions', () => {
  it('lists sessions with message counts ordered by most recent activity', async () => {
    const { service } = makeService({});
    await service.chat(USER, { message: 'First conversation' });
    await service.chat(USER, { message: 'Second conversation' });

    const result = await service.listSessions(USER, { page: 1, limit: 10 });
    expect(result.items).toHaveLength(2);
    expect(result.items[0]!.title).toBe('Second conversation');
    expect(result.items[0]!.messageCount).toBe(2);
    expect(result.items[1]!.messageCount).toBe(2);
    expect(result.pagination.total).toBe(2);
  });

  it('paginates sessions', async () => {
    const { service } = makeService({});
    for (let i = 0; i < 5; i += 1) {
      await service.chat(USER, { message: `Question number ${i}` });
    }
    const result = await service.listSessions(USER, { page: 1, limit: 2 });
    expect(result.items).toHaveLength(2);
    expect(result.pagination.totalPages).toBe(3);
  });

  it('returns a session detail with chronological messages', async () => {
    const { service } = makeService({});
    const chat = await service.chat(USER, { message: 'Message one' });
    const detail = await service.getSession(USER, chat.session.id);

    expect(detail.messages[0]!.content).toBe('Message one');
    expect(detail.messages[1]!.role).toBe('ASSISTANT');
  });

  it('hides other users sessions with 404', async () => {
    const { service } = makeService({});
    const chat = await service.chat(USER, { message: 'Mine' });
    await expect(service.getSession(OTHER, chat.session.id)).rejects.toMatchObject({
      statusCode: 404,
    });
    await expect(service.deleteSession(OTHER, chat.session.id)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('deletes a session and its messages', async () => {
    const { repository, service } = makeService({});
    const chat = await service.chat(USER, { message: 'Delete me' });

    await service.deleteSession(USER, chat.session.id);

    expect(repository.sessions.size).toBe(0);
    expect(repository.messages.size).toBe(0);
    expect(repository.auditCalls.some((a) => a.action === 'DATA.ASSISTANT_SESSION_DELETE')).toBe(
      true,
    );
  });
});
