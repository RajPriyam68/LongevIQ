import { describe, expect, it } from 'vitest';
import {
  formatNotificationDateTime,
  formatNotificationRelativeTime,
  notificationBellCountClass,
  notificationSeverityBadgeClass,
  notificationSeverityLabel,
  notificationTypeLabel,
} from './notifications-format';

describe('notifications-format', () => {
  it('labels notification types', () => {
    expect(notificationTypeLabel('MEDICATION_DUE')).toBe('Medication due');
    expect(notificationTypeLabel('REPORT_PROCESSED')).toBe('Report processed');
    expect(notificationTypeLabel('REPORT_FAILED')).toBe('Report processing failed');
    expect(notificationTypeLabel('METRIC_ALERT')).toBe('Health alert');
    expect(notificationTypeLabel('CARE_CONNECTION')).toBe('Care connection');
  });

  it('labels notification severities', () => {
    expect(notificationSeverityLabel('INFO')).toBe('Info');
    expect(notificationSeverityLabel('WARNING')).toBe('Warning');
    expect(notificationSeverityLabel('SUCCESS')).toBe('Success');
    expect(notificationSeverityLabel('CRITICAL')).toBe('Critical');
  });

  it('maps severities to badge classes', () => {
    expect(notificationSeverityBadgeClass('SUCCESS')).toContain('emerald');
    expect(notificationSeverityBadgeClass('CRITICAL')).toContain('destructive');
    expect(notificationSeverityBadgeClass('WARNING')).toContain('amber');
    expect(notificationSeverityBadgeClass('INFO')).toContain('secondary');
  });

  it('formats ISO date-times with a time component', () => {
    expect(formatNotificationDateTime('2026-08-22T09:30:00.000Z')).toBe('Aug 22, 2026, 9:30 AM');
  });

  it('falls back to an em dash for null and invalid dates', () => {
    expect(formatNotificationDateTime(null)).toBe('—');
    expect(formatNotificationDateTime('not-a-date')).toBe('—');
    expect(formatNotificationRelativeTime(null)).toBe('—');
  });

  it('formats relative times', () => {
    expect(formatNotificationRelativeTime(new Date(Date.now() - 30_000).toISOString())).toBe(
      'just now',
    );
    expect(formatNotificationRelativeTime(new Date(Date.now() - 5 * 60_000).toISOString())).toBe(
      '5m ago',
    );
    expect(formatNotificationRelativeTime(new Date(Date.now() - 3 * 3_600_000).toISOString())).toBe(
      '3h ago',
    );
    expect(
      formatNotificationRelativeTime(new Date(Date.now() - 2 * 86_400_000).toISOString()),
    ).toBe('2d ago');
  });

  it('sizes the bell badge for large unread counts', () => {
    expect(notificationBellCountClass(3)).toContain('w-4');
    expect(notificationBellCountClass(12)).toContain('min-w-5');
  });
});
