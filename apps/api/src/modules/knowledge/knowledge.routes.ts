import { Router } from 'express';
import {
  createKnowledgeDocumentSchema,
  listKnowledgeDocumentsQuerySchema,
  searchKnowledgeQuerySchema,
  updateKnowledgeDocumentSchema,
} from '@longeviq/shared';
import { requireRoles } from '../../middleware/auth.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import type { KnowledgeService } from './knowledge.service.js';
import { KnowledgeController } from './knowledge.controller.js';

export function createKnowledgeRouter(service: KnowledgeService): Router {
  const controller = new KnowledgeController(service);
  const router = Router();

  router.get(
    '/search',
    validateQuery(searchKnowledgeQuerySchema),
    asyncHandler((req, res) => controller.search(req, res)),
  );
  router.get(
    '/',
    validateQuery(listKnowledgeDocumentsQuerySchema),
    asyncHandler((req, res) => controller.list(req, res)),
  );
  router.get(
    '/:id',
    asyncHandler((req, res) => controller.getOne(req, res)),
  );

  router.post(
    '/',
    requireRoles('ADMIN'),
    validateBody(createKnowledgeDocumentSchema),
    asyncHandler((req, res) => controller.create(req, res)),
  );
  router.patch(
    '/:id',
    requireRoles('ADMIN'),
    validateBody(updateKnowledgeDocumentSchema),
    asyncHandler((req, res) => controller.update(req, res)),
  );
  router.delete(
    '/:id',
    requireRoles('ADMIN'),
    asyncHandler((req, res) => controller.remove(req, res)),
  );

  return router;
}
