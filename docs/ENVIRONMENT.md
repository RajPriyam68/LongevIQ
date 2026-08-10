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
| `OCR_LANG_PATH`          | no       | `apps/api/assets/tessdata` | Directory containing `*.traineddata.gz` OCR models   |
| `OCR_MIN_TEXT_LENGTH`    | no       | `60`                   | Minimum extracted characters before a PDF is considered text-based |
| `OCR_MAX_PAGES`          | no       | `10` (max 50)          | Max PDF pages rendered/OCR'd per report               |
| `OCR_SCALE`              | no       | `2` (max 4)            | Render scale for OCR (higher = sharper, slower)      |
| `OCR_MAX_IMAGE_DIMENSION`| no       | `3000`                 | Max pixel dimension for OCR'd images (larger ones are downscaled) |

> **Development email fallback.** When `SMTP_HOST` is unset, verification emails are logged to the
> server console and the verification link is returned in the API response. This only happens when
> `NODE_ENV !== 'production'`; production never returns verification URLs.

> **OCR assets.** The English tesseract model (`eng.traineddata.gz`) and the DejaVu Sans font are
> vendored under `apps/api/assets` so OCR works deterministically in CI, containers, and the preview
> environment without any runtime downloads. Set `OCR_LANG_PATH` to point at a different model
> directory if needed.

> **Knowledge base (Sprint 5).** The retrieval engine is PostgreSQL full-text search over chunked
> `KnowledgeChunk` rows; it needs no extra configuration beyond `DATABASE_URL`. A future semantic
> layer will add pgvector embeddings behind the same repository interface and is designed to be
> driven by user-provided keys (`USER_LLM_API_KEY` / `USER_LLM_BASE_URL` / `USER_LLM_MODEL`),
> never by platform environment credentials.

### Placeholders for upcoming Sprints

These are documented now for planning; they are consumed by later Sprints:

| Variable               | Sprint | Purpose                        |
| ---------------------- | ------ | ------------------------------ |
| `USER_LLM_API_KEY`     | 6      | LLM provider key (user-supplied)|
| `USER_LLM_BASE_URL`    | 6      | LLM base URL (user-supplied)    |
| `USER_LLM_MODEL`       | 6      | LLM model name                 |
| `OPENAI_EMBEDDING_MODEL`| 6     | Semantic-layer embedding model |
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
