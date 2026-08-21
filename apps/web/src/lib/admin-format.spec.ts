import { describe, expect, it } from 'vitest';
import { adminRoleLabel, formatAdminDateTime, formatAdminRelativeTime } from './admin-format';

describe('admin-format', () => {
  it('labels roles', () => {
    expect(adminRoleLabel('USER')).toBe('User');
    expect(adminRoleLabel('DOCTOR')).toBe('Doctor');
    expect(adminRoleLabel('ADMIN')).toBe('Admin');
  });

  it('formats ISO date-times with a time component', () => {
    expect(formatAdminDateTime('2026-08-17T09:30:00.000Z')).toBe('Aug 17, 2026, 9:30 AM');
  });

  it('falls back to an em dash for null and invalid dates', () => {
    expect(formatAdminDateTime(null)).toBe('—');
    expect(formatAdminDateTime('not-a-date')).toBe('—');
    expect(formatAdminRelativeTime(null)).toBe('—');
  });

  it('formats relative times', () => {
    expect(formatAdminRelativeTime(new Date(Date.now() - 30_000).toISOString())).toBe('just now');
    expect(formatAdminRelativeTime(new Date(Date.now() - 5 * 60_000).toISOString())).toBe('5m ago');
    expect(formatAdminRelativeTime(new Date(Date.now() - 3 * 3_600_000).toISOString())).toBe(
      '3h ago',
    );
    expect(formatAdminRelativeTime(new Date(Date.now() - 2 * 86_400_000).toISOString())).toBe(
      '2d ago',
    );
  });
});
