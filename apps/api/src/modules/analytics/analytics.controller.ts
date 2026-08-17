import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/api-response.js';
import type { AnalyticsService } from './analytics.service.js';

export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  async summary(req: Request, res: Response): Promise<void> {
    const days = Number(req.query.days ?? 30);
    const summary = await this.service.summary(req.user!.id, days);
    sendSuccess(res, { summary });
  }

  async score(req: Request, res: Response): Promise<void> {
    const score = await this.service.score(req.user!.id);
    sendSuccess(res, { score });
  }

  async insights(req: Request, res: Response): Promise<void> {
    const days = Number(req.query.days ?? 30);
    const insights = await this.service.insights(req.user!.id, days);
    sendSuccess(res, { insights });
  }
}
