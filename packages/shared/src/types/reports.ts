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

export const ReportFindingFlag = {
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  LOW: 'LOW',
} as const;
export type ReportFindingFlag = (typeof ReportFindingFlag)[keyof typeof ReportFindingFlag];

export const REPORT_FINDING_FLAG_VALUES = Object.values(ReportFindingFlag) as [
  ReportFindingFlag,
  ...ReportFindingFlag[],
];

export const REPORT_FINDING_FLAG_LABELS: Record<ReportFindingFlag, string> = {
  NORMAL: 'Normal',
  HIGH: 'High',
  LOW: 'Low',
};

export interface ReportFinding {
  id: string;
  name: string;
  value: string;
  unit: string | null;
  referenceRange: string | null;
  flag: ReportFindingFlag | null;
  confidence: number;
  sortOrder: number;
}

export interface ReportDetail extends MedicalReport {
  parsedText: string | null;
  processingError: string | null;
  parsedAt: string | null;
  findings: ReportFinding[];
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
