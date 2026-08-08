import path from 'node:path';
import type { Env } from '../../../config/env.js';
import { LocalReportStorage } from './local-report-storage.js';
import { S3ReportStorage } from './s3-report-storage.js';
import type { ReportStorage } from './report-storage.types.js';

export function createReportStorage(env: Env): ReportStorage {
  if (env.S3_BUCKET) {
    return new S3ReportStorage({
      bucket: env.S3_BUCKET,
      region: env.S3_REGION ?? 'us-east-1',
      endpoint: env.S3_ENDPOINT,
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    });
  }
  return new LocalReportStorage(env.STORAGE_UPLOAD_DIR ?? path.resolve(process.cwd(), '.uploads'));
}
