# Folder Structure

This document tracks the repository structure. It is updated at the end of every Sprint.

## Current Structure (Sprint 2)

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
│   │   ├── .env.example               # API env template (Sprint 1 vars included)
│   │   ├── .env.test.example
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── prisma/
│   │   │   ├── .env.example           # DATABASE_URL template
│   │   │   ├── schema.prisma          # User, RefreshToken, EmailVerificationToken, AuditLog, HealthMetric
│   │   │   ├── migrations/            # add_auth_and_audit, add_health_metrics (20260807142018)
│   │   │   └── seed.ts                # Demo users (admin/doctor/user)
│   │   ├── src/
│   │   │   ├── app.ts                 # Express app factory
│   │   │   ├── server.ts              # Bootstrap + graceful shutdown
│   │   │   ├── config/
│   │   │   │   └── env.ts             # zod-validated environment
│   │   │   ├── container.ts           # Composition root (manual DI)
│   │   │   ├── db/
│   │   │   │   └── prisma.ts          # PrismaClient singleton
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts            # requireAuth / optionalAuth / requireRoles
│   │   │   │   ├── error-handler.ts   # Central error mapping
│   │   │   │   ├── not-found.ts       # 404 for unknown routes
│   │   │   │   └── validate.ts        # validateBody + validateQuery (zod)
│   │   │   ├── modules/
│   │   │   │   ├── auth/              # Authentication module
│   │   │   │   │   ├── auth.controller.ts
│   │   │   │   │   ├── auth.repository.ts
│   │   │   │   │   ├── auth.repository.types.ts
│   │   │   │   │   ├── auth.routes.ts
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   ├── email.service.ts
│   │   │   │   │   ├── oauth.service.ts
│   │   │   │   │   ├── password.service.ts
│   │   │   │   │   └── token.service.ts
│   │   │   │   ├── dashboard/         # Aggregated health overview
│   │   │   │   │   ├── dashboard.controller.ts
│   │   │   │   │   ├── dashboard.routes.ts
│   │   │   │   │   └── dashboard.service.ts
│   │   │   │   ├── health/            # Feature module exemplar
│   │   │   │   │   ├── health.controller.ts
│   │   │   │   │   ├── health.routes.ts
│   │   │   │   │   └── health.service.ts
│   │   │   │   ├── metrics/           # HealthMetric CRUD
│   │   │   │   │   ├── metrics.controller.ts
│   │   │   │   │   ├── metrics.repository.ts
│   │   │   │   │   ├── metrics.repository.types.ts
│   │   │   │   │   ├── metrics.routes.ts
│   │   │   │   │   └── metrics.service.ts
│   │   │   │   └── users/             # Profile + password endpoints
│   │   │   │       ├── users.controller.ts
│   │   │   │       └── users.routes.ts
│   │   │   ├── types/
│   │   │   │   └── express.d.ts       # Request.user augmentation
│   │   │   └── utils/
│   │   │       ├── api-response.ts    # Uniform API envelope
│   │   │       ├── app-error.ts       # Operational error model
│   │   │       ├── async-handler.ts   # Express 4 async error wrapper
│   │   │       └── logger.ts          # pino logger
│   │   ├── tests/
│   │   │   ├── auth.service.spec.ts   # Unit tests (fake repository)
│   │   │   ├── fakes.ts               # Fake repository + email service + metrics repo
│   │   │   ├── health.spec.ts         # API tests (supertest)
│   │   │   ├── metrics.service.spec.ts# Metrics + dashboard unit tests
│   │   │   ├── integration/
│   │   │   │   ├── auth.integration.spec.ts    # DB-backed API tests
│   │   │   │   ├── global-setup.ts            # migrates test DB before run
│   │   │   │   └── metrics.integration.spec.ts # DB-backed metrics/dashboard tests
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
│       │   │   ├── sitemap.ts
│       │   │   ├── account/
│       │   │   │   └── page.tsx       # Profile + change password (protected)
│       │   │   ├── auth/
│       │   │   │   ├── callback/page.tsx       # Google OAuth return
│       │   │   │   ├── login/page.tsx
│       │   │   │   ├── register/page.tsx
│       │   │   │   └── verify-email/page.tsx
│       │   │   └── dashboard/
│       │   │       └── page.tsx       # Health dashboard (protected)
│       │   ├── components/
│       │   │   ├── api-status.tsx     # Server component -> /api/v1/health
│       │   │   ├── auth/
│       │   │   │   ├── guest-only.tsx
│       │   │   │   └── require-auth.tsx
│       │   │   ├── dashboard/         # Sprint 2 dashboard UI
│       │   │   │   ├── metric-chart.tsx      # Recharts line chart
│       │   │   │   ├── metric-form.tsx       # Add-measurement form (RHF + zod)
│       │   │   │   ├── overview-cards.tsx    # Latest/trend/count per type
│       │   │   │   └── recent-metrics.tsx    # Recent list + delete
│       │   │   ├── landing/
│       │   │   │   ├── cta-section.tsx
│       │   │   │   ├── features.tsx
│       │   │   │   ├── hero.tsx       # Framer Motion animated
│       │   │   │   └── how-it-works.tsx
│       │   │   ├── layout/
│       │   │   │   ├── medical-disclaimer.tsx
│       │   │   │   ├── site-footer.tsx
│       │   │   │   ├── site-header.tsx          # Auth-aware nav (Dashboard link)
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
│       │   │   ├── api-client.ts      # Axios + refresh-token interceptor (+ apiDelete)
│       │   │   ├── api-client.spec.ts
│       │   │   ├── auth-api.ts        # Typed auth endpoints
│       │   │   ├── auth-store.ts      # Zustand persist (accessToken/user)
│       │   │   ├── auth-store.spec.ts
│       │   │   ├── constants.ts
│       │   │   ├── metrics-api.ts     # Typed metrics + dashboard endpoints
│       │   │   ├── metrics-format.ts  # Value/date/delta formatting helpers
│       │   │   ├── metrics-format.spec.ts
│       │   │   ├── utils.ts           # cn() helper
│       │   │   └── utils.spec.ts
│       │   ├── test/
│       │   │   └── setup.ts           # DOM stubs for unit tests
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
│       │   ├── types/metrics.ts       # HealthMetric, HEALTH_METRIC_META, DashboardOverview
│       │   ├── types/user.ts          # PublicUser, AuthSession
│       │   ├── validators/auth.ts     # zod schemas for auth flows
│       │   ├── validators/metrics.ts  # createMetric/updateMetric/listMetricsQuery schemas
│       │   └── index.ts
│       └── tsconfig.json
└── tsconfig.base.json
```

## Planned Growth

- `apps/api/src/modules/reports`, `ai`, ... per Sprint.
- `apps/web/src/app/(dashboard)/...` refined UI from Sprint 3.
- AI services (`apps/api/src/modules/ai/`) from Sprint 5.
