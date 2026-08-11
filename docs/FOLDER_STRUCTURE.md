# Folder Structure

This document tracks the repository structure. It is updated at the end of every Sprint.

## Current Structure (Sprint 6)

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
│   │   │   ├── schema.prisma          # User, RefreshToken, EmailVerificationToken, AuditLog, HealthMetric, MedicalReport, KnowledgeDocument, KnowledgeChunk
│   │   │   ├── migrations/            # add_auth_and_audit, add_health_metrics, add_medical_reports, add_knowledge_base (20260810021451)
│   │   │   └── seed.ts                # Demo users (admin/doctor/user)
│   │   │   └── seed-knowledge.ts      # 13 curated knowledge articles (kb:seed)
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
│   │   │   │   ├── knowledge/         # Medical knowledge base (Sprint 5)
│   │   │   │   │   ├── knowledge.controller.ts
│   │   │   │   │   ├── knowledge.repository.ts      # Prisma + raw FTS SQL
│   │   │   │   │   ├── knowledge.repository.types.ts
│   │   │   │   │   ├── knowledge.routes.ts          # search/list/get + ADMIN writes
│   │   │   │   │   ├── knowledge.service.ts         # chunking + RBAC + audit
│   │   │   │   │   └── chunking/
│   │   │   │   │       └── text-chunker.ts          # markdown-aware chunker
│   │   │   │   ├── assistant/         # AI health assistant (Sprint 6)
│   │   │   │   │   ├── assistant.controller.ts
│   │   │   │   │   ├── assistant.repository.ts      # Prisma chat sessions/messages
│   │   │   │   │   ├── assistant.repository.types.ts
│   │   │   │   │   ├── assistant.routes.ts          # POST /chat + sessions CRUD
│   │   │   │   │   ├── assistant.service.ts         # RAG orchestration + audit
│   │   │   │   │   ├── llm/
│   │   │   │   │   │   └── llm-client.ts            # OpenAI-compatible chat client
│   │   │   │   │   └── prompt/
│   │   │   │   │       └── prompt-builder.ts        # system safety rules + <knowledge> context
│   │   │   │   ├── metrics/           # HealthMetric CRUD
│   │   │   │   │   ├── metrics.controller.ts
│   │   │   │   │   ├── metrics.repository.ts
│   │   │   │   │   ├── metrics.repository.types.ts
│   │   │   │   │   ├── metrics.routes.ts
│   │   │   │   │   └── metrics.service.ts
│   │   │   │   ├── reports/           # Medical report upload, OCR & parsing
│   │   │   │   │   ├── reports.controller.ts
│   │   │   │   │   ├── reports.repository.ts
│   │   │   │   │   ├── reports.repository.types.ts
│   │   │   │   │   ├── reports.routes.ts
│   │   │   │   │   ├── reports.service.ts
│   │   │   │   │   ├── upload-report.ts          # multer memory storage
│   │   │   │   │   ├── ocr/                      # Sprint 4 OCR pipeline
│   │   │   │   │   │   ├── image-preprocessor.ts # downscale oversized images
│   │   │   │   │   │   ├── ocr-config.ts         # OCR_* env-derived settings
│   │   │   │   │   │   ├── ocr.types.ts          # OcrEngine contract
│   │   │   │   │   │   ├── pdf-page-renderer.ts  # pdfjs -> @napi-rs/canvas PNG
│   │   │   │   │   │   ├── pdf-text-extractor.ts # pdfjs embedded-text extraction
│   │   │   │   │   │   ├── report-ocr.ts         # orchestrates PDF/image OCR
│   │   │   │   │   │   └── tesseract-ocr.ts      # tesseract.js WASM (lazy worker)
│   │   │   │   │   ├── parsing/                  # Sprint 4 structured extraction
│   │   │   │   │   │   ├── lab-lexicon.ts        # canonical tests + OCR-noise aliases
│   │   │   │   │   │   └── report-parser.ts      # findings parser (ranges/flags/conf.)
│   │   │   │   │   ├── processing/
│   │   │   │   │   │   └── report-processor.ts   # OCR -> parser facade
│   │   │   │   │   └── storage/
│   │   │   │   │       ├── file-inspection.ts    # magic-bytes file-type allow-list
│   │   │   │   │       ├── local-report-storage.ts
│   │   │   │   │       ├── report-storage.ts     # storage factory (local vs S3)
│   │   │   │   │       ├── report-storage.types.ts
│   │   │   │   │       └── s3-report-storage.ts
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
│   │   │   ├── assistant.service.spec.ts  # Assistant unit tests (fake LLM + repository)
│   │   │   ├── fakes.ts               # Fake repositories + storage + email + processor + knowledge + LLM + assistant
│   │   │   ├── health.spec.ts         # API tests (supertest)
│   │   │   ├── knowledge-chunker.spec.ts  # Markdown chunker unit tests
│   │   │   ├── knowledge.service.spec.ts  # Knowledge service unit tests
│   │   │   ├── metrics.service.spec.ts# Metrics + dashboard unit tests
│   │   │   ├── report-ocr.spec.ts     # Real tesseract OCR test (vendored model)
│   │   │   ├── report-parser.spec.ts  # Findings parser tests
│   │   │   ├── reports.service.spec.ts# Reports unit tests (fake storage/processor)
│   │   │   ├── integration/
│   │   │   │   ├── assistant.integration.spec.ts # DB-backed chat/session tests
│   │   │   │   ├── auth.integration.spec.ts    # DB-backed API tests
│   │   │   │   ├── global-setup.ts            # migrates test DB before run
│   │   │   │   ├── knowledge.integration.spec.ts # DB-backed knowledge ingest/search tests
│   │   │   │   ├── metrics.integration.spec.ts # DB-backed metrics/dashboard tests
│   │   │   │   └── reports.integration.spec.ts # DB-backed report upload/download tests
│   │   │   └── setup.ts               # Test env pinning (incl. temp uploads dir)
│   │   ├── assets/                    # Vendored OCR assets (committed)
│   │   │   ├── tessdata/eng.traineddata.gz  # tesseract English model
│   │   │   └── fonts/DejaVuSans.ttf        # deterministic PDF rendering font
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
│       │   │   ├── dashboard/
│       │   │   │   └── page.tsx       # Health dashboard (protected)
│       │   │   ├── knowledge/
│       │   │   │   ├── [id]/page.tsx  # Article detail (protected)
│       │   │   │   └── page.tsx       # Search + browse knowledge base (protected)
│       │   │   ├── assistant/
│       │   │   │   └── page.tsx       # AI health assistant chat (protected)
│       │   │   └── reports/
│       │   │       ├── [id]/page.tsx  # Report detail + edit (protected)
│       │   │       └── page.tsx       # Report list + upload (protected)
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
│       │   │   │   ├── site-header.tsx          # Auth-aware nav (Dashboard/Reports/Knowledge links)
│       │   │   │   └── theme-toggle.tsx
│       │   │   ├── providers/
│       │   │   │   ├── query-provider.tsx   # TanStack Query
│       │   │   │   └── theme-provider.tsx   # next-themes
│       │   │   ├── reports/           # Sprint 3/4 report UI
│       │   │   │   ├── report-findings.tsx   # Findings table + extracted text
│       │   │   │   ├── report-list.tsx       # Table + pagination + download/delete
│       │   │   │   └── report-upload-form.tsx # Drag-and-drop upload (RHF + zod)
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
│       │   │   ├── assistant-api.ts   # Typed chat + session list/get/delete endpoints
│       │   │   ├── assistant-format.ts # Paragraph splitting + 24h time formatting
│       │   │   ├── assistant-format.spec.ts
│       │   │   ├── knowledge-api.ts   # Typed knowledge search/list/detail endpoints
│       │   │   ├── knowledge-format.ts # Category labels + safe <mark> snippet splitter
│       │   │   ├── knowledge-format.spec.ts
│       │   │   ├── metrics-api.ts     # Typed metrics + dashboard endpoints
│       │   │   ├── metrics-format.ts  # Value/date/delta formatting helpers
│       │   │   ├── metrics-format.spec.ts
│       │   │   ├── reports-api.ts     # Typed report endpoints (multipart upload)
│       │   │   ├── reports-format.ts  # Category/status/flag/file-size helpers
│       │   │   ├── reports-format.spec.ts
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
│       │   ├── types/enums.ts         # UserRole, ReportStatus, ReportCategory, HealthMetricType
│       │   ├── types/knowledge.ts     # KnowledgeCategory/Status, KnowledgeDocument, KnowledgeSearchResult
│       │   ├── types/metrics.ts       # HealthMetric, HEALTH_METRIC_META, DashboardOverview
│       │   ├── types/reports.ts       # MedicalReport, ReportFinding, ReportDetail, labels
│       │   ├── types/user.ts          # PublicUser, AuthSession
│       │   ├── types/assistant.ts     # ChatRole, ChatSession, ChatMessage, ChatResponse
│       │   ├── validators/auth.ts     # zod schemas for auth flows
│       │   ├── validators/knowledge.ts # create/update/search/list schemas + inferred types
│       │   ├── validators/assistant.ts # createChatMessage + listChatSessionsQuery schemas
│       │   ├── validators/metrics.ts  # createMetric/updateMetric/listMetricsQuery schemas
│       │   ├── validators/reports.ts  # createReportMetadata/updateReport/listReportsQuery schemas
│       │   └── index.ts
│       └── tsconfig.json
└── tsconfig.base.json
```

## Planned Growth

- `apps/api/src/modules/ai/` and further report modules per Sprint.
- `apps/web/src/app/(dashboard)/...` refined UI from Sprint 4.
- A semantic retrieval layer (pgvector embeddings behind the same `KnowledgeRepository`
  interface, driven by user-provided `USER_LLM_*` keys) to complement the Sprint 5 FTS engine.
- AI services (`apps/api/src/modules/ai/`) from Sprint 5.
