import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler.js';
import type { CareService } from './care.service.js';
import { CareController } from './care.controller.js';

export function createCareRouter(service: CareService): Router {
  const controller = new CareController(service);
  const router = Router();

  router.post(
    '/grants',
    asyncHandler((req, res) => controller.createGrant(req, res)),
  );
  router.get(
    '/connections',
    asyncHandler((req, res) => controller.listConnections(req, res)),
  );
  router.delete(
    '/connections/:connectionId',
    asyncHandler((req, res) => controller.revokeConnection(req, res)),
  );

  return router;
}
