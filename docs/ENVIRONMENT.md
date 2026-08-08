# Environment Variables

All configuration is validated at startup with zod in `apps/api/src/config/env.ts`. Invalid or
missing required variables cause the process to **fail fast**.

## API (`apps/api/.env`)

| Variable                 | Required | Default                | Description                                            |
| ------------------------ | -------- | ---------------------- | ------------------------------------------------------ |
| `NODE_ENV`               | no       | `development`          | `development` / `test` / `production`                  |
| `PORT`                   | no       | `4000`                 | HTTP listen port                                       |
| `API_PREFIX`             | no       | `/api`                 | URL prefix for API routes                              |
| `API_VERSION`            | no       | `v1`                   | API version segment                                    |
| `LOG_LEVEL`              | no       | `info`                 | pino log level (`fatal`..`trace`, `silent`)            |
| `CORS_ORIGINS`           | no       | `http://localhost:3000`| Comma-separated allowed origins                        |
| `RATE_LIMIT_WINDOW_MS`   | no       | `60000`                | Rate-limit window (ms)                                 |
| `RATE_LIMIT_MAX`         | no       | `100`                  | Max requests per window per IP                         |
| `DATABASE_URL`           | test/prod| `postgresql://longeviq:longeviq@localhost:5432/longeviq` | PostgreSQL connection string  |
| `JWT_ACCESS_SECRET`      | prod     | auto-generated (dev/test) | HS256 signing secret for access tokens (min 32 chars) |
| `JWT_ACCESS_TTL`         | no       | `15m`                  | Access-token lifetime (jose `ms` format)               |
| `JWT_REFRESH_TTL_DAYS`   | no       | `7`                    | Refresh-token lifetime in days                         |
| `FRONTEND_URL`           | no       | `http://localhost:3000`| Public web origin (verification links / OAuth redirects) |
| `COOKIE_SECURE`          | no       | `false`                | Mark auth cookies `Secure` (set true behind HTTPS)     |
| `GOOGLE_CLIENT_ID`       | no       | *(empty)*              | Google OAuth client id (empty disables Google sign-in) |
| `GOOGLE_CLIENT_SECRET`   | no       | *(empty)*              | Google OAuth client secret                             |
| `SMTP_HOST`              | no       | *(empty)*              | SMTP server for transactional email                    |
| `SMTP_PORT`              | no       | `587`                  | SMTP port                                              |
| `SMTP_SECURE`            | no       | `false`                | Use TLS on SMTP connection                             |
| `SMTP_USER` / `SMTP_PASS`| no       | *(empty)*              | SMTP credentials                                       |
| `EMAIL_FROM`             | no       | `LongevIQ <no-reply@longeviq.dev>` | From address for outgoing email         |
| `STORAGE_UPLOAD_DIR`     | no       | `<api cwd>/.uploads`   | Directory for locally stored report files             |
| `MAX_UPLOAD_BYTES`       | no       | `10485760`             | Max uploaded report file size (bytes)                 |
| `S3_BUCKET`              | no       | *(empty)*              | S3 bucket; when set, report files go to S3 instead of disk |
| `S3_REGION`              | no*      | *(empty)*              | S3 region (required when `S3_BUCKET` is set, unless `S3_ENDPOINT` is used) |
| `S3_ENDPOINT`            | no       | *(empty)*              | Custom S3-compatible endpoint (e.g. MinIO/LocalStack) |
| `S3_ACCESS_KEY_ID`       | no       | *(empty)*              | S3 credentials (optional; falls back to the SDK credential chain) |
| `S3_SECRET_ACCESS_KEY`   | no       | *(empty)*              | S3 credentials                                         |

> **Development email fallback.** When `SMTP_HOST` is unset, verification emails are logged to the
> server console and the verification link is returned in the API response. This only happens when
> `NODE_ENV !== 'production'`; production never returns verification URLs.

### Placeholders for upcoming Sprints

These are documented now for planning; they are consumed by later Sprints:

| Variable               | Sprint | Purpose                        |
| ---------------------- | ------ | ------------------------------ |
| `OPENAI_API_KEY`       | 5      | LLM provider                   |
| `GOOGLE_GEMINI_API_KEY`| 5      | LLM provider                   |
| `OPENAI_EMBEDDING_MODEL`| 5     | Embedding model name           |
| `REDIS_URL`            | 9/14   | Queues / notifications         |

## Web (`apps/web/.env`)

| Variable                   | Required | Default              | Description                                          |
| -------------------------- | -------- | -------------------- | ---------------------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | no       | `/api/v1`            | Browser-side API base; leave empty to use the rewrite|
| `NEXT_PUBLIC_API_URL`      | no       | `http://localhost:4000` | Backend URL used by the Next.js rewrite target     |

The Next.js rewrite (`next.config.ts`) proxies `/api/:path*` to the backend, so in development no
additional CORS configuration is needed in the browser.

## Prisma (`apps/api/prisma/.env`)

| Variable       | Required | Description                     |
| -------------- | -------- | ------------------------------- |
| `DATABASE_URL` | yes      | PostgreSQL connection string    |

## Docker Compose

| Variable          | Default    | Description              |
| ----------------- | ---------- | ------------------------ |
| `POSTGRES_USER`   | `longeviq` | Database user            |
| `POSTGRES_PASSWORD`| `longeviq`| Database password        |
| `POSTGRES_DB`     | `longeviq` | Database name            |

## Security Notes

- Secrets are **never committed**. Only `.env.example` files are tracked.
- Use strong, unique secrets in any non-local environment.
- In production set `NODE_ENV=production`; this disables pretty logs and masks internal error
  messages returned to clients.
