import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodSchema } from 'zod';
import { AppError } from '../utils/app-error.js';

export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(AppError.badRequest('Invalid request payload.', error.issues));
        return;
      }
      next(error);
    }
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req.query);
      req.query = parsed as unknown as Request['query'];
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(AppError.badRequest('Invalid query parameters.', error.issues));
        return;
      }
      next(error);
    }
  };
}
