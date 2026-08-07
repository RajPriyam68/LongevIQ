import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  loginSchema,
  registerSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} from '@longeviq/shared';
import { validateBody } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import type { AuthService } from './auth.service.js';
import type { GoogleOAuthService } from './oauth.service.js';
import type { TokenService } from './token.service.js';
import { AuthController } from './auth.controller.js';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many authentication attempts. Try again later.' },
  },
});

export function createAuthRouter(
  authService: AuthService,
  oauthService: GoogleOAuthService,
  tokenService: TokenService,
): Router {
  const controller = new AuthController(authService, oauthService, tokenService);
  const router = Router();

  router.get(
    '/config',
    asyncHandler((req, res) => controller.authConfig(req, res)),
  );
  router.post(
    '/register',
    authLimiter,
    validateBody(registerSchema),
    asyncHandler((req, res) => controller.register(req, res)),
  );
  router.post(
    '/login',
    authLimiter,
    validateBody(loginSchema),
    asyncHandler((req, res) => controller.login(req, res)),
  );
  router.post(
    '/refresh',
    asyncHandler((req, res) => controller.refresh(req, res)),
  );
  router.post(
    '/logout',
    asyncHandler((req, res) => controller.logout(req, res)),
  );
  router.post(
    '/verify-email',
    validateBody(verifyEmailSchema),
    asyncHandler((req, res) => controller.verifyEmail(req, res)),
  );
  router.post(
    '/resend-verification',
    authLimiter,
    validateBody(resendVerificationSchema),
    asyncHandler((req, res) => controller.resendVerification(req, res)),
  );

  router.get(
    '/google/login',
    asyncHandler((req, res) => controller.googleLogin(req, res)),
  );
  router.get(
    '/google/callback',
    authLimiter,
    asyncHandler((req, res) => controller.googleCallback(req, res)),
  );

  return router;
}
