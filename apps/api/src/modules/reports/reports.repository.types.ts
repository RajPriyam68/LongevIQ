import type { MedicalReport, Prisma, ReportCategory, ReportStatus } from '@prisma/client';

export interface CreateMedicalReportInput {
  userId: string;
  title: string;
  reportDate: Date;
  source?: string | null;
  category: ReportCategory;
  notes?: string | null;
  status: ReportStatus;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  storageKey: string;
}

export interface ListReportsFilter {
  category?: ReportCategory;
  status?: ReportStatus;
  page: number;
  limit: number;
  sort: 'asc' | 'desc';
}

export interface ReportsRepository {
  create(input: CreateMedicalReportInput): Promise<MedicalReport>;
  findById(id: string): Promise<MedicalReport | null>;
  listByUser(
    userId: string,
    filter: ListReportsFilter,
  ): Promise<{ items: MedicalReport[]; total: number }>;
  update(id: string, data: Prisma.MedicalReportUpdateInput): Promise<MedicalReport>;
  delete(id: string): Promise<void>;
}

export interface AuditSink {
  recordAudit(input: {
    userId?: string | null;
    action: string;
    entity?: string | null;
    entityId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: unknown;
  }): Promise<void>;
}
