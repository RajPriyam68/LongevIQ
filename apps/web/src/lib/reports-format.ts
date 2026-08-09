import {
  REPORT_CATEGORY_LABELS,
  REPORT_FINDING_FLAG_LABELS,
  type ReportCategory,
  type ReportFindingFlag,
  type ReportStatus,
} from '@longeviq/shared';

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

export type FindingFlagTone = 'success' | 'warning' | 'destructive';

export const FINDING_FLAG_TONES: Record<ReportFindingFlag, FindingFlagTone> = {
  NORMAL: 'success',
  HIGH: 'destructive',
  LOW: 'warning',
};

export function reportFindingFlagLabel(flag: ReportFindingFlag): string {
  return REPORT_FINDING_FLAG_LABELS[flag];
}

export function reportFindingFlagTone(flag: ReportFindingFlag): FindingFlagTone {
  return FINDING_FLAG_TONES[flag];
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
