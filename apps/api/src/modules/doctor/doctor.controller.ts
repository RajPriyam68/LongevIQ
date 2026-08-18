import type { Request, Response } from 'express';
import type { ListMetricsQuery, ListReportsQuery, RedeemConnectionInput } from '@longeviq/shared';
import { sendSuccess } from '../../utils/api-response.js';
import type { DoctorService } from './doctor.service.js';

function requestContext(req: Request) {
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.get('user-agent') ?? null,
  };
}

export class DoctorController {
  constructor(private readonly service: DoctorService) {}

  async redeem(req: Request, res: Response): Promise<void> {
    const result = await this.service.redeem(
      req.user!.id,
      req.body as RedeemConnectionInput,
      requestContext(req),
    );
    sendSuccess(res, result, 201);
  }

  async listConnections(req: Request, res: Response): Promise<void> {
    const result = await this.service.listConnections(req.user!.id);
    sendSuccess(res, result);
  }

  async disconnect(req: Request, res: Response): Promise<void> {
    const result = await this.service.disconnect(
      req.user!.id,
      String(req.params.patientId),
      requestContext(req),
    );
    sendSuccess(res, result);
  }

  async getPatientOverview(req: Request, res: Response): Promise<void> {
    const result = await this.service.getPatientOverview(
      req.user!.id,
      String(req.params.patientId),
    );
    sendSuccess(res, result);
  }

  async getPatientMetrics(req: Request, res: Response): Promise<void> {
    const result = await this.service.getPatientMetrics(
      req.user!.id,
      String(req.params.patientId),
      req.query as unknown as ListMetricsQuery,
    );
    sendSuccess(res, result);
  }

  async getPatientReports(req: Request, res: Response): Promise<void> {
    const result = await this.service.getPatientReports(
      req.user!.id,
      String(req.params.patientId),
      req.query as unknown as ListReportsQuery,
    );
    sendSuccess(res, result);
  }

  async getPatientAnalytics(req: Request, res: Response): Promise<void> {
    const days = Number(req.query.days ?? 30);
    const result = await this.service.getPatientAnalytics(
      req.user!.id,
      String(req.params.patientId),
      days,
    );
    sendSuccess(res, result);
  }
}
