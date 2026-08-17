import type { Request, Response } from 'express';
import type { UpdateVoicePreferencesInput } from '@longeviq/shared';
import { sendSuccess } from '../../utils/api-response.js';
import type { VoiceService } from './voice.service.js';

function requestContext(req: Request) {
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.get('user-agent') ?? null,
  };
}

export class VoiceController {
  constructor(private readonly service: VoiceService) {}

  async getPreferences(req: Request, res: Response): Promise<void> {
    const result = await this.service.getPreferences(req.user!.id);
    sendSuccess(res, result);
  }

  async updatePreferences(req: Request, res: Response): Promise<void> {
    const result = await this.service.updatePreferences(
      req.user!.id,
      req.body as UpdateVoicePreferencesInput,
      requestContext(req),
    );
    sendSuccess(res, result);
  }

  async getCapabilities(_req: Request, res: Response): Promise<void> {
    sendSuccess(res, { capabilities: this.service.getCapabilities() });
  }
}
