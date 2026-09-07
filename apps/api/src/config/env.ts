import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

// Loads apps/api/.env (module-relative so it works regardless of CWD).
// Existing process.env values are never overridden, so platform-provided
// variables and the test setup remain authoritative.
function loadDotEnvFile(): void {
  const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '.env');
  try {
    if (fs.existsSync(envPath)) {
      process.loadEnvFile(envPath);
      // Empty values in the file mean "not configured" (e.g. USER_LLM_API_KEY=
      // or SMTP_USER=). Normalize them to unset so the optional schema fields
      // take their defaults instead of failing on empty strings.
      for (const key of Object.keys(process.env)) {
        if (process.env[key] === '') {
          delete process.env[key];
        }
      }
    }
  } catch {
    // Leave env parsing to the schema validation below.
  }
}

function devSecret(field: string): string {
  return `${field}_DEV_INSECURE_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(4000),
  API_PREFIX: z.string().startsWith('/').default('/api'),
  API_VERSION: z
    .string()
    .regex(/^v\d+$/)
    .default('v1'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),

  DATABASE_URL: z.string().min(1).optional(),
  JWT_ACCESS_SECRET: z.string().min(1).optional(),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(7),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  // Explicit TLS (SMTPS) on port 465. When false and SMTP_HOST/SMTP_PORT are
  // set, nodemailer negotiates STARTTLS opportunistically on plain ports.
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  // Canonical From address for outgoing email. EMAIL_FROM is kept as a
  // deprecated alias so existing deployments keep working; SMTP_FROM wins when
  // both are set (resolution happens in email.service.ts).
  SMTP_FROM: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  // Sprint 3: medical report storage. When S3_BUCKET is set, files are stored in S3;
  // otherwise they are written to a local directory (STORAGE_UPLOAD_DIR).
  STORAGE_UPLOAD_DIR: z.string().min(1).optional(),
  MAX_UPLOAD_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(10 * 1024 * 1024),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  // Sprint 4: OCR + report parsing. OCR_LANG_PATH overrides the bundled English
  // tesseract language model (apps/api/assets/tessdata). The remaining knobs bound
  // the CPU/memory cost of processing untrusted uploads.
  OCR_LANG_PATH: z.string().min(1).optional(),
  OCR_MIN_TEXT_LENGTH: z.coerce.number().int().nonnegative().default(60),
  OCR_MAX_PAGES: z.coerce.number().int().positive().max(50).default(10),
  OCR_SCALE: z.coerce.number().positive().max(4).default(2),
  OCR_MAX_IMAGE_DIMENSION: z.coerce.number().int().positive().default(3000),

  // Sprint 6: AI health assistant. Credentials are supplied by the deployment
  // operator at runtime (see apps/api/.env.example); the platform never injects
  // its own keys. Leave USER_LLM_API_KEY blank to disable AI chat gracefully.
  USER_LLM_API_KEY: z.string().min(1).optional(),
  USER_LLM_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  USER_LLM_MODEL: z.string().min(1).default('gpt-4o-mini'),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
  // Retrieval-to-prompt knobs for the RAG chat assistant.
  ASSISTANT_RETRIEVAL_TOP_K: z.coerce.number().int().min(1).max(20).default(4),
  ASSISTANT_CONTEXT_CHAR_LIMIT: z.coerce.number().int().min(1000).max(100_000).default(12_000),
  ASSISTANT_HISTORY_MESSAGES: z.coerce.number().int().min(1).max(50).default(12),
  ASSISTANT_CHAT_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  ASSISTANT_CHAT_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  loadDotEnvFile();
  const base = process.env.NODE_ENV ?? 'development';
  const isDevOrTest = base === 'development' || base === 'test';

  const candidates: Record<string, unknown> = { ...process.env };

  for (const field of ['JWT_ACCESS_SECRET'] as const) {
    if (!candidates[field] && isDevOrTest) {
      candidates[field] = devSecret(field);
    }
  }

  const parsed = envSchema.safeParse(candidates);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  const data = parsed.data;

  if (!isDevOrTest) {
    for (const field of ['JWT_ACCESS_SECRET', 'DATABASE_URL'] as const) {
      if (!data[field]) {
        throw new Error(`Invalid environment configuration:\n  - ${field} is required in ${base}`);
      }
    }
  }

  if (data.S3_BUCKET && !data.S3_REGION && !data.S3_ENDPOINT) {
    throw new Error(
      'Invalid environment configuration:\n  - S3_REGION or S3_ENDPOINT is required when S3_BUCKET is set',
    );
  }

  return data;
}

export const env: Env = loadEnv();
