import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { MulterError } from 'multer';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/app-error.js';
import { sendError } from '../utils/api-response.js';

interface HttpError extends Error {
  status?: number;
  type?: string;
  expose?: boolean;
}

const HTTP_ERROR_MESSAGES: Record<string, { status: number; code: string; message: string }> = {
  'entity.too.large': {
    status: 413,
    code: 'PAYLOAD_TOO_LARGE',
    message: 'The request payload exceeds the allowed size limit.',
  },
  'entity.parse.failed': {
    status: 400,
    code: 'INVALID_JSON',
    message: 'The request body contains malformed JSON.',
  },
  'entity.verify.failed': {
    status: 400,
    code: 'INVALID_PAYLOAD',
    message: 'The request body could not be processed.',
  },
};

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error({ err, reqId: req.id }, err.message);
    } else {
      logger.warn({ code: err.code, statusCode: err.statusCode, path: req.path }, err.message);
    }
    sendError(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    logger.warn({ path: req.path, details }, 'Request validation failed');
    sendError(res, 400, 'VALIDATION_ERROR', 'Invalid request payload.', details);
    return;
  }

  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      logger.warn({ path: req.path, code: err.code }, 'Uploaded file exceeds the size limit');
      sendError(res, 413, 'PAYLOAD_TOO_LARGE', 'The uploaded file exceeds the allowed size limit.');
      return;
    }
    logger.warn({ path: req.path, code: err.code }, 'Multipart upload failed');
    sendError(res, 400, 'VALIDATION_ERROR', 'The uploaded file could not be processed.', {
      code: err.code,
    });
    return;
  }

  const httpError = err as HttpError;
  const mapped = httpError?.type !== undefined ? HTTP_ERROR_MESSAGES[httpError.type] : undefined;
  if (mapped) {
    logger.warn({ path: req.path, type: httpError.type }, mapped.message);
    sendError(res, mapped.status, mapped.code, mapped.message);
    return;
  }

  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');

  if (env.NODE_ENV === 'production') {
    sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred. Please try again later.');
    return;
  }

  const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
  sendError(res, 500, 'INTERNAL_ERROR', message);
}
