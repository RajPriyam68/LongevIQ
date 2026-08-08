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

## Upcoming Controls (per Sprint)

- **Sprint 3**: S3 presigned uploads, malware-scan hook, file-type allow-list, per-user report
  ownership checks.
- **Sprint 5**: prompt-injection hardening, output filtering, disclaimers enforced at the AI layer.
- **Sprint 9**: time-based one-time tokens for medication reminders.
- **Sprint 13**: admin audit log reader, role escalation guardrails.
- **Sprint 15**: TLS, secrets manager, WAF at the edge, rate-limit tuning for production.

## Audit Logging

Implemented in Sprint 1 via the `AuditLog` table and extended in Sprint 2 for metrics. Design
principles: append-only by policy (no update/delete flows expose it), event classification
(`AUTH.*` and `DATA.*` actions), actor + resource + timestamp, IP + user-agent, and no sensitive
payloads (passwords/tokens/metric values are never written).

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
