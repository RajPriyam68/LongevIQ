import type { MedicalReport as MedicalReportEntity } from '@prisma/client';
import type {
  CreateReportMetadata,
  ListReportsQuery,
  MedicalReport,
  ReportDetail,
  ReportDownload,
  ReportFinding,
  UpdateReportInput,
} from '@longeviq/shared';
import { AppError } from '../../utils/app-error.js';
import { detectReportFile } from './storage/file-inspection.js';
import type { ReportStorage } from './storage/report-storage.types.js';
import type { ReportProcessor } from './processing/report-processor.js';
import type {
  AuditSink,
  MedicalReportWithFindings,
  ReportsRepository,
} from './reports.repository.types.js';

export interface UploadedReportFile {
  originalName: string;
  sizeBytes: number;
  data: Buffer;
}

export interface RequestContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class ReportsService {
  constructor(
    private readonly repository: ReportsRepository,
    private readonly storage: ReportStorage,
    private readonly processor: ReportProcessor,
    private readonly audit?: AuditSink,
    private readonly maxUploadBytes = 10 * 1024 * 1024,
  ) {}

  async createReport(
    userId: string,
    input: { file: UploadedReportFile; metadata: CreateReportMetadata },
    ctx: RequestContext = {},
  ): Promise<MedicalReport> {
    if (!input.file || input.file.data.length === 0) {
      throw AppError.badRequest('A report file is required.');
    }
    if (input.file.sizeBytes > this.maxUploadBytes) {
      throw AppError.payloadTooLarge(
        `The file exceeds the maximum allowed size of ${this.maxUploadBytes} bytes.`,
      );
    }

    const detected = detectReportFile(input.file.data);
    if (!detected) {
      throw AppError.badRequest(
        'Unsupported file type. Only PDF, PNG, and JPEG files are allowed.',
      );
    }

    const stored = await this.storage.put({
      data: input.file.data,
      mimeType: detected.mimeType,
      extension: detected.extension,
    });

    const report = await this.repository.create({
      userId,
      title: input.metadata.title,
      reportDate: new Date(input.metadata.reportDate),
      source: input.metadata.source ?? null,
      category: input.metadata.category,
      notes: input.metadata.notes ?? null,
      status: 'UPLOADED',
      fileName: input.file.originalName,
      fileSizeBytes: stored.sizeBytes,
      mimeType: detected.mimeType,
      storageKey: stored.storageKey,
    });

    await this.audit?.recordAudit({
      userId,
      action: 'DATA.REPORT_CREATE',
      entity: 'MedicalReport',
      entityId: report.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      metadata: { fileSizeBytes: stored.sizeBytes, mimeType: detected.mimeType },
    });

    const final = await this.process(
      report.id,
      userId,
      detected.mimeType,
      input.file.data,
      input.metadata.category,
      ctx,
    );
    return serializeReport(final);
  }

  async listReports(
    userId: string,
    query: ListReportsQuery,
  ): Promise<{
    items: MedicalReport[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { items, total } = await this.repository.listByUser(userId, {
      category: query.category,
      status: query.status,
      page: query.page,
      limit: query.limit,
      sort: query.sort,
    });

    return {
      items: items.map(serializeReport),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getReport(userId: string, id: string): Promise<ReportDetail> {
    const report = await this.requireOwnedDetail(userId, id);
    return serializeReportDetail(report);
  }

  async updateReport(
    userId: string,
    id: string,
    input: UpdateReportInput,
    ctx: RequestContext = {},
  ): Promise<MedicalReport> {
    const existing = await this.requireOwned(userId, id);

    const report = await this.repository.update(id, {
      title: input.title ?? existing.title,
      reportDate: input.reportDate ? new Date(input.reportDate) : existing.reportDate,
      source: input.source === undefined ? existing.source : input.source,
      category: input.category ?? existing.category,
      notes: input.notes === undefined ? existing.notes : input.notes,
    });

    await this.audit?.recordAudit({
      userId,
      action: 'DATA.REPORT_UPDATE',
      entity: 'MedicalReport',
      entityId: id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return serializeReport(report);
  }

  async deleteReport(userId: string, id: string, ctx: RequestContext = {}): Promise<void> {
    const report = await this.requireOwned(userId, id);
    await this.repository.delete(id);

    try {
      await this.storage.remove(report.storageKey);
    } catch {
      // Deleting an orphaned object must not fail the request; the DB row is already removed.
    }

    await this.audit?.recordAudit({
      userId,
      action: 'DATA.REPORT_DELETE',
      entity: 'MedicalReport',
      entityId: id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  }

  async downloadReport(
    userId: string,
    id: string,
    ctx: RequestContext = {},
  ): Promise<ReportDownload> {
    const report = await this.requireOwned(userId, id);
    const object = await this.storage.open(report.storageKey);

    await this.audit?.recordAudit({
      userId,
      action: 'DATA.REPORT_DOWNLOAD',
      entity: 'MedicalReport',
      entityId: id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return {
      fileName: report.fileName,
      mimeType: report.mimeType,
      sizeBytes: object.sizeBytes,
      data: object.data,
    };
  }

  private async process(
    reportId: string,
    userId: string,
    mimeType: string,
    data: Buffer,
    category: CreateReportMetadata['category'],
    ctx: RequestContext,
  ): Promise<MedicalReportWithFindings> {
    try {
      const result = await this.processor.process({ mimeType, data, category });
      const updated = await this.repository.completeProcessing(reportId, {
        status: 'PARSED',
        parsedText: result.parsedText,
        parsedAt: new Date(),
        findings: result.findings,
      });
      await this.audit?.recordAudit({
        userId,
        action: 'DATA.REPORT_PROCESSED',
        entity: 'MedicalReport',
        entityId: reportId,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        metadata: { status: 'PARSED', findingCount: result.findings.length },
      });
      return updated;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Report processing failed unexpectedly.';
      const updated = await this.repository.completeProcessing(reportId, {
        status: 'FAILED',
        processingError: message,
        parsedAt: new Date(),
        findings: [],
      });
      await this.audit?.recordAudit({
        userId,
        action: 'DATA.REPORT_PROCESSED',
        entity: 'MedicalReport',
        entityId: reportId,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        metadata: { status: 'FAILED', error: message },
      });
      return updated;
    }
  }

  private async requireOwned(userId: string, id: string): Promise<MedicalReportEntity> {
    const report = await this.repository.findById(id);
    if (!report || report.userId !== userId) {
      throw AppError.notFound('Medical report not found.');
    }
    return report;
  }

  private async requireOwnedDetail(userId: string, id: string): Promise<MedicalReportWithFindings> {
    const report = await this.repository.findByIdWithFindings(id);
    if (!report || report.userId !== userId) {
      throw AppError.notFound('Medical report not found.');
    }
    return report;
  }
}

export function serializeReport(report: MedicalReportEntity): MedicalReport {
  return {
    id: report.id,
    title: report.title,
    reportDate: report.reportDate.toISOString(),
    source: report.source,
    category: report.category,
    notes: report.notes,
    status: report.status,
    fileName: report.fileName,
    fileSizeBytes: report.fileSizeBytes,
    mimeType: report.mimeType,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  };
}

function serializeFinding(finding: {
  id: string;
  name: string;
  value: string;
  unit: string | null;
  referenceRange: string | null;
  flag: ReportFinding['flag'];
  confidence: number;
  sortOrder: number;
}): ReportFinding {
  return {
    id: finding.id,
    name: finding.name,
    value: finding.value,
    unit: finding.unit,
    referenceRange: finding.referenceRange,
    flag: finding.flag,
    confidence: finding.confidence,
    sortOrder: finding.sortOrder,
  };
}

export function serializeReportDetail(report: MedicalReportWithFindings): ReportDetail {
  return {
    ...serializeReport(report),
    parsedText: report.parsedText,
    processingError: report.processingError,
    parsedAt: report.parsedAt ? report.parsedAt.toISOString() : null,
    findings: report.findings.map(serializeFinding),
  };
}
