import {
  VOICE_MAX_SPEECH_CHUNK_CHARS,
  VOICE_SPEECH_PITCH_MAX,
  VOICE_SPEECH_PITCH_MIN,
  VOICE_SPEECH_RATE_MAX,
  VOICE_SPEECH_RATE_MIN,
} from '@longeviq/shared';

/**
 * Browser speech engine for the voice assistant. Speech-to-text (Web Speech
 * Recognition) and text-to-speech (Web Speech Synthesis) run entirely in the
 * browser, so no audio ever leaves the device. The pure helpers below are unit
 * tested; the engine wrappers are feature-detection guarded so they are safe in
 * Node/jsdom.
 *
 * The Web Speech Recognition API is not part of TypeScript's lib.dom, so the
 * minimal surface used here is declared locally.
 */

type SpeechRecognitionAlternative = {
  transcript: string;
  confidence: number;
};

type SpeechRecognitionResultLike = {
  readonly length: number;
  readonly isFinal: boolean;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
};

type SpeechRecognitionEventLike = {
  readonly resultIndex: number;
  readonly results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionErrorLike = {
  readonly error: string;
  readonly message: string;
};

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

export interface SpeechRecognizer {
  start(): void;
  stop(): void;
  abort(): void;
}

export interface RecognitionHandlers {
  onResult: (transcript: string, isFinal: boolean) => void;
  onEnd: () => void;
  onError: (error: string) => void;
}

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  locale?: string | null;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
}

const SENTENCE_ENDINGS = '.!?…';

export function clampSpeechRate(value: number): number {
  return Math.min(VOICE_SPEECH_RATE_MAX, Math.max(VOICE_SPEECH_RATE_MIN, value));
}

export function clampSpeechPitch(value: number): number {
  return Math.min(VOICE_SPEECH_PITCH_MAX, Math.max(VOICE_SPEECH_PITCH_MIN, value));
}

export function normalizeTranscript(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

// Finds the last sentence-ending punctuation within the first `max` characters.
// A sentence ends at a punctuation mark that is either the final character of
// the window or is followed by whitespace.
function findSentenceCut(text: string, max: number): number {
  for (let i = max; i >= 0; i -= 1) {
    const char = text[i];
    if (char !== undefined && SENTENCE_ENDINGS.includes(char)) {
      const next = i === max ? '' : text[i + 1];
      if (next === undefined || next === '' || /\s/.test(next)) {
        return i + 1;
      }
    }
  }
  return -1;
}

// Splits text into speakable chunks of at most `maxChars`, preferring sentence
// boundaries, then word boundaries, then hard cuts for unbroken strings.
export function chunkForSpeech(text: string, maxChars = VOICE_MAX_SPEECH_CHUNK_CHARS): string[] {
  const source = normalizeTranscript(text);
  if (source.length === 0) return [];
  if (source.length <= maxChars) return [source];

  const chunks: string[] = [];
  let remaining = source;

  while (remaining.length > maxChars) {
    const window = remaining.slice(0, maxChars);
    let cut = findSentenceCut(window, maxChars);
    if (cut < 0) {
      const space = window.lastIndexOf(' ');
      cut = space > 0 ? space + 1 : maxChars;
    }
    chunks.push(window.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }

  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

// Normalizes a BCP-47 tag (case and separator) for voice matching.
function normalizeLang(lang: string): string {
  return lang.toLowerCase().replace('_', '-');
}

// Picks a browser voice for the requested locale: exact match first, then any
// voice of the same primary language, then an English fallback.
export function pickVoiceForLocale(
  voices: SpeechSynthesisVoice[],
  locale: string | null,
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  if (locale) {
    const target = normalizeLang(locale);
    const exact = voices.find((voice) => normalizeLang(voice.lang) === target);
    if (exact) return exact;
    const primary = target.split('-')[0]!;
    const sameLang = voices.find((voice) => normalizeLang(voice.lang).split('-')[0] === primary);
    if (sameLang) return sameLang;
  }
  return voices.find((voice) => normalizeLang(voice.lang).startsWith('en')) ?? null;
}

export function speechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof getSpeechRecognitionConstructor() === 'function';
}

export function speechSynthesisSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'speechSynthesis' in window && typeof window.speechSynthesis.speak === 'function';
}

export function getBrowserVoiceLocales(): Array<{ lang: string; label: string }> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  const seen = new Map<string, string>();
  for (const voice of window.speechSynthesis.getVoices()) {
    if (!seen.has(voice.lang)) {
      seen.set(voice.lang, `${voice.lang} (${voice.name})`);
    }
  }
  return [...seen.entries()]
    .map(([lang, label]) => ({ lang, label }))
    .sort((a, b) => a.lang.localeCompare(b.lang));
}

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

export function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const speechWindow = window as SpeechWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

export function createSpeechRecognizer(handlers: RecognitionHandlers): SpeechRecognizer | null {
  const Constructor = getSpeechRecognitionConstructor();
  if (!Constructor) return null;

  const recognition = new Constructor();
  recognition.lang = navigator.language || 'en-US';
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onresult = (event: SpeechRecognitionEventLike) => {
    let interim = '';
    let final = '';
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i]!;
      if (result.isFinal) {
        final += result[0]?.transcript ?? '';
      } else {
        interim += result[0]?.transcript ?? '';
      }
    }
    if (final) {
      handlers.onResult(normalizeTranscript(final), true);
    } else if (interim) {
      handlers.onResult(normalizeTranscript(interim), false);
    }
  };
  recognition.onend = () => handlers.onEnd();
  recognition.onerror = (event) => handlers.onError(event.error);

  return {
    start: () => recognition.start(),
    stop: () => recognition.stop(),
    abort: () => recognition.abort(),
  };
}

let speakingNow = false;
const speakingListeners = new Set<() => void>();

function setSpeaking(value: boolean): void {
  if (speakingNow === value) return;
  speakingNow = value;
  speakingListeners.forEach((listener) => listener());
}

export function isSpeaking(): boolean {
  return speakingNow;
}

export function onSpeakingChange(listener: () => void): () => void {
  speakingListeners.add(listener);
  return () => {
    speakingListeners.delete(listener);
  };
}

export function speak(text: string, options: SpeakOptions = {}): boolean {
  if (!speechSynthesisSupported()) return false;
  const chunks = chunkForSpeech(text);
  if (chunks.length === 0) return false;

  const synth = window.speechSynthesis;
  synth.cancel();

  const voice = pickVoiceForLocale(synth.getVoices(), options.locale ?? null);
  let pending = chunks.length;
  const settle = () => {
    pending -= 1;
    if (pending === 0) {
      setSpeaking(false);
      options.onEnd?.();
    }
  };

  setSpeaking(true);
  options.onStart?.();

  for (const chunk of chunks) {
    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.rate = clampSpeechRate(options.rate ?? 1);
    utterance.pitch = clampSpeechPitch(options.pitch ?? 1);
    if (voice) utterance.voice = voice;
    utterance.onend = settle;
    utterance.onerror = () => {
      pending -= 1;
      if (pending === 0) {
        setSpeaking(false);
        options.onError?.();
      }
    };
    synth.speak(utterance);
  }
  return true;
}

export function stopSpeaking(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  setSpeaking(false);
}
