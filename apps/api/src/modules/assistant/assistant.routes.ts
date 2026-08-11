import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { createChatMessageSchema, listChatSessionsQuerySchema } from '@longeviq/shared';
import { env } from '../../config/env.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import type { AssistantService } from './assistant.service.js';
import { AssistantController } from './assistant.controller.js';

export function createAssistantRouter(service: AssistantService): Router {
  const controller = new AssistantController(service);
  const router = Router();

  // The global API limiter is per-IP; LLM calls are expensive, so chat gets an
  // additional per-user budget (keyed by the authenticated user id).
  const chatLimiter = rateLimit({
    windowMs: env.ASSISTANT_CHAT_RATE_LIMIT_WINDOW_MS,
    limit: env.ASSISTANT_CHAT_RATE_LIMIT_MAX,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id ?? req.ip ?? 'anonymous',
    message: {
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many chat messages, please slow down.' },
    },
  });

  router.post(
    '/chat',
    chatLimiter,
    validateBody(createChatMessageSchema),
    asyncHandler((req, res) => controller.chat(req, res)),
  );
  router.get(
    '/sessions',
    validateQuery(listChatSessionsQuerySchema),
    asyncHandler((req, res) => controller.listSessions(req, res)),
  );
  router.get(
    '/sessions/:id',
    asyncHandler((req, res) => controller.getSession(req, res)),
  );
  router.delete(
    '/sessions/:id',
    asyncHandler((req, res) => controller.removeSession(req, res)),
  );

  return router;
}
