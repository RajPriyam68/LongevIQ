import multer from 'multer';
import { env } from '../../config/env.js';

export const reportUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_UPLOAD_BYTES,
    files: 1,
    fields: 10,
  },
});
