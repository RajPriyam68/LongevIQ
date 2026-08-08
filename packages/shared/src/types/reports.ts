import type { ReportStatus } from './enums.js';

export const ReportCategory = {
  BLOODWORK: 'BLOODWORK',
  IMAGING: 'IMAGING',
  GENERAL: 'GENERAL',
  OTHER: 'OTHER',
} as const;
export type ReportCategory = (typeof ReportCategory)[keyof typeof ReportCategory];

export const REPORT_CATEGORY_VALUES = Object.values(ReportCategory) as [
  ReportCategory,
  ...ReportCategory[],
];

export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  BLOODWORK: 'Bloodwork',
  IMAGING: 'Imaging',
  GENERAL: 'General',
  OTHER: 'Other',
};

export interface MedicalReport {
  id: string;
  title: string;
  reportDate: string;
  source?: string | null;
  category: ReportCategory;
  notes?: string | null;
  status: ReportStatus;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportListResult {
  items: MedicalReport[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ReportDownload {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  data: Buffer;
}
