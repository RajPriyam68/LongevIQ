import { describe, expect, it } from 'vitest';
import {
  SCORE_TONE_COLORS,
  directionLabel,
  formatRangeLabel,
  scoreTone,
  statusLabel,
} from './analytics-format';

describe('analytics-format', () => {
  it('maps metric status and direction to labels', () => {
    expect(statusLabel('normal')).toBe('In range');
    expect(statusLabel('high')).toBe('Above range');
    expect(statusLabel('low')).toBe('Below range');
    expect(statusLabel('unknown')).toBe('No data');
    expect(directionLabel('up')).toBe('Rising');
    expect(directionLabel('down')).toBe('Falling');
    expect(directionLabel('stable')).toBe('Stable');
  });

  it('labels recommended ranges', () => {
    expect(formatRangeLabel({ min: 7, max: 9, unit: 'hours' })).toBe('7-9 hours');
    expect(formatRangeLabel({ min: 7000, max: null, unit: 'steps', higherIsBetter: true })).toBe(
      'at least 7000 steps',
    );
    expect(formatRangeLabel(null)).toBe('No reference range');
  });

  it('computes score tones and colors', () => {
    expect(scoreTone(null)).toBe('neutral');
    expect(scoreTone(90)).toBe('positive');
    expect(scoreTone(75)).toBe('neutral');
    expect(scoreTone(60)).toBe('warning');
    expect(scoreTone(30)).toBe('danger');
    expect(SCORE_TONE_COLORS.danger).toBe('#ef4444');
  });
});
