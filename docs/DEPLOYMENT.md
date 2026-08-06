# Deployment

## Local Development

Infrastructure (PostgreSQL + pgvector, Redis):

```bash
docker compose up -d postgres redis
```

Then run the apps:

```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:4000/api/v1/health

## Containerized Deployment

Build and run the full stack (web, api, nginx, postgres, redis):

```bash
docker compose up -d --build
```

- Nginx listens on port 80.
- `/` → web container (Next.js on :3000)
- `/api/*` → api container (Express on :4000)

Apply database migrations before first boot (Sprint 1+):

```bash
docker compose exec api npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
```

## CI/CD (GitHub Actions)

`.github/workflows/ci.yml` runs on push/PR to `master`:

1. **quality**: install → prisma generate → typecheck → lint → format check → test → build
   (PostgreSQL service container provided for tests that need a database).
2. **docker**: builds API and Web images (push to a registry to be wired in Sprint 15).

## Environments

| Environment | Purpose                             |
| ----------- | ----------------------------------- |
| development | Local, hot-reload, pretty logs      |
| test        | Vitest/supertest, silent logs       |
| production  | Masked errors, structured JSON logs |

Production requires setting all secrets from `docs/ENVIRONMENT.md` (never from example files).
TLS terminates at the edge (load balancer / Nginx). See `docs/SECURITY.md`.

## Health Checks

- API: `GET /api/v1/health` (used by the compose healthcheck).
- Web: `GET /` (used by the compose healthcheck).
