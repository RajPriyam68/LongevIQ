import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/api-response.js';
import type { CareService } from './care.service.js';

function requestContext(req: Request) {
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.get('user-agent') ?? null,
  };
}

export class CareController {
  constructor(private readonly service: CareService) {}

  async createGrant(req: Request, res: Response): Promise<void> {
    const result = await this.service.createGrant(req.user!.id, requestContext(req));
    sendSuccess(res, result, 201);
  }

  async listConnections(req: Request, res: Response): Promise<void> {
    const result = await this.service.listConnections(req.user!.id);
    sendSuccess(res, result);
  }

  async revokeConnection(req: Request, res: Response): Promise<void> {
    const result = await this.service.revokeConnection(
      req.user!.id,
      String(req.params.connectionId),
      requestContext(req),
    );
    sendSuccess(res, result);
  }
}
