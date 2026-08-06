import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/api-response.js';
import type { HealthService } from './health.service.js';

export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  check(_req: Request, res: Response): void {
    sendSuccess(res, this.healthService.check());
  }
}
