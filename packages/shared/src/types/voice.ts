export const VoiceInputMethod = {
  TEXT: 'TEXT',
  VOICE: 'VOICE',
} as const;
export type VoiceInputMethod = (typeof VoiceInputMethod)[keyof typeof VoiceInputMethod];

export const VOICE_INPUT_METHOD_VALUES = Object.values(VoiceInputMethod) as [
  VoiceInputMethod,
  ...VoiceInputMethod[],
];

export const VOICE_SPEECH_RATE_MIN = 0.5;
export const VOICE_SPEECH_RATE_MAX = 2;
export const VOICE_SPEECH_PITCH_MIN = 0;
export const VOICE_SPEECH_PITCH_MAX = 2;

// Upper bound on a single spoken utterance chunk. Long assistant answers are
// split on sentence boundaries so the browser TTS queue stays responsive.
export const VOICE_MAX_SPEECH_CHUNK_CHARS = 240;

export const VoiceSttEngine = {
  BROWSER_SPEECH_RECOGNITION: 'BROWSER_SPEECH_RECOGNITION',
} as const;
export type VoiceSttEngine = (typeof VoiceSttEngine)[keyof typeof VoiceSttEngine];

export const VoiceTtsEngine = {
  BROWSER_SPEECH_SYNTHESIS: 'BROWSER_SPEECH_SYNTHESIS',
} as const;
export type VoiceTtsEngine = (typeof VoiceTtsEngine)[keyof typeof VoiceTtsEngine];

export interface VoicePreferences {
  readAloud: boolean;
  autoListen: boolean;
  speechRate: number;
  speechPitch: number;
  voiceLocale: string | null;
}

export const VOICE_PREFERENCES_DEFAULTS: VoicePreferences = {
  readAloud: true,
  autoListen: false,
  speechRate: 1,
  speechPitch: 1,
  voiceLocale: null,
};

export interface VoiceCapabilities {
  sttEngine: VoiceSttEngine;
  ttsEngine: VoiceTtsEngine;
  speechRate: { min: number; max: number };
  speechPitch: { min: number; max: number };
  maxSpeechChunkChars: number;
}

export interface VoicePreferencesResult {
  preferences: VoicePreferences;
}
