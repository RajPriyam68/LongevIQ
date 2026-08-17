import { describe, expect, it } from 'vitest';
import type { AuditSink } from '../src/modules/metrics/metrics.repository.types.js';
import { VoiceService } from '../src/modules/voice/voice.service.js';
import { FakeVoiceRepository } from './fakes.js';

const USER = 'usr_voice';
const OTHER = 'usr_other';

function makeService(input: { repository?: FakeVoiceRepository }) {
  const repository = input.repository ?? new FakeVoiceRepository();
  const audit: Array<{ action: string; metadata?: unknown }> = [];
  const auditSink: AuditSink = {
    recordAudit: (entry) => {
      audit.push({ action: entry.action, metadata: entry.metadata });
      return Promise.resolve();
    },
  };
  const service = new VoiceService(repository, auditSink);
  return { repository, service, audit };
}

describe('VoiceService.getPreferences', () => {
  it('returns the platform defaults when no row exists', async () => {
    const { service } = makeService({});
    const result = await service.getPreferences(USER);

    expect(result.preferences).toEqual({
      readAloud: true,
      autoListen: false,
      speechRate: 1,
      speechPitch: 1,
      voiceLocale: null,
    });
  });

  it('returns persisted preferences when a row exists', async () => {
    const repository = new FakeVoiceRepository();
    await repository.upsert(USER, {
      readAloud: false,
      autoListen: true,
      speechRate: 1.3,
      speechPitch: 1.1,
      voiceLocale: 'en-GB',
    });
    const { service } = makeService({ repository });

    const result = await service.getPreferences(USER);
    expect(result.preferences).toEqual({
      readAloud: false,
      autoListen: true,
      speechRate: 1.3,
      speechPitch: 1.1,
      voiceLocale: 'en-GB',
    });
  });

  it('returns defaults for a user who never saved preferences', async () => {
    const { repository, service } = makeService({});
    await service.updatePreferences(USER, { readAloud: false });

    const other = await service.getPreferences(OTHER);
    expect(other.preferences.readAloud).toBe(true);
    expect(repository.rows.has(OTHER)).toBe(false);
  });
});

describe('VoiceService.updatePreferences', () => {
  it('upserts a row and returns the merged preferences', async () => {
    const { repository, service } = makeService({});
    const result = await service.updatePreferences(USER, {
      readAloud: false,
      autoListen: true,
      speechRate: 1.5,
      speechPitch: 0.9,
      voiceLocale: 'es-ES',
    });

    expect(result.preferences).toEqual({
      readAloud: false,
      autoListen: true,
      speechRate: 1.5,
      speechPitch: 0.9,
      voiceLocale: 'es-ES',
    });
    expect(repository.rows.get(USER)?.speechRate).toBe(1.5);
  });

  it('merges partial updates with existing values', async () => {
    const { service } = makeService({});
    await service.updatePreferences(USER, { readAloud: false, speechRate: 1.2 });
    const result = await service.updatePreferences(USER, { autoListen: true });

    expect(result.preferences).toEqual({
      readAloud: false,
      autoListen: true,
      speechRate: 1.2,
      speechPitch: 1,
      voiceLocale: null,
    });
  });

  it('treats voiceLocale null as an explicit clear', async () => {
    const { service } = makeService({});
    await service.updatePreferences(USER, { voiceLocale: 'en-GB' });
    const result = await service.updatePreferences(USER, { voiceLocale: null });

    expect(result.preferences.voiceLocale).toBeNull();
  });

  it('audits the update with preference metadata only', async () => {
    const { audit, service } = makeService({});
    await service.updatePreferences(
      USER,
      { readAloud: false, speechRate: 1.4 },
      {
        ipAddress: '127.0.0.1',
        userAgent: 'vitest',
      },
    );

    const entry = audit.find((item) => item.action === 'DATA.VOICE_PREFERENCE_UPDATE');
    expect(entry).toBeDefined();
    expect(entry!.metadata).toEqual({
      readAloud: false,
      autoListen: false,
      speechRate: 1.4,
      speechPitch: 1,
      voiceLocale: null,
    });
  });
});

describe('VoiceService.getCapabilities', () => {
  it('advertises the browser speech engines and bounds', () => {
    const { service } = makeService({});
    const capabilities = service.getCapabilities();

    expect(capabilities.sttEngine).toBe('BROWSER_SPEECH_RECOGNITION');
    expect(capabilities.ttsEngine).toBe('BROWSER_SPEECH_SYNTHESIS');
    expect(capabilities.speechRate).toEqual({ min: 0.5, max: 2 });
    expect(capabilities.speechPitch).toEqual({ min: 0, max: 2 });
    expect(capabilities.maxSpeechChunkChars).toBeGreaterThan(0);
  });
});
