import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/api-response.js';
import type { DashboardService } from './dashboard.service.js';

export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  async overview(req: Request, res: Response): Promise<void> {
    const overview = await this.service.overview(req.user!.id);
    sendSuccess(res, { overview });
  }
}
