import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '@longeviq/shared';
import { AppError } from '../utils/app-error.js';
import type { TokenService } from '../modules/auth/token.service.js';

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return null;
  }
  return header.slice('Bearer '.length).trim();
}

export function requireAuth(tokenService: TokenService) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const token = extractBearerToken(req);
    if (!token) {
      next(AppError.unauthorized('Authentication required.'));
      return;
    }
    try {
      const payload = await tokenService.verifyAccessToken(token);
      req.user = { id: payload.sub, role: payload.role as UserRole };
      next();
    } catch {
      next(AppError.unauthorized('Invalid or expired access token.'));
    }
  };
}

export function optionalAuth(tokenService: TokenService) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const token = extractBearerToken(req);
    if (token) {
      try {
        const payload = await tokenService.verifyAccessToken(token);
        req.user = { id: payload.sub, role: payload.role as UserRole };
      } catch {
        // Invalid token on optional auth: treat as anonymous.
      }
    }
    next();
  };
}

export function requireRoles(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(AppError.unauthorized('Authentication required.'));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(AppError.forbidden('You do not have permission to perform this action.'));
      return;
    }
    next();
  };
}
