import { describe, expect, it } from 'vitest';
import { formatDateLabel, formatExpiry, formatPersonName } from './doctor-format';

describe('doctor-format', () => {
  it('formats a person name', () => {
    expect(formatPersonName({ firstName: 'Pat', lastName: 'Ient' })).toBe('Pat Ient');
    expect(formatPersonName({ firstName: 'Sarah', lastName: 'Chen' })).toBe('Sarah Chen');
  });

  it('formats ISO dates into a short label', () => {
    expect(formatDateLabel('2026-08-17T00:00:00.000Z')).toBe('Aug 17, 2026');
  });

  it('falls back to an em dash for invalid dates', () => {
    expect(formatDateLabel('not-a-date')).toBe('—');
  });

  it('formats expiry dates with the same short label', () => {
    expect(formatExpiry('2026-08-24T00:00:00.000Z')).toBe('Aug 24, 2026');
  });
});
