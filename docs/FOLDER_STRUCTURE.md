# Folder Structure

This document tracks the repository structure. It is updated at the end of every Sprint.

## Current Structure (Sprint 0)

```
.
├── .editorconfig
├── .github/
│   └── workflows/
│       └── ci.yml                     # Lint, typecheck, test, build, docker
├── .gitignore
├── .prettierignore
├── .prettierrc.json
├── README.md
├── apps/
│   ├── api/
│   │   ├── .env.example               # API env template
│   │   ├── .env.test.example
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── prisma/
│   │   │   ├── .env.example           # DATABASE_URL template
│   │   │   └── schema.prisma          # Datasource + generators (models from Sprint 1)
│   │   ├── src/
│   │   │   ├── app.ts                 # Express app factory
│   │   │   ├── server.ts              # Bootstrap + graceful shutdown
│   │   │   ├── config/
│   │   │   │   └── env.ts             # zod-validated environment
│   │   │   ├── middleware/
│   │   │   │   ├── error-handler.ts   # Central error mapping
│   │   │   │   └── not-found.ts       # 404 for unknown routes
│   │   │   ├── modules/
│   │   │   │   └── health/            # Feature module exemplar
│   │   │   │       ├── health.controller.ts
│   │   │   │       ├── health.routes.ts
│   │   │   │       └── health.service.ts
│   │   │   └── utils/
│   │   │       ├── api-response.ts    # Uniform API envelope
│   │   │       ├── app-error.ts       # Operational error model
│   │   │       └── logger.ts          # pino logger
│   │   ├── tests/
│   │   │   ├── health.spec.ts         # API tests (supertest)
│   │   │   └── setup.ts               # Test env pinning
│   │   ├── tsconfig.json
│   │   ├── tsconfig.test.json
│   │   └── vitest.config.ts
│   └── web/
│       ├── .env.example
│       ├── Dockerfile
│       ├── next.config.ts             # Rewrites (/api -> API), allowedDevOrigins
│       ├── postcss.config.mjs
│       ├── package.json
│       ├── src/
│       │   ├── app/
│       │   │   ├── globals.css        # Tailwind v4 design tokens (light/dark)
│       │   │   ├── error.tsx          # Error boundary
│       │   │   ├── icon.svg
│       │   │   ├── layout.tsx         # Root layout + providers
│       │   │   ├── loading.tsx        # Loading skeleton
│       │   │   ├── not-found.tsx
│       │   │   ├── page.tsx           # Landing page
│       │   │   ├── robots.ts
│       │   │   └── sitemap.ts
│       │   ├── components/
│       │   │   ├── api-status.tsx     # Server component -> /api/v1/health
│       │   │   ├── landing/
│       │   │   │   ├── cta-section.tsx
│       │   │   │   ├── features.tsx
│       │   │   │   ├── hero.tsx       # Framer Motion animated
│       │   │   │   └── how-it-works.tsx
│       │   │   ├── layout/
│       │   │   │   ├── medical-disclaimer.tsx
│       │   │   │   ├── site-footer.tsx
│       │   │   │   ├── site-header.tsx
│       │   │   │   └── theme-toggle.tsx
│       │   │   ├── providers/
│       │   │   │   ├── query-provider.tsx   # TanStack Query
│       │   │   │   └── theme-provider.tsx   # next-themes
│       │   │   └── ui/                      # shadcn/ui primitives
│       │   │       ├── badge.tsx
│       │   │       ├── button.tsx
│       │   │       ├── card.tsx
│       │   │       ├── input.tsx
│       │   │       ├── label.tsx
│       │   │       ├── separator.tsx
│       │   │       ├── skeleton.tsx
│       │   │       └── sonner.tsx
│       │   ├── lib/
│       │   │   ├── api-client.ts      # Axios instance + error mapping
│       │   │   ├── constants.ts
│       │   │   ├── utils.ts           # cn() helper
│       │   │   └── utils.spec.ts
│       │   └── vitest.config.ts
│       └── tsconfig.json
├── docker/
│   └── nginx/
│       └── nginx.conf                 # Reverse proxy (web + api)
├── docker-compose.yml                 # postgres(pgvector), redis, api, web, nginx
├── docs/
│   ├── ARCHITECTURE.md
│   ├── ENVIRONMENT.md
│   ├── API.md
│   ├── DEPLOYMENT.md
│   └── SECURITY.md
├── eslint.config.mjs
├── package-lock.json
├── package.json                       # Workspace root
├── packages/
│   └── shared/
│       ├── package.json
│       ├── src/
│       │   ├── constants/app.ts       # APP_NAME, MEDICAL_DISCLAIMER, ...
│       │   ├── types/api.ts           # API envelope + pagination types
│       │   ├── types/enums.ts         # UserRole, ReportStatus, HealthMetricType
│       │   └── index.ts
│       └── tsconfig.json
└── tsconfig.base.json
```

## Planned Growth

- `apps/api/src/modules/auth`, `users`, `reports`, `metrics`, ... per Sprint.
- `apps/api/prisma/migrations/` from Sprint 1.
- `apps/web/src/app/(dashboard)/...`, `apps/web/src/components/<feature>/...` from Sprint 2.
- `packages/shared/src/validators/` from Sprint 1 (zod schemas shared web/api).
- AI services (`apps/api/src/modules/ai/`) from Sprint 5.
