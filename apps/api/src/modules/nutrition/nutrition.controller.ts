import type { Request, Response } from 'express';
import type { CreateNutritionPlanInput, ListNutritionPlansQuery } from '@longeviq/shared';
import { sendSuccess } from '../../utils/api-response.js';
import type { NutritionService } from './nutrition.service.js';

function requestContext(req: Request) {
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.get('user-agent') ?? null,
  };
}

export class NutritionController {
  constructor(private readonly service: NutritionService) {}

  async createPlan(req: Request, res: Response): Promise<void> {
    const plan = await this.service.createPlan(
      req.user!.id,
      req.body as CreateNutritionPlanInput,
      requestContext(req),
    );
    sendSuccess(res, { plan });
  }

  async listPlans(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ListNutritionPlansQuery;
    const result = await this.service.listPlans(req.user!.id, query);
    sendSuccess(res, result);
  }

  async getPlan(req: Request, res: Response): Promise<void> {
    const plan = await this.service.getPlan(req.user!.id, String(req.params.id));
    sendSuccess(res, { plan });
  }

  async removePlan(req: Request, res: Response): Promise<void> {
    await this.service.deletePlan(req.user!.id, String(req.params.id), requestContext(req));
    sendSuccess(res, { deleted: true });
  }
}
