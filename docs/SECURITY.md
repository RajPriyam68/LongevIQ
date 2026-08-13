# Security

LongevIQ follows defense-in-depth. This document records controls in place and the residual risks
accepted with rationale.

## Implemented Controls

| Layer             | Control                                                            |
| ----------------- | ------------------------------------------------------------------ |
| Transport         | Nginx reverse proxy; HSTS-ready; TLS termination at the edge       |
| Headers           | Helmet (CSP, X-Frame-Options, nosniff, etc.) on the API            |
| CORS              | Allow-list via `CORS_ORIGINS`; credentials mode                    |
| Rate limiting     | `express-rate-limit` on `/api` (configurable) and per-IP auth limiter (20 / 15 min) |
| Payload limits    | JSON body capped at 2 MB; `413 PAYLOAD_TOO_LARGE`                  |
| Passwords         | argon2id hashing (memoryCost 19456, timeCost 2, parallelism 1); no plaintext storage |
| Access tokens     | Short-lived HS256 JWTs (`JWT_ACCESS_SECRET`, default 15 m); never stored server-side |
| Refresh tokens    | Opaque 384-bit random values; SHA-256 hashed at rest; rotated on every refresh; reuse revokes the whole session family |
| Session storage   | Refresh token in httpOnly `SameSite=Lax` cookie (`Secure` in production) |
| Email verification| Token stored as SHA-256 hash with 24 h expiry; single use        |
| Google OAuth      | Server-side code exchange; state validated with constant-time comparison; `lq_oauth_state` cookie is httpOnly + short-lived |
| RBAC              | `requireRoles` middleware guards role-scoped routes                |
| Audit logging     | `AuditLog` table records auth events (register, login, logout, verify, resend, password change) and metric events (create, update, delete) with actor + action + IP + user-agent |
| Secrets           | Env vars only; `.env*` gitignored; `.env.example` placeholders only |
| Configuration     | zod-validated env; fail-fast on invalid config; production requires `DATABASE_URL` + `JWT_ACCESS_SECRET` |
| Logging           | pino redaction of `authorization`, `cookie`, passwords, tokens     |
| Error handling    | Central handler; internal errors masked in production              |
| XSS/SQLi          | Parameterized Prisma queries; React escapes output; Helmet CSP     |
| Dependency audit  | `npm audit` in CI; patched versions pinned where available         |

## Security Middleware Order (API)

1. pino-http request logging (with redaction)
2. helmet
3. cors (allow-list)
4. express.json / urlencoded (2 MB limits)
5. rate limiter on `/api`
6. versioned routes (auth router adds its own stricter limiter)
7. not-found handler
8. central error handler

## Auth Threat Model

- **Enumeration resistance**: login failures return the same `401` for unknown email and wrong
  password; resend-verification silently succeeds for unknown/already-verified accounts; signup
  reveals only whether the email is already registered.
- **Refresh-token reuse**: an attacker replaying a rotated refresh token causes revocation of all
  of the victim's sessions (family revocation).
- **Password change** revokes every session.
- **No secrets in tokens**: refresh tokens are random opaque strings, so they cannot be decoded or
  forged offline.
- **Timing-safe state checks** for OAuth CSRF protection.

## Health-Metric Threat Model (Sprint 2)

- **Tenant isolation**: every metric query, read, update, and delete is filtered by `userId` from
  the authenticated session; another user's record is indistinguishable from a missing one (both
  return `404 NOT_FOUND`), preventing resource enumeration.
- **Input validation**: shared zod schemas enforce metric type, value ranges, and compound-value
  requirements before the service layer runs; the service persists the canonical unit rather than
  trusting the client.
- **Auditability**: metric create/update/delete are written to the append-only `AuditLog` with the
  acting user, action (`DATA.METRIC_*`), and request metadata; no metric payload is stored in the
  audit entry.
- **Sensitive health data**: metric values live only in the authenticated user's scoped reads;
  dashboard overviews are computed server-side per user and never include another tenant's data.

## Medical Report Threat Model (Sprint 3)

- **Tenant isolation**: report queries, reads, downloads, updates, and deletes are filtered by
  `userId` from the authenticated session; another user's report is indistinguishable from a
  missing one (both return `404 NOT_FOUND`), preventing resource enumeration.
- **File-type allow-list**: the content type and filename supplied by the client are never trusted.
  Every upload is inspected against magic bytes (`%PDF-`, PNG signature, JPEG `FFD8FF`) and only
  PDF/PNG/JPEG are accepted; the detected MIME and extension are canonicalized server-side and
  persisted. Unsupported files are rejected before any storage write.
- **Upload limits**: `multer` memory storage enforces a hard size cap
  (`MAX_UPLOAD_BYTES`, default 10 MB) mapped to `413 PAYLOAD_TOO_LARGE`, plus a single-file,
  bounded-field limit; oversized files fail before reaching the storage layer.
- **Storage keys**: files are stored under random UUID keys (`uuid.pdf|png|jpg`) that are never
  derived from user input. The local backend validates the key against a strict pattern before any
  path join and reads/writes with mode `0600`, so untrusted filenames cannot traverse directories.
- **Download safety**: responses set `Content-Type` from the detected MIME and
  `Content-Disposition: inline` with both ASCII and RFC 5987 (`filename*=UTF-8''`) encodings, so
  hostile filenames cannot smuggle headers or break the browser's download handling.
- **Auditability**: report create/update/delete/download are written to the append-only `AuditLog`
  as `DATA.REPORT_*` with the acting user and request metadata; report payloads are never stored in
  the audit entry.
- **Orphan tolerance**: deletes remove the database row first; a failing storage removal is
  swallowed and logged rather than leaking partial state to the caller (the S3/local deletion is
  idempotent and reconciled by cleanup tooling in a later Sprint).

## Medical Report OCR & Parsing Threat Model (Sprint 4)

- **Untrusted input is never trusted as content**: the OCR/parsing pipeline runs only after the
  Sprint 3 magic-bytes allow-list has accepted the file. Document text is treated as attacker
  data end-to-end.
- **Resource bounding**: processing is capped at `OCR_MAX_PAGES` (default 10) PDF pages and
  `OCR_MAX_IMAGE_DIMENSION` (default 3000 px, oversized images downscaled before OCR); render
  scale is capped at `OCR_SCALE` (max 4). No unbounded loops, decompression bombs, or
  uncontrolled rasterization.
- **No third-party network egress**: OCR runs in-process with tesseract.js (WASM). The English
  model and the rendering font are vendored in the repository, so neither CI, containers, nor
  the preview environment fetch anything at runtime; `OCR_LANG_PATH` only points at local
  model files. Uploaded PHI never leaves the platform.
- **Failure isolation**: a failed parse (empty or illegible document) sets the report status to
  `FAILED` with a `processingError`; the upload still returns `201`, the file remains stored,
  and no partial findings are persisted. Findings are replaced atomically (delete-then-create)
  on re-processing, so stale or leaked rows cannot accumulate.
- **No PHI in audit or logs**: processing is audited as `DATA.REPORT_PROCESSED` with only
  status, finding count, and error message; document text and findings are never written to
  audit entries or structured logs.
- **Model integrity**: the vendored `eng.traineddata.gz` is a static asset reviewed at commit
  time; its hash is pinned in the release checklist.

## Knowledge Base Threat Model (Sprint 5)

- **Authenticated reads only**: search, browse, and detail endpoints sit behind `requireAuth`.
  Draft documents are invisible to non-admins (list forced to `PUBLISHED`, detail returns `404`),
  so unpublished content can never leak through search or direct-id access.
- **ADMIN-only writes, enforced twice**: create/update/delete carry `requireRoles('ADMIN')` at
  the route layer and the service re-checks the caller role, so an accidentally misconfigured
  route cannot widen the write surface.
- **Slug uniqueness as an enumeration guard**: `slug` is a unique index; duplicates return
  `409`, and document ids are opaque Prisma cuids — there is no guessable sequential id space.
- **Query safety**: search text is bound through Prisma tagged-template parameters and parsed by
  `websearch_to_tsquery`, which is designed to reject malformed/operator abuse rather than throw
  or allow injection; category/status filters are enum-validated before reaching SQL.
- **Size bounding**: content is capped at 1,000,000 characters by the shared zod validator and
  again by the service; search `q` is capped at 200 chars and `limit` at 50, so no unbounded
  `ts_headline` work.
- **No HTML rendering of snippets**: Postgres `ts_headline` emits `<mark>` markers; the web app
  splits them with React elements instead of `innerHTML`, so authored content cannot inject
  markup into the page.
- **Audited content lifecycle**: `DATA.KNOWLEDGE_CREATE` / `UPDATE` / `DELETE` record actor,
  slug, category, and chunk count (never content); the audit trail follows the existing
  `AuditLog` principles.
- **Schema is pgvector-ready**: the tsvector column and GIN index are pure PostgreSQL, so the
  retrieval layer works without any optional extension. A future semantic layer adds an
  embedding column behind the same repository interface; any embedding keys are user-provided
  (`USER_LLM_*`), never read from the platform environment.

## AI Assistant Threat Model (Sprint 6)

- **User-supplied credentials, never platform keys**: the assistant is configured exclusively
  through `USER_LLM_API_KEY` / `USER_LLM_BASE_URL` / `USER_LLM_MODEL` from the deployment
  operator. LongevIQ never reads, forwards, or persists platform environment credentials; when no
  key is configured the assistant degrades gracefully (educational notice) instead of leaking
  configuration internals.
- **Tenant isolation**: chat sessions are scoped to the owning user; reading, deleting, or
  appending to another user's session returns `404 NOT_FOUND`, matching the resource-enumeration
  resistance used across the platform.
- **Prompt-injection hardening**: retrieved knowledge text is isolated inside `<knowledge>`
  delimiters and the system prompt instructs the model to treat it as reference material, never
  as instructions. Model output is treated as untrusted: it is rendered with React
  (`whitespace-pre-wrap`, no `innerHTML`), so an injected directive cannot escalate to XSS.
- **Bounded cost**: chat is behind a dedicated per-user rate limit
  (`ASSISTANT_CHAT_RATE_LIMIT_MAX`, default 30/min) on top of the global per-IP limiter;
  upstream calls time out via `LLM_TIMEOUT_MS`; message length is capped at 4,000 characters by
  the shared zod validator; retrieval (`ASSISTANT_RETRIEVAL_TOP_K`) and prompt context
  (`ASSISTANT_CONTEXT_CHAR_LIMIT`, `ASSISTANT_HISTORY_MESSAGES`) are bounded so token usage per
  request cannot balloon.
- **Disclaimer enforced at the AI layer**: the safety rules are part of the system prompt (never
  diagnose, never prescribe, never replace a clinician, flag emergencies) and the
  `MEDICAL_DISCLAIMER` is appended to every assistant response by the service itself, so it is
  present even if the model omits it.
- **No secrets in audit or logs**: `DATA.ASSISTANT_CHAT` records actor, session, provider
  availability, and source count — never the user message or the model reply. The LLM API key is
  sent only in the server-side upstream request header and is not logged (pino redaction covers
  `authorization`).
- **No PHI egress**: only the current question, bounded conversation history, and retrieved
  knowledge chunks are sent to the configured provider; medical report contents are never fed to
  the assistant in this Sprint.

## Nutrition Planner Threat Model (Sprint 7)

- **No LLM, no PHI egress**: plan generation is deterministic server-side math over the request
  payload (BMR/TDEE, macro split, meal scaling). No body metrics are ever sent to a third-party
  provider and no embeddings/vectors are produced, so there is no new external surface.
- **Minimal retention by design**: the profile is stored only as an immutable snapshot on the plan
  it generated (`NutritionPlan`), never as a standing user profile that could drift or be reused
  for unintended features. Deleting a plan deletes its snapshot and meals via `onDelete: Cascade`.
- **Input bounds**: zod validates the profile (`age` 18–100, `weightKg` 1–300, `heightCm` 100–250,
  at most 5 dietary preferences) before any computation; the weight-loss calorie target is clamped
  at a 1,200 kcal floor so the generator cannot recommend a starvation diet.
- **Tenant isolation**: plans are owner-scoped; reading or deleting another user's plan returns
  `404 NOT_FOUND` (resource-enumeration resistance, as elsewhere in the platform).
- **Abuse resistance**: generation is cheap (no rate-limited upstream dependency), so the global
  per-IP limiter is sufficient; catalog size and slot counts bound the response size.
- **No secrets in audit or logs**: `DATA.NUTRITION_PLAN_CREATE` / `DATA.NUTRITION_PLAN_DELETE`
  record actor, plan id, goal, and calorie target — never age, weight, height, sex, or meal data.
  Plan generation is educational and the UI shows the standard disclaimer next to every plan.

## Workout Planner Threat Model (Sprint 8)

- **No LLM, no PHI egress**: plan generation is deterministic server-side math over the request
  payload (session split, time allocation, exercise selection). No body metrics are ever sent to a
  third-party provider, so there is no new external surface.
- **Minimal retention by design**: the profile is stored only as an immutable snapshot on the plan
  it generated (`WorkoutPlan`), never as a standing user profile. Deleting a plan deletes its
  snapshot, days, and exercises via `onDelete: Cascade`.
- **Input bounds**: zod validates the profile (`age` 18–100, `weightKg` 1–300, `heightCm` 100–250,
  `daysPerWeek` 1–7, `sessionDurationMinutes` 15–120) before any computation, so the generator
  cannot recommend unsafe training volume.
- **Tenant isolation**: plans are owner-scoped; reading or deleting another user's plan returns
  `404 NOT_FOUND` (resource-enumeration resistance, as elsewhere in the platform).
- **Abuse resistance**: generation is cheap (no rate-limited upstream dependency), so the global
  per-IP limiter is sufficient; catalog size and weekly session bounds cap the response size.
- **No secrets in audit or logs**: `DATA.WORKOUT_PLAN_CREATE` / `DATA.WORKOUT_PLAN_DELETE` record
  actor, plan id, goal, and weekly volume — never age, weight, height, sex, or exercise data.
  Plan generation is educational and the UI shows the standard disclaimer next to every plan.

## Upcoming Controls (per Sprint)

- **Later**: semantic retrieval with pgvector; embedding keys remain user-supplied.
- **Sprint 9**: time-based one-time tokens for medication reminders.
- **Sprint 13**: admin audit log reader, role escalation guardrails.
- **Sprint 15**: TLS, secrets manager, WAF at the edge, rate-limit tuning for production.

## Audit Logging

Implemented in Sprint 1 via the `AuditLog` table and extended in Sprint 2 (metrics), Sprint 3
(reports), Sprint 6 (assistant chats), Sprint 7 (nutrition plans), and Sprint 8 (workout plans). Design principles: append-only by policy (no update/delete flows expose it), event
classification (`AUTH.*` and `DATA.*` actions), actor + resource + timestamp, IP + user-agent, and
no sensitive payloads (passwords/tokens/metric/report/chat/nutrition/workout data are never written).

## Dependency Notes

`npm audit` is part of CI. The remaining reported items are build/toolchain only:

- **PostCSS** (bundled with Next.js): used to compile our self-authored CSS at build time; the
  advisories concern processing attacker-controlled source maps/CSS, which does not apply to this
  codebase's build pipeline.
- **sharp** (bundled with Next.js): used only by the optional `next/image` optimizer. LongevIQ
  serves user files from S3 and disables Next image optimization
  (`images.unoptimized = true` in `next.config.ts`), so sharp is not in the request path. Dedicated
  image/PDF processing in Sprint 3+ will pin a patched `sharp` explicitly.

These are reviewed each Sprint as part of the release checklist.

## Vulnerability Reporting

Report security issues privately to the maintainers. Do not open public issues for
security-related findings.
