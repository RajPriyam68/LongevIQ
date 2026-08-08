import type { Request, Response } from 'express';
import type { CreateReportMetadata, ListReportsQuery } from '@longeviq/shared';
import { sendSuccess } from '../../utils/api-response.js';
import type { ReportsService } from './reports.service.js';

function requestContext(req: Request) {
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.get('user-agent') ?? null,
  };
}

function contentDispositionFileName(fileName: string): string {
  const ascii = fileName
    .replace(/[\r\n"]/g, '')
    .replace(/[^\x20-\x7e]/g, '_')
    .trim();
  const encoded = encodeURIComponent(fileName.replace(/[\r\n"]/g, '')).replace(/'/g, '%27');
  return `inline; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  async create(req: Request, res: Response): Promise<void> {
    const file = req.file;
    const report = await this.service.createReport(
      req.user!.id,
      {
        file: {
          originalName: file?.originalname ?? '',
          sizeBytes: file?.size ?? 0,
          data: file?.buffer ?? Buffer.alloc(0),
        },
        metadata: req.body as CreateReportMetadata,
      },
      requestContext(req),
    );
    sendSuccess(res, { report }, 201);
  }

  async list(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ListReportsQuery;
    const result = await this.service.listReports(req.user!.id, query);
    sendSuccess(res, result);
  }

  async getOne(req: Request, res: Response): Promise<void> {
    const report = await this.service.getReport(req.user!.id, String(req.params.id));
    sendSuccess(res, { report });
  }

  async update(req: Request, res: Response): Promise<void> {
    const report = await this.service.updateReport(
      req.user!.id,
      String(req.params.id),
      req.body,
      requestContext(req),
    );
    sendSuccess(res, { report });
  }

  async remove(req: Request, res: Response): Promise<void> {
    await this.service.deleteReport(req.user!.id, String(req.params.id), requestContext(req));
    sendSuccess(res, { deleted: true });
  }

  async download(req: Request, res: Response): Promise<void> {
    const result = await this.service.downloadReport(
      req.user!.id,
      String(req.params.id),
      requestContext(req),
    );
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', contentDispositionFileName(result.fileName));
    res.setHeader('Content-Length', String(result.sizeBytes));
    res.end(result.data);
  }
}
