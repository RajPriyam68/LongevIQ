import { describe, expect, it } from 'vitest';
import {
  formatDailyFrequency,
  formatReminderTimes,
  formatScheduleDate,
  formatTime12h,
  medicationFormLabel,
  medicationStatusLabel,
  shiftDate,
} from './medications-format';

describe('medication formatting helpers', () => {
  it('maps enum values to human labels', () => {
    expect(medicationFormLabel('PILL')).toBe('Pill');
    expect(medicationFormLabel('INHALER')).toBe('Inhaler');
    expect(medicationStatusLabel('TAKEN')).toBe('Taken');
    expect(medicationStatusLabel('SKIPPED')).toBe('Skipped');
    expect(medicationStatusLabel('PENDING')).toBe('Pending');
  });

  it('formats 24-hour times to 12-hour labels', () => {
    expect(formatTime12h('08:00')).toBe('8:00 AM');
    expect(formatTime12h('12:00')).toBe('12:00 PM');
    expect(formatTime12h('00:05')).toBe('12:05 AM');
    expect(formatTime12h('23:45')).toBe('11:45 PM');
    expect(formatTime12h('not-a-time')).toBe('not-a-time');
  });

  it('sorts and joins reminder times', () => {
    expect(formatReminderTimes(['20:00', '08:00'])).toBe('08:00, 20:00');
    expect(formatDailyFrequency(['08:00'])).toBe('1 dose daily');
    expect(formatDailyFrequency(['08:00', '20:00', '14:00'])).toBe('3 doses daily');
  });

  it('formats schedule dates without throwing on invalid input', () => {
    expect(formatScheduleDate('2026-08-15')).toMatch(/2026/);
    expect(formatScheduleDate('nope')).toBe('nope');
  });

  it('shifts dates by a day offset', () => {
    expect(shiftDate('2026-08-15', 1)).toBe('2026-08-16');
    expect(shiftDate('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftDate('not-a-date', 1)).toBe('not-a-date');
  });
});
