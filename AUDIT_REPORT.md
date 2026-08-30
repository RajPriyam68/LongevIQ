# LongevIQ Audit Report — Sprints 0–14

Date: 2026-08-30
Branch: `260811-feat-workout-planner`
HEAD: `2e88682` (commit `68f2942 feat: sprint 14 - notifications` + audit fix)
Scope: Complete audit of all functionality shipped through Sprint 14. No Sprint 15 features added.

## Method

- Full pipeline baseline: API unit/integration tests, web tests, lint, typecheck, format check, production build.
- API-level end-to-end (E2E) workflow scripts driving every user/doctor/admin flow against a live dev server with seeded credentials (no headless browser available; subagent delegation unavailable).
- Live cross-user isolation checks, RBAC role-gate checks, and security review of the critical modules (auth, reports/OCR, knowledge/RAG, assistant, medications, care/doctor, admin, notifications).
- Fresh-DB migration verification with `prisma migrate deploy`.

## Fixed Issues

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 1 | Medium (test reliability) | `apps/api/tests/report-ocr.spec.ts`: the real-tesseract PNG test and the pdf-parse line-break test timed out at vitest's default 5 s under full-suite CPU contention (flaky green when run solo, red under `--runInBand`/parallel CPU load). | Added explicit per-test `30_000` ms timeouts to both `it(...)` blocks. Test coverage unchanged; suite passes 407/407 consistently. Committed as `2e88682`. |

No application-code bugs were found that required fixing.

## Verification Evidence

### Automated suites

- API tests: 407/407 passing (35 files).
- Web tests: 87/87 passing (15 files).
- `npm run lint` at repo root: exit 0.
- `npm run typecheck` at repo root: exit 0.
- `npm run format:check` at repo root: exit 0.
- `npm run build` at repo root: exit 0. Artifacts verified: `apps/web/.next/BUILD_ID`, `apps/api/dist/server.js`, `packages/shared/dist/index.js`.
- Migrations: `prisma migrate deploy` against a fresh database (`longeviq_migtest`) applied all 12 migrations cleanly.

### Live E2E workflow coverage (API-level, seeded demo/doctor/admin users)

- Auth E2E: 23/23 — register, email verification token, pre-verify login blocked with `403 EMAIL_NOT_VERIFIED`, login, refresh-token rotation, logout; replay/expiry/tampered-token edge cases.
- Full workflow audit: 108/108 — anonymous 401s; USER/DOCTOR/ADMIN role gates; dashboard + metrics CRUD; report upload/list/detail/download/patch, non-PDF rejection (400), terminal status handling; knowledge search/list with USER create blocked (403); assistant chat graceful no-LLM behavior + sessions; nutrition and workout plan create/list/get; medication CRUD + schedule + adherence; voice preferences + config; analytics summary/score/insights; notifications list/unread/mark-read/delete; 10 cross-user isolation 404 cases; care-grant -> doctor redeem -> doctor patient overview/metrics/reports/analytics -> patient revoke -> doctor 404 after revoke; admin summary/users/audit-logs + ADMIN-only gates; deletes for all created resources.
- Sprint 14 notifications E2E: 39/39 (passed earlier in the session).

### Security / RBAC review findings

- Cross-user isolation: metrics, medications, assistant, workout, nutrition, reports, and notifications services use `requireOwned*` checks and return 404 (not 403) for other users' resources. Verified live with 10 cross-user cases.
- Doctor module gates every patient resource behind `requireActiveConnection`; verified live that access returns 404 after the patient revokes the grant.
- Admin routes and knowledge write routes require the ADMIN role.
- Care-grant codes use an unambiguous alphabet (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`); grant codes are stored as SHA-256 hashes; redemption is single-use.
- Upload handling: storage keys are server-generated `randomUUID()` with extension; filename regex restricts to UUID + allowed extension; file type detection uses magic bytes (PDF/PNG/JPEG), not client-supplied MIME; OCR is bounded (`maxPages`/`maxImageDimension` with downscaling).
- Knowledge search is restricted to `PUBLISHED` documents; the two raw-SQL sites (search-vector update, tsquery search) use parameterized Prisma tagged templates — no SQL injection.
- Auth: passwords hashed with argon2id; email tokens stored hashed and single-use; logout/change-password revoke all refresh tokens; JWT refresh rotation enforced; `verificationUrl` is returned only in dev mode.
- Frontend: no `dangerouslySetInnerHTML`; all 12 protected routes are wrapped in auth guards and `/doctor`/`/admin` in `RequireRole`; all routes return 200. Web-to-API proxy (`/api/v1/health`) verified.

## Remaining Issues / Deployment Notes (not code defects)

- SMTP is not configured in the local env; verification emails are logged to the API log (`[dev] Email generated (SMTP not configured)`) instead of being sent. Set SMTP env vars before production. Email tokens are hashed and single-use regardless.
- No production LLM API key is configured; the assistant chat returns a graceful "not configured" message rather than erroring. Set `USER_LLM_API_KEY`/`USER_LLM_BASE_URL`/`USER_LLM_MODEL` (project-facing names) before enabling AI answers.
- Refresh-token cookie does not set `secure` when running over plain HTTP in dev (standard behavior; enable `COOKIE_SECURE`/HTTPS in production).
- Rate limiting: global API limiter defaults to 100 req/min/IP and auth limiter 20/15 min; these are intentional, not bugs. The E2E scripts add pacing to stay under the limit.
- OAuth/Google login is disabled by default (`GOOGLE_OAUTH_ENABLED=false`); no exposure.

## Production-Readiness

Ready for a controlled production deployment with the env/config items above in place. There are no known security defects or data-isolation holes; tests, lint, typecheck, format, build, migrations, and full workflow E2E are all green.

## Reproducing

- Suite: `npm test`, `npm run lint`, `npm run typecheck`, `npm run format:check`, `npm run build` (repo root).
- Fresh DB migrations: `prisma migrate deploy` (12 migrations).
- E2E scripts (scratch, in `/tmp/opencode`): `sprint14-auth-e2e.sh` (23 checks), `sprint-audit-e2e.sh` (108 checks), `sprint14-e2e.sh` (39 checks).
