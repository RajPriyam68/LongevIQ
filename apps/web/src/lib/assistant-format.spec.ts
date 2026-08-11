import { describe, expect, it } from 'vitest';
import { formatAssistantTime, splitIntoParagraphs } from './assistant-format';

describe('splitIntoParagraphs', () => {
  it('returns an empty list for empty content', () => {
    expect(splitIntoParagraphs('')).toEqual([]);
    expect(splitIntoParagraphs('   \n\n  ')).toEqual([]);
  });

  it('splits on blank lines and trims each paragraph', () => {
    const content = 'First paragraph.\n\nSecond paragraph.\n\n\nThird one.';
    expect(splitIntoParagraphs(content)).toEqual([
      'First paragraph.',
      'Second paragraph.',
      'Third one.',
    ]);
  });

  it('keeps single-line content as one paragraph', () => {
    expect(splitIntoParagraphs('Just one line.')).toEqual(['Just one line.']);
  });

  it('preserves inner line breaks within a paragraph', () => {
    expect(splitIntoParagraphs('Line A\nLine B\n\nNext.')).toEqual(['Line A\nLine B', 'Next.']);
  });
});

describe('formatAssistantTime', () => {
  it('formats an ISO timestamp into a local hh:mm label', () => {
    const iso = new Date('2026-08-11T17:30:00Z').toISOString();
    const label = formatAssistantTime(iso);
    expect(label).toMatch(/^\d{2}:\d{2}$/);
  });

  it('returns an empty string for invalid input', () => {
    expect(formatAssistantTime('not-a-date')).toBe('');
  });
});
