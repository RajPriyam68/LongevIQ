# Architecture

This document describes the LongevIQ architecture, its principles, and the patterns every Sprint
must follow.

## 1. System Overview

LongevIQ is a three-tier monorepo:

- **Web application** (`apps/web`): Next.js 15 App Router, React 19, Tailwind CSS, shadcn/ui.
- **REST API** (`apps/api`): Express.js + TypeScript, versioned under `/api/v1`.
- **Shared package** (`packages/shared`): cross-app types, enums, constants.

Data is stored in PostgreSQL (with pgvector for embeddings). File storage uses AWS S3. AI
capabilities (LLM, embeddings, OCR, speech) are isolated behind dedicated services.

## 2. Backend Layering (Clean Architecture)

Each feature module follows the same flow:

```
Route (HTTP)  →  Controller (parse/validate/respond)  →  Service (business logic)
                                                     →  Repository (data access)
                                                     →  Database (Prisma)
```

- **Controller** – thin. Parses the request, invokes the service, formats the response with
  `sendSuccess`/`sendError`.
- **Service** – holds business logic. Never depends on Express types.
- **Repository** – the only layer that touches the database via Prisma.
- **Routes** – wire controller methods to URLs; compose shared middleware.

Dependency injection is done manually at the route level (composition root) to keep modules
testable without a DI framework.

## 3. Module Layout (Feature-based)

```
apps/api/src/
  config/             Environment schema (zod) + application config
  middleware/         Cross-cutting middleware (auth, errors, validation, rate limit)
  modules/
    <feature>/
      <feature>.routes.ts       Express router
      <feature>.controller.ts   HTTP concerns
      <feature>.service.ts      Business logic
      <feature>.repository.ts   Prisma data access
      <feature>.types.ts        Feature-local types / zod schemas
  utils/              Shared helpers (logger, api-response, app-error)
  app.ts              Express application factory
  server.ts           Bootstrap + graceful shutdown
```

Business logic is never duplicated; cross-feature logic lives in shared services or
`packages/shared`.

## 4. API Conventions

- All routes are versioned: `/api/v1/...`.
- All responses follow a uniform envelope:

```json
{ "success": true, "data": { ... } }
{ "success": false, "error": { "code": "...", "message": "...", "details": ... } }
```

- Errors use stable machine-readable `code` values:
  `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`,
  `RATE_LIMITED`, `INTERNAL_ERROR`, `PAYLOAD_TOO_LARGE`, `INVALID_JSON`.
- Lists are paginated with `{ items, pagination: { page, limit, total, totalPages } }`.
- Requests are validated with zod; validation errors return `400 VALIDATION_ERROR`.

## 5. Frontend Architecture

- **Server Components** by default; **Client Components** only when interactivity requires them.
- Feature-based folders under `apps/web/src/components/<feature>/`; reusable UI primitives live in
  `apps/web/src/components/ui/`.
- State: TanStack Query (server state) + Zustand (client state).
- Forms: React Hook Form + zod validation.
- The medical disclaimer (`MedicalDisclaimer`) is rendered in the footer and beside every AI
  response.

## 6. Cross-cutting Concerns

- **Logging**: pino + pino-http; structured JSON in production, pretty in development; sensitive
  headers/tokens redacted.
- **Errors**: central error handler maps `AppError`, `ZodError`, and body-parser errors to the API
  envelope; unknown errors are logged and masked in production.
- **Security**: Helmet, CORS allow-list, express-rate-limit, payload size limits, strict env
  validation. See `docs/SECURITY.md`.
- **Configuration**: all environment variables are validated at boot with zod; invalid
  configuration fails fast.
- **Health checks**: `/api/v1/health` reports app/version/environment/uptime.

## 7. Configuration

- `apps/api/.env.example` – API environment template.
- `apps/web/.env.example` – Web environment template.
- `apps/api/prisma/.env.example` – Prisma `DATABASE_URL` template.
- See `docs/ENVIRONMENT.md` for the full variable reference.
