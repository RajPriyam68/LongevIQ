import { Router } from 'express';
import { changePasswordSchema, updateProfileSchema } from '@longeviq/shared';
import { validateBody } from '../../middleware/validate.js';
import type { AuthService } from '../auth/auth.service.js';
import { UsersController } from './users.controller.js';

export function createUsersRouter(authService: AuthService): Router {
  const controller = new UsersController(authService);
  const router = Router();

  router.get('/me', (req, res) => controller.getMe(req, res));
  router.patch('/me', validateBody(updateProfileSchema), (req, res) =>
    controller.updateMe(req, res),
  );
  router.post('/me/password', validateBody(changePasswordSchema), (req, res) =>
    controller.changePassword(req, res),
  );

  return router;
}
