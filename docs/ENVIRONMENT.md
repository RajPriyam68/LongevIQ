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

### Placeholders for upcoming Sprints

These are documented now for planning; they are consumed by later Sprints:

| Variable               | Sprint | Purpose                        |
| ---------------------- | ------ | ------------------------------ |
| `DATABASE_URL`         | 1      | PostgreSQL connection string   |
| `JWT_ACCESS_SECRET`    | 1      | Access-token signing secret    |
| `JWT_REFRESH_SECRET`   | 1      | Refresh-token signing secret   |
| `JWT_ACCESS_TTL`       | 1      | Access-token lifetime         |
| `JWT_REFRESH_TTL`      | 1      | Refresh-token lifetime        |
| `GOOGLE_CLIENT_ID`     | 1      | Google OAuth client id         |
| `GOOGLE_CLIENT_SECRET` | 1      | Google OAuth client secret     |
| `S3_BUCKET`            | 3      | Report storage bucket          |
| `S3_REGION`            | 3      | S3 region                      |
| `S3_ACCESS_KEY_ID`     | 3      | S3 credentials                 |
| `S3_SECRET_ACCESS_KEY` | 3      | S3 credentials                 |
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
