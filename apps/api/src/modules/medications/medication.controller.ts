import type { Request, Response } from 'express';
import type {
  CreateMedicationInput,
  ListMedicationsQuery,
  MedicationScheduleQuery,
  SetDoseStatusInput,
  UpdateMedicationInput,
} from '@longeviq/shared';
import { sendSuccess } from '../../utils/api-response.js';
import type { MedicationService } from './medication.service.js';

function requestContext(req: Request) {
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.get('user-agent') ?? null,
  };
}

export class MedicationController {
  constructor(private readonly service: MedicationService) {}

  async create(req: Request, res: Response): Promise<void> {
    const medication = await this.service.createMedication(
      req.user!.id,
      req.body as CreateMedicationInput,
      requestContext(req),
    );
    sendSuccess(res, { medication }, 201);
  }

  async list(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ListMedicationsQuery;
    const result = await this.service.listMedications(req.user!.id, query);
    sendSuccess(res, result);
  }

  async getSchedule(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as MedicationScheduleQuery;
    const schedule = await this.service.getSchedule(req.user!.id, query.date);
    sendSuccess(res, { schedule });
  }

  async getOne(req: Request, res: Response): Promise<void> {
    const medication = await this.service.getMedication(req.user!.id, String(req.params.id));
    sendSuccess(res, { medication });
  }

  async update(req: Request, res: Response): Promise<void> {
    const medication = await this.service.updateMedication(
      req.user!.id,
      String(req.params.id),
      req.body as UpdateMedicationInput,
      requestContext(req),
    );
    sendSuccess(res, { medication });
  }

  async remove(req: Request, res: Response): Promise<void> {
    await this.service.deleteMedication(req.user!.id, String(req.params.id), requestContext(req));
    sendSuccess(res, { deleted: true });
  }

  async setDoseStatus(req: Request, res: Response): Promise<void> {
    const schedule = await this.service.setDoseStatus(
      req.user!.id,
      String(req.params.id),
      req.body as SetDoseStatusInput,
      requestContext(req),
    );
    sendSuccess(res, { schedule });
  }
}
