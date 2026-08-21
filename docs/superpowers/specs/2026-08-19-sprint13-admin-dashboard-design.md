# Sprint 13 — Admin Dashboard (Design)

Date: 2026-08-19

## Summary

LongevIQ Sprint 13 adds an **admin dashboard** for ADMIN-role users built on the
existing append-only `AuditLog` and `User` data. It ships a read-only admin
surface under `/api/v1/admin` (platform summary, user directory, audit log
reader) plus a protected `/admin` web page, and hardens **role escalation
guardrails** so no public write path can ever raise a user's role. No new data
model or migration is required.

## Scope

1. Admin-only `/api/v1/admin` (requireAuth + `requireRoles(ADMIN)`):
   - `GET /summary` — platform statistics.
   - `GET /users` — paginated, filterable user directory.
   - `GET /audit-logs` — paginated, filterable audit log reader.
2. Role escalation guardrails: shared write schemas remain `.strict()` (no
   `role` accepted), the admin module exposes no role/user-mutation endpoint,
   and tests document that client-supplied roles are rejected everywhere.
3. A protected `/admin` web page (ADMIN only) with Overview / Users / Audit log
   tabs, and an "Admin" header link shown only to ADMIN-role users.
4. No migration, no new environment variables, no new third-party dependencies.

Out of scope: user management mutations (role changes, deactivation, invites),
per-user data inspection, PII export, and content moderation tooling.

## Data model

No new tables. Reads only from existing `User`, `HealthMetric`, `MedicalReport`,
and `AuditLog` (all already present since Sprints 1-3). The append-only audit
policy is preserved: the admin module is strictly read-only and does not write
or delete audit rows.

## API

New module under `apps/api/src/modules/admin/`, mounted behind `requireAuth` and
`requireRoles(UserRole.ADMIN)`. All responses use the `{ success, data }`
envelope.

### `GET /api/v1/admin/summary`

Response data:

```ts
{
  summary: {
    generatedAt: string;            // ISO
    users: {
      total: number;
      byRole: Record<UserRole, number>;   // USER / DOCTOR / ADMIN
      verified: number;
      activeLast30Days: number;           // distinct logins in last 30 days
      recentSignups: Array<{ id, email, firstName, lastName, role, createdAt }>; // 5 latest
    };
    content: {
      healthMetrics: number;
      medicalReports: number;
      parsedReports: number;              // status = PARSED
    };
    auditEvents: number;
  }
}
```

### `GET /api/v1/admin/users`

Query (shared `listAdminUsersQuerySchema`, zod-validated):

| Param    | Type                    | Notes                                   |
| -------- | ----------------------- | --------------------------------------- |
| `search` | string, optional        | case-insensitive match on email/name    |
| `role`   | `USER`/`DOCTOR`/`ADMIN` | exact role filter                       |
| `active` | `true`/`false`          | filters `isActive`                      |
| `page`   | int >= 1, default 1     |                                         |
| `limit`  | int 1-100, default 20   |                                         |

Response data:

```ts
{
  users: {
    items: Array<{
      id, email, firstName, lastName, role, emailVerified, isActive,
      oauthProvider: string | null, createdAt, lastLoginAt: string | null
    }>;
    pagination: { page, limit, total, totalPages };
  }
}
```

### `GET /api/v1/admin/audit-logs`

Query (shared `listAuditLogsQuerySchema`, zod-validated):

| Param    | Type           | Notes                                  |
| -------- | -------------- | -------------------------------------- |
| `action` | string, opt.   | substring match on action code         |
| `entity` | string, opt.   | exact entity name                      |
| `userId` | string, opt.   | exact actor user id                    |
| `from`   | ISO datetime   | inclusive lower bound on createdAt     |
| `to`     | ISO datetime   | inclusive upper bound on createdAt     |
| `page`   | int >= 1       |                                        |
| `limit`  | int 1-100      |                                        |

Response data:

```ts
{
  logs: {
    items: Array<{
      id, userId: string | null, userEmail: string | null,
      action, entity: string | null, entityId: string | null,
      ipAddress: string | null, userAgent: string | null,
      metadata: unknown | null, createdAt: string
    }>;
    pagination: { page, limit, total, totalPages };
  }
}
```

`metadata` is exposed as stored — the audit trail already guarantees summary-only
payloads (no passwords/tokens/PII). `userEmail` is joined from the actor user and
nulled when the user is gone.

## Shared contracts

New files in `packages/shared/src`:

- `types/admin.ts` — `AdminSummary`, `AdminUser`, `AdminUserListResult`,
  `AdminAuditLogEntry`, `AdminAuditLogListResult`, `AdminPagination`.
- `validators/admin.ts` — `listAdminUsersQuerySchema`,
  `listAuditLogsQuerySchema` (both `.strict()`), plus inferred input types.
- `index.ts` — export both.

## Backend structure

```
apps/api/src/modules/admin/
  admin.repository.types.ts   # AdminRepository interface + record types
  admin.repository.ts         # PrismaAdminRepository (read-only queries)
  admin.service.ts            # summary(), listUsers(), listAuditLogs()
  admin.controller.ts
  admin.routes.ts
```

- Injected through the container (DI override pattern used across the app).
- `AdminService` maps DB records to the shared contract types (Date -> ISO).
- Routes mounted in `app.ts`:

```ts
apiRouter.use(
  '/admin',
  requireAuth(container.tokenService),
  requireRoles(UserRole.ADMIN),
  createAdminRouter(container.adminService),
);
```

## Role escalation guardrails

- `registerSchema`, `updateProfileSchema`, `changePasswordSchema` are already
  `.strict()` and never accept a `role` field; this is now pinned by tests
  (`admin.guard.spec.ts`): submitting `{ role: 'ADMIN' }` to register or
  update-profile returns `400`.
- The admin module is **read-only**: no endpoint accepts a role, changes a role,
  or mutates users, so there is no public role-escalation surface to attack.
- Admin audit-log reads are themselves not audited (consistent with all other
  read surfaces; the audit trail stays append-only with no read amplification).

## Web UI

- `apps/web/src/lib/admin-api.ts` — typed axios clients for summary/users/logs.
- `apps/web/src/lib/admin-format.ts` (+ `admin-format.spec.ts`) — date-time and
  role label formatting helpers.
- `apps/web/src/components/admin/`:
  - `admin-summary.tsx` — overview cards (users, active 30d, metrics, reports,
    audit events) + recent signups.
  - `admin-users.tsx` — search, role/active filters, paginated table.
  - `admin-audit-log.tsx` — action/entity filters, paginated table.
- `apps/web/src/app/admin/page.tsx` — protected ADMIN-only page with tabs
  (Overview / Users / Audit log), reusing `RequireRole`.
- Site header: add an "Admin" link shown only to ADMIN-role users.

## Error handling

- 401 without a token; 403 when a non-ADMIN hits `/admin`.
- Invalid query params -> `400 VALIDATION_ERROR` (existing `validateQuery`).
- All admin reads return empty (never leak) for missing rows; no existence
  oracle beyond what the role guard already enforces.

## Security & privacy

- **Least privilege**: the entire `/admin` surface is ADMIN-only and read-only;
  no user data is exposed through any other route.
- **No PII beyond the admin surface**: user directory shows profile metadata the
  admin is entitled to see; audit entries expose only summary metadata (never
  secrets or content).
- **No new attack surface**: no mutation endpoints, no role writes, no file
  access, no LLM calls, no new env vars or dependencies.

## Testing

- Shared: admin query schemas accept/reject filter combos and clamp page/limit.
- API unit (`apps/api/tests/admin.service.spec.ts`, new `FakeAdminRepository`):
  summary aggregation, user list mapping/filtering/pagination, audit-log mapping
  and userEmail join, ISO date conversion.
- API guardrails (`apps/api/tests/admin.guard.spec.ts`): register/update-profile
  reject a client-supplied `role`; `listAdminUsersQuerySchema`/`listAuditLogsQuerySchema`
  reject unknown fields.
- API integration (`apps/api/tests/integration/admin.integration.spec.ts`):
  anonymous -> 401, USER/DOCTOR -> 403, ADMIN -> 200 for summary/users/audit-logs;
  summary counts reflect seeded rows; users search/role/pagination; audit-log
  filters; register/update with `role` -> 400.
- Web unit: `admin-format.spec.ts`.

## Docs

Update `README.md` (Sprint 13 section, roadmap row done, test counts),
`docs/API.md` (admin endpoints), `docs/SECURITY.md` (admin dashboard threat
model; remove the pending Sprint 13 line), `docs/FOLDER_STRUCTURE.md` (Sprint 13
structure), and add this design doc.

## Verification

Lint, typecheck, tests, `format:check`, monorepo build, then a live E2E check
through the running dev server (anonymous blocked, USER/DOCTOR blocked, ADMIN
sees summary/users/audit-logs). Commit as `feat: sprint 13 - admin dashboard`.
Do not push.
