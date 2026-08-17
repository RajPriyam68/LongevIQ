import { Router } from 'express';
import { updateVoicePreferencesSchema } from '@longeviq/shared';
import { validateBody } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import type { VoiceService } from './voice.service.js';
import { VoiceController } from './voice.controller.js';

export function createVoiceRouter(service: VoiceService): Router {
  const controller = new VoiceController(service);
  const router = Router();

  router.get(
    '/preferences',
    asyncHandler((req, res) => controller.getPreferences(req, res)),
  );
  router.put(
    '/preferences',
    validateBody(updateVoicePreferencesSchema),
    asyncHandler((req, res) => controller.updatePreferences(req, res)),
  );
  router.get(
    '/config',
    asyncHandler((req, res) => controller.getCapabilities(req, res)),
  );

  return router;
}
