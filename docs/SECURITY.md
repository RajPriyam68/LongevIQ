# Security

LongevIQ follows defense-in-depth. This document records controls in place and the residual risks
accepted with rationale.

## Implemented Controls (Sprint 0)

| Layer             | Control                                                            |
| ----------------- | ------------------------------------------------------------------ |
| Transport         | Nginx reverse proxy; HSTS-ready; TLS termination at the edge       |
| Headers           | Helmet (CSP, X-Frame-Options, nosniff, etc.) on the API            |
| CORS              | Allow-list via `CORS_ORIGINS`; credentials mode                    |
| Rate limiting     | `express-rate-limit` on `/api` (configurable window/limit)         |
| Payload limits    | JSON body capped at 2 MB; `413 PAYLOAD_TOO_LARGE`                  |
| Secrets           | Env vars only; `.env*` gitignored; `.env.example` placeholders only|
| Configuration     | zod-validated env; fail-fast on invalid config                     |
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
6. versioned routes
7. not-found handler
8. central error handler

## Upcoming Controls (per Sprint)

- **Sprint 1**: password hashing (argon2id), JWT access + refresh tokens, RBAC middleware, Google
  OAuth, email verification, refresh-token rotation + reuse detection.
- **Sprint 3**: S3 presigned uploads, malware-scan hook, file-type allow-list, per-user report
  ownership checks.
- **Sprint 5**: prompt-injection hardening, output filtering, disclaimers enforced at the AI layer.
- **Sprint 9**: time-based one-time tokens for medication reminders.
- **Sprint 13**: admin audit log reader, role escalation guardrails.
- **Sprint 15**: TLS, secrets manager, WAF at the edge, rate-limit tuning for production.

## Audit Logging

Audit logging will be introduced with authenticated modules (Sprint 1). Design principles:
immutable append-only store, event classification (AUTH, DATA, ADMIN), actor + resource +
timestamp, and no sensitive payloads.

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
