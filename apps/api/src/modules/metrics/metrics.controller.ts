import type { Request, Response } from 'express';
import type { ListMetricsQuery } from '@longeviq/shared';
import { sendSuccess } from '../../utils/api-response.js';
import type { MetricsService } from './metrics.service.js';

function requestContext(req: Request) {
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.get('user-agent') ?? null,
  };
}

export class MetricsController {
  constructor(private readonly service: MetricsService) {}

  async create(req: Request, res: Response): Promise<void> {
    const metric = await this.service.createMetric(req.user!.id, req.body, requestContext(req));
    sendSuccess(res, { metric }, 201);
  }

  async list(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ListMetricsQuery;
    const result = await this.service.listMetrics(req.user!.id, query);
    sendSuccess(res, result);
  }

  async getOne(req: Request, res: Response): Promise<void> {
    const metric = await this.service.getMetric(req.user!.id, String(req.params.id));
    sendSuccess(res, { metric });
  }

  async update(req: Request, res: Response): Promise<void> {
    const metric = await this.service.updateMetric(
      req.user!.id,
      String(req.params.id),
      req.body,
      requestContext(req),
    );
    sendSuccess(res, { metric });
  }

  async remove(req: Request, res: Response): Promise<void> {
    await this.service.deleteMetric(req.user!.id, String(req.params.id), requestContext(req));
    sendSuccess(res, { deleted: true });
  }
}
