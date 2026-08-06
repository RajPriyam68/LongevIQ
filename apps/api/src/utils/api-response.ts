import type { Response } from 'express';
import type { ApiErrorResponse, ApiSuccessResponse } from '@longeviq/shared';

export function sendSuccess<T>(res: Response, data: T, status = 200): void {
  const body: ApiSuccessResponse<T> = { success: true, data };
  res.status(status).json(body);
}

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown,
): void {
  const body: ApiErrorResponse = { success: false, error: { code, message, details } };
  res.status(status).json(body);
}
