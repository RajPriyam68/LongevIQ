import os from 'node:os';
import path from 'node:path';

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.PORT = '4100';
process.env.DATABASE_URL ??= 'postgresql://longeviq:longeviq@localhost:5432/longeviq_test';
process.env.JWT_ACCESS_SECRET ??= 'test-secret-please-change-in-production';
process.env.STORAGE_UPLOAD_DIR = path.join(os.tmpdir(), 'longeviq-reports-test');
process.env.MAX_UPLOAD_BYTES = '2048';
process.env.USER_LLM_API_KEY ||= 'test-llm-key';
process.env.USER_LLM_BASE_URL ||= 'https://api.openai.com/v1';
process.env.USER_LLM_MODEL ||= 'gpt-4o-mini';
