import { Router } from 'express';
import {
  createMedicationSchema,
  listMedicationsQuerySchema,
  medicationScheduleQuerySchema,
  setDoseStatusSchema,
  updateMedicationSchema,
} from '@longeviq/shared';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import type { MedicationService } from './medication.service.js';
import { MedicationController } from './medication.controller.js';

export function createMedicationRouter(service: MedicationService): Router {
  const controller = new MedicationController(service);
  const router = Router();

  router.post(
    '/',
    validateBody(createMedicationSchema),
    asyncHandler((req, res) => controller.create(req, res)),
  );
  router.get(
    '/',
    validateQuery(listMedicationsQuerySchema),
    asyncHandler((req, res) => controller.list(req, res)),
  );
  router.get(
    '/schedule',
    validateQuery(medicationScheduleQuerySchema),
    asyncHandler((req, res) => controller.getSchedule(req, res)),
  );
  router.get(
    '/:id',
    asyncHandler((req, res) => controller.getOne(req, res)),
  );
  router.patch(
    '/:id',
    validateBody(updateMedicationSchema),
    asyncHandler((req, res) => controller.update(req, res)),
  );
  router.delete(
    '/:id',
    asyncHandler((req, res) => controller.remove(req, res)),
  );
  router.post(
    '/:id/adherence',
    validateBody(setDoseStatusSchema),
    asyncHandler((req, res) => controller.setDoseStatus(req, res)),
  );

  return router;
}
