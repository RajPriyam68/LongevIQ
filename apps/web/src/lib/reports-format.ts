import { REPORT_CATEGORY_LABELS, type ReportCategory, type ReportStatus } from '@longeviq/shared';

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  UPLOADED: 'Uploaded',
  PROCESSING: 'Processing',
  PARSED: 'Parsed',
  FAILED: 'Failed',
};

export type ReportStatusTone = 'default' | 'success' | 'warning' | 'destructive';

export const REPORT_STATUS_TONES: Record<ReportStatus, ReportStatusTone> = {
  UPLOADED: 'default',
  PROCESSING: 'warning',
  PARSED: 'success',
  FAILED: 'destructive',
};

export function reportCategoryLabel(category: ReportCategory): string {
  return REPORT_CATEGORY_LABELS[category];
}

export function reportStatusLabel(status: ReportStatus): string {
  return REPORT_STATUS_LABELS[status];
}

export function reportStatusTone(status: ReportStatus): ReportStatusTone {
  return REPORT_STATUS_TONES[status];
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${formatOneDecimal(bytes / 1024)} KB`;
  return `${formatOneDecimal(bytes / (1024 * 1024))} MB`;
}

function formatOneDecimal(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
