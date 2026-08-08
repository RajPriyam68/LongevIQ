import { Router } from 'express';
import {
  createReportMetadataSchema,
  listReportsQuerySchema,
  updateReportSchema,
} from '@longeviq/shared';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import type { ReportsService } from './reports.service.js';
import { ReportsController } from './reports.controller.js';
import { reportUpload } from './upload-report.js';

export function createReportsRouter(service: ReportsService): Router {
  const controller = new ReportsController(service);
  const router = Router();

  router.post(
    '/',
    reportUpload.single('file'),
    validateBody(createReportMetadataSchema),
    asyncHandler((req, res) => controller.create(req, res)),
  );
  router.get(
    '/',
    validateQuery(listReportsQuerySchema),
    asyncHandler((req, res) => controller.list(req, res)),
  );
  router.get(
    '/:id',
    asyncHandler((req, res) => controller.getOne(req, res)),
  );
  router.get(
    '/:id/file',
    asyncHandler((req, res) => controller.download(req, res)),
  );
  router.patch(
    '/:id',
    validateBody(updateReportSchema),
    asyncHandler((req, res) => controller.update(req, res)),
  );
  router.delete(
    '/:id',
    asyncHandler((req, res) => controller.remove(req, res)),
  );

  return router;
}
