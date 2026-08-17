import { describe, expect, it } from 'vitest';
import {
  chunkForSpeech,
  clampSpeechPitch,
  clampSpeechRate,
  normalizeTranscript,
  pickVoiceForLocale,
  speechRecognitionSupported,
  speechSynthesisSupported,
} from './speech';

const voices = [
  { lang: 'en-US', name: 'US English' },
  { lang: 'en-GB', name: 'UK English' },
  { lang: 'es-ES', name: 'Spanish' },
] as unknown as SpeechSynthesisVoice[];

describe('clampSpeechRate', () => {
  it('clamps into the supported range', () => {
    expect(clampSpeechRate(0.1)).toBe(0.5);
    expect(clampSpeechRate(3)).toBe(2);
    expect(clampSpeechRate(1.3)).toBe(1.3);
  });
});

describe('clampSpeechPitch', () => {
  it('clamps into the supported range', () => {
    expect(clampSpeechPitch(-1)).toBe(0);
    expect(clampSpeechPitch(5)).toBe(2);
    expect(clampSpeechPitch(1)).toBe(1);
  });
});

describe('normalizeTranscript', () => {
  it('collapses whitespace and trims', () => {
    expect(normalizeTranscript('  What   is   my  glucose?\n ')).toBe('What is my glucose?');
  });

  it('returns an empty string for blank input', () => {
    expect(normalizeTranscript('   \n  ')).toBe('');
  });
});

describe('chunkForSpeech', () => {
  it('returns a single chunk for short text', () => {
    expect(chunkForSpeech('Short answer.')).toEqual(['Short answer.']);
  });

  it('returns an empty list for blank text', () => {
    expect(chunkForSpeech('')).toEqual([]);
    expect(chunkForSpeech('   \n ')).toEqual([]);
  });

  it('splits long text on sentence boundaries', () => {
    const text = 'First sentence. Second sentence. Third sentence.';
    expect(chunkForSpeech(text, 20)).toEqual([
      'First sentence.',
      'Second sentence.',
      'Third sentence.',
    ]);
  });

  it('falls back to word boundaries without punctuation', () => {
    const text = 'one two three four five';
    expect(chunkForSpeech(text, 12)).toEqual(['one two', 'three four', 'five']);
  });

  it('hard-splits a single unbroken word', () => {
    const text = 'a'.repeat(25);
    const chunks = chunkForSpeech(text, 10);
    expect(chunks).toHaveLength(3);
    expect(chunks.every((chunk) => chunk.length <= 10)).toBe(true);
    expect(chunks.join('')).toBe(text);
  });

  it('never produces chunks longer than the limit', () => {
    const text = 'Long answer with several sentences. '.repeat(10);
    const chunks = chunkForSpeech(text, 60);
    expect(chunks.every((chunk) => chunk.length <= 60)).toBe(true);
    expect(chunks.join(' ').replace(/\s+/g, ' ').trim()).toBe(text.trim());
  });
});

describe('pickVoiceForLocale', () => {
  it('prefers an exact locale match', () => {
    expect(pickVoiceForLocale(voices, 'en-GB')?.lang).toBe('en-GB');
  });

  it('normalizes underscores and case in the locale tag', () => {
    expect(pickVoiceForLocale(voices, 'es_ES')?.lang).toBe('es-ES');
    expect(pickVoiceForLocale(voices, 'EN-us')?.lang).toBe('en-US');
  });

  it('falls back to the same primary language', () => {
    expect(pickVoiceForLocale(voices, 'en-AU')?.lang).toBe('en-US');
  });

  it('falls back to an English voice for unknown locales', () => {
    expect(pickVoiceForLocale(voices, 'fr-FR')?.lang).toBe('en-US');
    expect(pickVoiceForLocale(voices, null)?.lang).toBe('en-US');
  });

  it('returns null when no voices are available', () => {
    expect(pickVoiceForLocale([], 'en-US')).toBeNull();
  });
});

describe('feature detection', () => {
  it('reports no browser speech engines outside a browser', () => {
    expect(speechRecognitionSupported()).toBe(false);
    expect(speechSynthesisSupported()).toBe(false);
  });
});
