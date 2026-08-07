import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found.js';
import { requireAuth } from './middleware/auth.js';
import { createContainer, type Container } from './container.js';
import healthRoutes from './modules/health/health.routes.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { createUsersRouter } from './modules/users/users.routes.js';

export interface AppOptions {
  container?: Partial<Container>;
}

export function createApp(options: AppOptions = {}): Express {
  const container = createContainer(options.container);
  const app = express();

  app.disable('x-powered-by');

  app.use(
    pinoHttp({
      logger,
      customLogLevel: (req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    }),
  );

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(cookieParser());

  const apiLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: env.RATE_LIMIT_MAX,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' },
    },
  });

  app.use(env.API_PREFIX, apiLimiter);

  const apiRouter = express.Router();
  apiRouter.use('/health', healthRoutes);
  apiRouter.use(
    '/auth',
    createAuthRouter(container.authService, container.oauthService, container.tokenService),
  );
  apiRouter.use(
    '/users',
    requireAuth(container.tokenService),
    createUsersRouter(container.authService),
  );

  app.use(`${env.API_PREFIX}/${env.API_VERSION}`, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
