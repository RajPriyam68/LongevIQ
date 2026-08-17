export interface VoicePreferenceRecord {
  userId: string;
  readAloud: boolean;
  autoListen: boolean;
  speechRate: number;
  speechPitch: number;
  voiceLocale: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertVoicePreferenceInput {
  readAloud: boolean;
  autoListen: boolean;
  speechRate: number;
  speechPitch: number;
  voiceLocale: string | null;
}

export interface VoiceRepository {
  findByUserId(userId: string): Promise<VoicePreferenceRecord | null>;
  upsert(userId: string, data: UpsertVoicePreferenceInput): Promise<VoicePreferenceRecord>;
}
