import { z } from 'zod';

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
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('LongevIQ <no-reply@longeviq.example.com>'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
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

  return data;
}

export const env: Env = loadEnv();
