import { Router } from 'express';
import {
  analyticsQuerySchema,
  listMetricsQuerySchema,
  listReportsQuerySchema,
  redeemCodeSchema,
} from '@longeviq/shared';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import type { DoctorService } from './doctor.service.js';
import { DoctorController } from './doctor.controller.js';

export function createDoctorRouter(service: DoctorService): Router {
  const controller = new DoctorController(service);
  const router = Router();

  router.post(
    '/connections',
    validateBody(redeemCodeSchema),
    asyncHandler((req, res) => controller.redeem(req, res)),
  );
  router.get(
    '/connections',
    asyncHandler((req, res) => controller.listConnections(req, res)),
  );
  router.delete(
    '/connections/:patientId',
    asyncHandler((req, res) => controller.disconnect(req, res)),
  );
  router.get(
    '/patients/:patientId/overview',
    asyncHandler((req, res) => controller.getPatientOverview(req, res)),
  );
  router.get(
    '/patients/:patientId/metrics',
    validateQuery(listMetricsQuerySchema),
    asyncHandler((req, res) => controller.getPatientMetrics(req, res)),
  );
  router.get(
    '/patients/:patientId/reports',
    validateQuery(listReportsQuerySchema),
    asyncHandler((req, res) => controller.getPatientReports(req, res)),
  );
  router.get(
    '/patients/:patientId/analytics',
    validateQuery(analyticsQuerySchema),
    asyncHandler((req, res) => controller.getPatientAnalytics(req, res)),
  );

  return router;
}
