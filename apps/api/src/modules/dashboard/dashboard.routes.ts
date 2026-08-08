import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler.js';
import type { DashboardService } from './dashboard.service.js';
import { DashboardController } from './dashboard.controller.js';

export function createDashboardRouter(service: DashboardService): Router {
  const controller = new DashboardController(service);
  const router = Router();

  router.get(
    '/overview',
    asyncHandler((req, res) => controller.overview(req, res)),
  );

  return router;
}
