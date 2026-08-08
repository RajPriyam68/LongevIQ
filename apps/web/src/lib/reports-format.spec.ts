import { describe, expect, it } from 'vitest';
import {
  formatFileSize,
  reportCategoryLabel,
  reportStatusLabel,
  reportStatusTone,
} from './reports-format';

describe('reportCategoryLabel', () => {
  it('maps every category to a label', () => {
    expect(reportCategoryLabel('BLOODWORK')).toBe('Bloodwork');
    expect(reportCategoryLabel('IMAGING')).toBe('Imaging');
    expect(reportCategoryLabel('GENERAL')).toBe('General');
    expect(reportCategoryLabel('OTHER')).toBe('Other');
  });
});

describe('reportStatusLabel', () => {
  it('maps every status to a label', () => {
    expect(reportStatusLabel('UPLOADED')).toBe('Uploaded');
    expect(reportStatusLabel('PROCESSING')).toBe('Processing');
    expect(reportStatusLabel('PARSED')).toBe('Parsed');
    expect(reportStatusLabel('FAILED')).toBe('Failed');
  });
});

describe('reportStatusTone', () => {
  it('maps parsed to success and failed to destructive', () => {
    expect(reportStatusTone('PARSED')).toBe('success');
    expect(reportStatusTone('FAILED')).toBe('destructive');
    expect(reportStatusTone('UPLOADED')).toBe('default');
  });
});

describe('formatFileSize', () => {
  it('formats bytes, kilobytes, and megabytes', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5 MB');
    expect(formatFileSize(5.25 * 1024 * 1024)).toBe('5.3 MB');
  });
});
