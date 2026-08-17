import type { VoicePreference as VoicePreferenceModel } from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import type {
  UpsertVoicePreferenceInput,
  VoicePreferenceRecord,
  VoiceRepository,
} from './voice.repository.types.js';

export class PrismaVoiceRepository implements VoiceRepository {
  async findByUserId(userId: string): Promise<VoicePreferenceRecord | null> {
    const row = await prisma.voicePreference.findUnique({ where: { userId } });
    return row ? toRecord(row) : null;
  }

  async upsert(userId: string, data: UpsertVoicePreferenceInput): Promise<VoicePreferenceRecord> {
    const row = await prisma.voicePreference.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    return toRecord(row);
  }
}

function toRecord(row: VoicePreferenceModel): VoicePreferenceRecord {
  return {
    userId: row.userId,
    readAloud: row.readAloud,
    autoListen: row.autoListen,
    speechRate: row.speechRate,
    speechPitch: row.speechPitch,
    voiceLocale: row.voiceLocale,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
