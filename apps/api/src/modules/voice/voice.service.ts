import type {
  UpdateVoicePreferencesInput,
  VoiceCapabilities,
  VoicePreferences,
  VoicePreferencesResult,
} from '@longeviq/shared';
import {
  VOICE_MAX_SPEECH_CHUNK_CHARS,
  VOICE_PREFERENCES_DEFAULTS,
  VOICE_SPEECH_PITCH_MAX,
  VOICE_SPEECH_PITCH_MIN,
  VOICE_SPEECH_RATE_MAX,
  VOICE_SPEECH_RATE_MIN,
} from '@longeviq/shared';
import type { AuditSink } from '../metrics/metrics.repository.types.js';
import type { VoicePreferenceRecord, VoiceRepository } from './voice.repository.types.js';

export interface RequestContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class VoiceService {
  constructor(
    private readonly repository: VoiceRepository,
    private readonly audit?: AuditSink,
  ) {}

  async getPreferences(userId: string): Promise<VoicePreferencesResult> {
    const row = await this.repository.findByUserId(userId);
    return { preferences: row ? serialize(row) : { ...VOICE_PREFERENCES_DEFAULTS } };
  }

  async updatePreferences(
    userId: string,
    input: UpdateVoicePreferencesInput,
    ctx: RequestContext = {},
  ): Promise<VoicePreferencesResult> {
    const existing = await this.repository.findByUserId(userId);
    const merged = {
      readAloud: input.readAloud ?? existing?.readAloud ?? VOICE_PREFERENCES_DEFAULTS.readAloud,
      autoListen: input.autoListen ?? existing?.autoListen ?? VOICE_PREFERENCES_DEFAULTS.autoListen,
      speechRate: input.speechRate ?? existing?.speechRate ?? VOICE_PREFERENCES_DEFAULTS.speechRate,
      speechPitch:
        input.speechPitch ?? existing?.speechPitch ?? VOICE_PREFERENCES_DEFAULTS.speechPitch,
      voiceLocale:
        input.voiceLocale === undefined
          ? (existing?.voiceLocale ?? VOICE_PREFERENCES_DEFAULTS.voiceLocale)
          : input.voiceLocale,
    };

    const row = await this.repository.upsert(userId, merged);

    await this.audit?.recordAudit({
      userId,
      action: 'DATA.VOICE_PREFERENCE_UPDATE',
      entity: 'VoicePreference',
      entityId: userId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: {
        readAloud: row.readAloud,
        autoListen: row.autoListen,
        speechRate: row.speechRate,
        speechPitch: row.speechPitch,
        voiceLocale: row.voiceLocale,
      },
    });

    return { preferences: serialize(row) };
  }

  getCapabilities(): VoiceCapabilities {
    return {
      sttEngine: 'BROWSER_SPEECH_RECOGNITION',
      ttsEngine: 'BROWSER_SPEECH_SYNTHESIS',
      speechRate: { min: VOICE_SPEECH_RATE_MIN, max: VOICE_SPEECH_RATE_MAX },
      speechPitch: { min: VOICE_SPEECH_PITCH_MIN, max: VOICE_SPEECH_PITCH_MAX },
      maxSpeechChunkChars: VOICE_MAX_SPEECH_CHUNK_CHARS,
    };
  }
}

function serialize(row: VoicePreferenceRecord): VoicePreferences {
  return {
    readAloud: row.readAloud,
    autoListen: row.autoListen,
    speechRate: row.speechRate,
    speechPitch: row.speechPitch,
    voiceLocale: row.voiceLocale,
  };
}
