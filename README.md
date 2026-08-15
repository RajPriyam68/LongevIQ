# LongevIQ

**Your AI Health Copilot for a Longer, Healthier Life.**

LongevIQ is a production-grade, AI-powered healthcare and wellness SaaS platform. Users can manage
health profiles, upload and understand medical reports, chat with their documents, track health
metrics, and receive educational nutrition, workout, and medication-reminder guidance.

> **Educational and wellness-focused.** LongevIQ never diagnoses diseases, never prescribes
> treatments, and never replaces a physician. Every AI response includes a medical disclaimer.

---

## Architecture at a Glance

```
┌─────────────┐        ┌──────────────┐        ┌──────────────────┐
│   Browser   │ ─────▶ │  Next.js 15  │ ─────▶ │   Express API    │
│  (React 19) │        │   (App)      │ /api   │  (v1, REST)      │
└─────────────┘        └──────────────┘        └────────┬─────────┘
                                                       │ Prisma
                                                ┌──────┴──────┐
                                                │ PostgreSQL │
                                                │ FTS + pgvec │
                                                └─────────────┘
```

- **Monorepo** managed with npm workspaces.
- **Clean Architecture** on the backend: Controller → Service → Repository → Database.
- **Shared package** (`@longeviq/shared`) holds cross-app types and constants.
- **AI logic isolated** behind services (added from Sprint 5 onward).
- **Docker + Docker Compose + Nginx** for local and production deployment.
- **GitHub Actions** runs lint, typecheck, tests, build, and Docker builds.

---

## Repository Structure

```
apps/
  api/        Express + TypeScript REST API (versioned, /api/v1)
  web/        Next.js 15 App Router frontend (React 19, Tailwind, shadcn/ui)
packages/
  shared/     Shared types, enums, constants (@longeviq/shared)
docker/
  nginx/      Nginx reverse-proxy configuration
docs/         Architecture, API, environment and security documentation
.github/
  workflows/  CI pipeline
```

## Tech Stack

| Layer       | Technologies                                                                  |
| ----------- | ----------------------------------------------------------------------------- |
| Frontend    | Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui, RHF, Zod, TanStack Query, Zustand, Axios, Recharts, Framer Motion |
| Backend     | Node.js 22, Express.js, TypeScript                                            |
| Database    | PostgreSQL, Prisma ORM, pgvector (FTS retrieval shipped in Sprint 5)     |
| AI          | OpenAI-compatible models, Google Gemini, LangChain, RAG, OCR, Whisper, TTS    |
| Auth        | JWT + refresh tokens, Google OAuth, RBAC                                      |
| Storage     | AWS S3                                                                         |
| Deployment  | Docker, Docker Compose, Nginx, GitHub Actions, AWS, Vercel                    |

---

## Prerequisites

- Node.js 22 LTS (`node >= 22`)
- npm 10+
- Docker + Docker Compose (for the database and containerized deployment)

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 3. Start infrastructure (PostgreSQL + pgvector, Redis)
docker compose up -d postgres redis

# 4. Start both apps (web on :3000, api on :4000)
npm run dev
```

- Web: http://localhost:3000
- API health: http://localhost:4000/api/v1/health
- API through the web proxy: http://localhost:3000/api/v1/health

## Scripts

| Command                 | Description                                  |
| ----------------------- | -------------------------------------------- |
| `npm run dev`           | Run API + Web in watch mode                  |
| `npm run build`         | Build shared, api, then web                  |
| `npm run typecheck`     | Typecheck all workspaces                     |
| `npm run lint`          | ESLint across api and web                    |
| `npm run test`          | Vitest suites for api and web                |
| `npm run format`        | Format the whole repository with Prettier    |
| `npm run format:check`  | Verify formatting                            |
| `npm run kb:seed -w @longeviq/api` | Seed the knowledge base articles (idempotent) |

## Deployment

```bash
docker compose up -d --build
```

Nginx (port 80) routes `/` to the web container and `/api/*` to the API container.
See `docs/DEPLOYMENT.md` and `docs/ENVIRONMENT.md` for details.

### Sprint 1 — Authentication & User Management

- **API**: register, login, refresh (rotation + reuse detection), logout, email verification,
  resend verification, Google OAuth, and current-user profile/password endpoints under
  `/api/v1/auth` and `/api/v1/users`.
- **Security**: argon2id password hashing, short-lived HS256 access JWTs, DB-backed opaque refresh
  tokens stored in an httpOnly cookie, per-IP auth rate limiting, and audit logging for auth
  events.
- **Data model**: `User`, `RefreshToken`, `EmailVerificationToken`, `AuditLog` (Prisma migration
  `20260807021245_add_auth_and_audit`).
- **Frontend**: sign-in, register, verify-email, Google callback, and account pages; Zustand auth
  store with persistence; axios client with single-flight refresh interceptor; auth-guarded
  `/account`.
- **Tests**: 20 API tests (unit + DB-backed integration) and 14 web tests.
- **Demo accounts** (seed): `admin@longeviq.dev`, `doctor@longeviq.dev`, `demo@longeviq.dev`
  (passwords documented in `apps/api/prisma/seed.ts`).

### Sprint 2 — Health Dashboard

- **API**: owner-scoped `HealthMetric` CRUD (`POST/GET/PATCH/DELETE /api/v1/metrics`) and a
  dashboard overview (`GET /api/v1/dashboard/overview`) with per-type latest/previous/delta and
  counts, plus the 10 most recent measurements.
- **Metrics**: 8 supported types (blood pressure, heart rate, weight, blood glucose, BMI, sleep,
  steps, body temperature) with canonical units and ranges enforced by shared zod schemas;
  compound types (e.g. blood pressure) require a secondary value.
- **Data model**: `HealthMetric` (Prisma migration `20260807142018_add_health_metrics`) indexed on
  `(userId, type, recordedAt)`.
- **Security**: metrics are scoped to the authenticated user; cross-user access returns `404`;
  create/update/delete are audit-logged (`DATA.METRIC_*`).
- **Frontend**: protected `/dashboard` page with overview cards, a Recharts trend chart per metric
  type, an add-measurement form (RHF + zod), and a recent-measurements list with delete; the site
  header links to the dashboard for signed-in users.
- **Tests**: 36 API tests (unit + DB-backed integration) and 24 web tests.

### Sprint 3 — Medical Report Upload & Management

- **API**: owner-scoped report management under `/api/v1/reports` — multipart upload
  (`POST /api/v1/reports`, `file` field + metadata), list with `category` filter and
  pagination (`GET /api/v1/reports`), detail (`GET /api/v1/reports/:id`), download
  (`GET /api/v1/reports/:id/file`), update (`PATCH /api/v1/reports/:id`), and delete
  (`DELETE /api/v1/reports/:id`).
- **Storage**: pluggable storage layer — local disk (`STORAGE_UPLOAD_DIR`, mode 0600) in
  dev/test and S3 (`S3_BUCKET` + region/endpoint/credentials) in production; files are
  validated by magic bytes (PDF/PNG/JPEG) with a canonical MIME/extension, never trusting
  client-provided content type.
- **Data model**: `MedicalReport` (Prisma migration `20260808133949_add_medical_reports`)
  indexed on `(userId, createdAt)` and `(userId, category)`; statuses default to
  `UPLOADED` (PROCESSING/PARSED/FAILED reserved for the Sprint 4 OCR pipeline).
- **Security**: files stored under random UUID keys with a strict name pattern; per-owner
  isolation (cross-user access returns `404`); 10 MB upload limit mapped to `413`; uploads
  rejected before hitting storage when the file type/size is invalid; download sets
  `Content-Disposition: inline` with both ASCII and RFC 5987 filename encodings;
  create/update/delete/download are audit-logged (`DATA.REPORT_*`).
- **Frontend**: protected `/reports` page with drag-and-drop upload, category filter pills,
  and a paginated report table with download/delete; `/reports/[id]` detail page with an
  inline edit form; the site header links to Reports for signed-in users.
- **Tests**: 55 API tests (unit + DB-backed integration) and 28 web tests.

### Sprint 4 — OCR & Medical Report Parsing

- **OCR pipeline**: every upload is processed synchronously. Digital PDFs have their text
  extracted with `pdfjs-dist`; scanned PDFs and PNG/JPEG images are rendered with
  `@napi-rs/canvas` and read with `tesseract.js` (WASM). The English model
  (`eng.traineddata.gz`) and the rendering font (`DejaVuSans.ttf`) are vendored in the
  repository (`apps/api/assets`) so processing is deterministic and never downloads at
  runtime (`OCR_LANG_PATH` overrides the model location).
- **Parsing**: a lexicon of 30 canonical lab tests (bloodwork/general) with OCR-noise
  aliases (e.g. `Alc` → Hemoglobin A1c) extracts structured findings — name, value, unit,
  reference range, flag (normal/high/low), and a confidence score — with single- and
  two-bound ranges and explicit `H`/`L`/`↑`/`*` markers. Unrecognized rows fall back to a
  generic 0.6-confidence finding. Imaging/other categories store raw text only.
- **Results**: reports become `PARSED` with `findings` + `parsedText` + `parsedAt`, or
  `FAILED` with a `processingError`; upload always returns `201` and parsing failures never
  lose the file. Processing is audited (`DATA.REPORT_PROCESSED`).
- **Data model**: `ReportFinding` and `ReportFindingFlag` plus `parsedText`,
  `processingError`, `parsedAt` columns (Prisma migration `add_report_findings`); findings
  are replaced atomically on re-processing.
- **Security**: OCR is bounded (`OCR_MAX_PAGES`, `OCR_MAX_IMAGE_DIMENSION`, `OCR_SCALE`)
  and runs locally in-process; uploaded content is never sent to third-party services.
- **Frontend**: the report detail page shows a findings table with flag badges, a
  collapsible raw-text panel, and a processing-error notice for failed reports.
- **Tests**: 75 API tests (unit + DB-backed integration + real tesseract OCR + parser) and
  30 web tests.

### Sprint 5 — Medical Knowledge Base (Retrieval)

- **Retrieval engine**: PostgreSQL full-text search (FTS) over a chunked knowledge base. Each
  document is split by a markdown-aware chunker (section titles preserved, paragraphs never cut,
  oversized paragraphs hard-split at sentence boundaries with overlap) and indexed as a
  `tsvector` column backed by a GIN index. Queries use `websearch_to_tsquery` (plain-phrase
  friendly) ranked by `ts_rank_cd` with `ts_headline` snippets (`<mark>` highlights). The schema
  is pgvector-ready so a semantic layer can be layered on later with user-provided embedding keys.
- **API**: under `/api/v1/knowledge` — search (`GET /search?q=&category=`), browse
  (`GET /?page=&limit=&category=`), detail (`GET /:id`, drafts hidden from non-admins), and
  ADMIN-only ingest (`POST /`), update (`PATCH /:id`), and delete (`DELETE /:id`). Writes are
  chunked atomically (chunks replaced per document) and audit-logged (`DATA.KNOWLEDGE_*`).
- **Content**: 13 curated educational articles (metrics, labs, nutrition, wellness) seeded by an
  idempotent `kb:seed` CLI (upsert by slug) — run `npm run kb:seed -w @longeviq/api` after
  `prisma migrate deploy`.
- **Data model**: `KnowledgeDocument` (slug-unique, category/status enums, `createdBy` → User)
  and `KnowledgeChunk` (Prisma migration `20260810021451_add_knowledge_base`) with a GIN index
  on the `searchVector` tsvector column.
- **Security**: search/list/detail require authentication; documents are visible only when
  `PUBLISHED` (drafts are ADMIN-only); content writes require the `ADMIN` role both at the
  middleware and service layer; the `@longeviq/shared` validators cap content at 1,000,000 chars.
- **Frontend**: protected `/knowledge` page with full-text search, category filter pills,
  highlight-safe snippets (no `innerHTML`), and a browseable library grid; `/knowledge/[id]`
  renders the article as titled sections; the site header links to Knowledge for signed-in users.
- **Tests**: 103 API tests (unit + DB-backed integration) and 35 web tests.

### Sprint 6 — AI Health Assistant (RAG Chat)

- **Chat API**: under `/api/v1/assistant` — `POST /chat` (new or continuing a session), `GET
  /sessions` (paginated list), `GET /sessions/:id`, `DELETE /sessions/:id`. Sessions are
  owner-scoped; cross-user access returns `404`.
- **RAG grounding**: each turn retrieves the top-K published knowledge chunks (PostgreSQL FTS via
  the Sprint 5 repository), caps the context (`ASSISTANT_CONTEXT_CHAR_LIMIT`), and sends the
  system safety rules + bounded history + retrieved context to an OpenAI-compatible chat model.
  Retrieved sources are persisted and surfaced in the UI with links into `/knowledge/[id]`.
- **Graceful degradation**: LLM credentials are user-supplied at runtime
  (`USER_LLM_API_KEY` / `USER_LLM_BASE_URL` / `USER_LLM_MODEL`). With no key configured the
  assistant replies with an educational "not configured" notice and still stores the exchange;
  upstream errors become `isError` assistant messages, never a 500.
- **Data model**: `ChatSession` + `ChatMessage` (role, JSONB `sources`, `isError`) — migration
  `20260811155835_add_ai_assistant`.
- **Safety**: per-user chat rate limit (default 30/min), 4,000-char message cap, provider timeouts,
  medical disclaimer appended by the service itself, model output rendered as plain text (no
  `innerHTML`), and audit events `DATA.ASSISTANT_CHAT` / `DATA.ASSISTANT_SESSION_DELETE` with no
  message content logged.
- **Frontend**: protected `/assistant` page with session sidebar, new-chat, suggestion chips,
  typing indicator, sources accordion, and a medical disclaimer footer; the site header links to
  Assistant for signed-in users.
- **Tests**: 134 API tests (unit + DB-backed integration) and 41 web tests.

### Sprint 7 — Nutrition Planner

- **API**: under `/api/v1/nutrition` — `POST /plans` (build a personalized plan), `GET /plans`
  (paginated history), `GET /plans/:id`, `DELETE /plans/:id`. Plans are owner-scoped snapshots;
  cross-user access returns `404`.
- **Personalized targets**: Mifflin-St Jeor BMR + WHO activity factors → TDEE, goal-adjusted
  calorie target (weight-loss floor clamped at 1,200 kcal), goal-specific protein (1.2–2.0 g/kg),
  25%-from-fat macro split, and a 35 ml/kg hydration target.
- **Meal composition**: a curated catalog of educationally grounded meals tagged by dietary
  preference. Each plan picks compatible templates (vegetarian, vegan, gluten-free, dairy-free,
  low-sodium, Mediterranean) deterministically and scales them to per-slot calorie shares
  (breakfast 25% / lunch 35% / dinner 30% / snack 10%).
- **Data model**: `NutritionPlan` (profile snapshot + computed targets) and `NutritionMeal`
  (one row per slot) — migration `20260812161614_add_nutrition_plans`.
- **Safety**: plan generation is deterministic server-side math with no LLM and no PHI egress; the
  profile is stored only as a plan snapshot; audit events `DATA.NUTRITION_PLAN_CREATE` /
  `DATA.NUTRITION_PLAN_DELETE` log summary metadata, never body metrics.
- **Frontend**: protected `/nutrition` page with a plan builder form (age, sex, weight, height,
  goal, activity level, dietary-preference chips), a daily-targets summary, a per-meal schedule
  with macros, and plan history with delete.
- **Tests**: 178 API tests (unit + DB-backed integration) and 44 web tests.

### Sprint 8 — Workout Planner

- **API**: under `/api/v1/workout` — `POST /plans` (build a personalized plan), `GET /plans`
  (paginated history), `GET /plans/:id`, `DELETE /plans/:id`. Plans are owner-scoped snapshots;
  cross-user access returns `404`.
- **Personalized targets**: a weekly session mix (strength vs. cardio split per goal), per-session
  time split (warm-up / main work / cool-down), and weekly volume (days × session length) with
  safe bounds (1–7 days, 15–120 min sessions).
- **Exercise selection**: a curated catalog of exercises tagged by day focus, equipment, and
  minimum fitness level. Strength days rotate splits by level (full-body → upper/lower/core →
  push/pull/legs), sets scale with fitness level, rep ranges shift by goal, and cardio sessions
  interleave across the week. Selection is deterministic per profile.
- **Data model**: `WorkoutPlan` (profile snapshot + computed targets) and `WorkoutDay` +
  `WorkoutExercise` (one session per day with exercises) — migration
  `20260813140632_add_workout_plans`.
- **Safety**: plan generation is deterministic server-side math with no LLM and no PHI egress; the
  profile is stored only as a plan snapshot; audit events `DATA.WORKOUT_PLAN_CREATE` /
  `DATA.WORKOUT_PLAN_DELETE` log summary metadata, never body metrics.
- **Frontend**: protected `/workout` page with a plan builder form (goal, fitness level,
  equipment, days/week, session length, body metrics), a weekly-targets summary, a per-day
  schedule with exercises (sets × reps + rests), and plan history with delete.
- **Tests**: 224 API tests (unit + DB-backed integration) and 48 web tests.

### Sprint 9 — Medication Reminders

- **API**: under `/api/v1/medications` — `POST /` (add a medication), `GET /` (paginated list with
  `doseCount` and `active` filter), `GET /schedule?date=YYYY-MM-DD` (daily dose schedule),
  `GET /:id`, `PATCH /:id`, `DELETE /:id`, and `POST /:id/adherence` (mark a dose taken / skipped /
  pending). Medications are owner-scoped; cross-user access returns `404`.
- **Daily schedule**: each medication defines 1–6 reminder times (`HH:mm`, sorted and deduplicated)
  and an optional date range. The schedule endpoint expands active medications into one dose row per
  reminder time for the requested date, merges stored adherence, and sorts doses by time.
- **Adherence tracking**: `MedicationAdherence` rows are keyed by `(medicationId, time, date)` so
  history survives reminder-schedule edits; `TAKEN` records a `takenAt` timestamp, `PENDING`
  removes the row.
- **Data model**: `Medication` (name, dosage, form, reminder times, instructions, notes, date range,
  active flag) and `MedicationAdherence` — migration
  `20260815045101_add_medication_reminders`.
- **Safety**: no PHI beyond the user's own data; audit events `DATA.MEDICATION_CREATE` /
  `DATA.MEDICATION_UPDATE` / `DATA.MEDICATION_DELETE` / `DATA.MEDICATION_DOSE_STATUS` log summary
  metadata only. Reminder guidance is educational, never a medical prescription.
- **Frontend**: protected `/medications` page with an add/edit form (name, dosage, form, reminder
  times, instructions, notes, date range, active), a medication list with dose frequency, and a
  daily schedule with previous/today/next navigation and per-dose take/skip toggles.
- **Tests**: 258 API tests (unit + DB-backed integration) and 53 web tests.

---

## Roadmap (Sprints)

| Sprint | Scope                                                        |
| ------ | ------------------------------------------------------------ |
| 0      | Project planning & setup **(done)**                          |
| 1      | Authentication & user management **(done)**                   |
| 2      | Health dashboard **(done)**                                  |
| 3      | Medical report upload & management **(done)**               |
| 4      | OCR + medical report parsing **(done)**                    |
| 5      | Medical knowledge base (RAG) **(done)**                    |
| 6      | AI health assistant **(done)**                              |
| 7      | Nutrition planner **(done)**                              |
| 8      | Workout planner **(done)**                               |
| 9      | Medication reminder **(done)**                        |
| 10     | Voice assistant                                              |
| 11     | Health score & analytics                                     |
| 12     | Doctor portal                                                |
| 13     | Admin dashboard                                              |
| 14     | Notifications                                                |
| 15     | Deployment & DevOps                                          |
| 16     | Testing & optimization                                       |
| 17     | Production release                                           |

---

## Medical Safety

LongevIQ is designed for **educational and wellness purposes only**. It must never:

- diagnose disease,
- prescribe medicine,
- or replace a physician.

Every AI-generated health response includes:

> *This information is intended for educational purposes only and is not a substitute for
> professional medical advice, diagnosis, or treatment.*

The disclaimer is enforced centrally via `MEDICAL_DISCLAIMER` in `packages/shared`.

## License

Proprietary. All rights reserved.
