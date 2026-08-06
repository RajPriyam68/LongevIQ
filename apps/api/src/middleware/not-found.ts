import type { NextFunction, Request, Response } from 'express';
import { sendError } from '../utils/api-response.js';

export function notFoundHandler(req: Request, res: Response, _next: NextFunction): void {
  sendError(res, 404, 'NOT_FOUND', `Route not found: ${req.method} ${req.originalUrl}`);
}
