import { z } from 'zod';
import {
  VOICE_SPEECH_PITCH_MAX,
  VOICE_SPEECH_PITCH_MIN,
  VOICE_SPEECH_RATE_MAX,
  VOICE_SPEECH_RATE_MIN,
} from '../types/voice.js';

export const updateVoicePreferencesSchema = z
  .object({
    readAloud: z.boolean().optional(),
    autoListen: z.boolean().optional(),
    speechRate: z
      .number()
      .min(VOICE_SPEECH_RATE_MIN, `Speech rate must be at least ${VOICE_SPEECH_RATE_MIN}.`)
      .max(VOICE_SPEECH_RATE_MAX, `Speech rate must be at most ${VOICE_SPEECH_RATE_MAX}.`)
      .optional(),
    speechPitch: z
      .number()
      .min(VOICE_SPEECH_PITCH_MIN, `Speech pitch must be at least ${VOICE_SPEECH_PITCH_MIN}.`)
      .max(VOICE_SPEECH_PITCH_MAX, `Speech pitch must be at most ${VOICE_SPEECH_PITCH_MAX}.`)
      .optional(),
    voiceLocale: z
      .string()
      .trim()
      .max(100, 'Voice locale must be at most 100 characters.')
      .nullable()
      .optional(),
  })
  .strict();

export type UpdateVoicePreferencesInput = z.infer<typeof updateVoicePreferencesSchema>;
