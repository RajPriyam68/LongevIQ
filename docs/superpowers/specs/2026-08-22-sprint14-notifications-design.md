# Sprint 14 — Notifications (Design)

Date: 2026-08-22

## Summary

LongevIQ Sprint 14 adds an **in-app notification center** for authenticated users. Notifications are
**derived deterministically and idempotently** from existing domain data (`Medication`,
`MedicalReport`, `HealthMetric`, `DoctorPatient`), materialized on demand into a new `Notification`
table, and managed through an owner-scoped API (`/api/v1/notifications`) plus a web inbox page and a
header unread badge. The feature preserves Sprints 0–13: no existing service or endpoint changes,
one additive migration, no new environment variables, and **no runtime dependency on Redis**.

> Why not Redis? `REDIS_URL` is documented (ENVIRONMENT.md) as a placeholder for queue-backed push
> delivery (email/SMS/TOTP). No Redis is present in the development/test environment, so the inbox
> is fully DB-backed and deterministic, following the "computed on demand" precedent of the
> analytics (Sprint 11) and admin dashboard (Sprint 13) modules. Queue-based push remains a
> documented future enhancement and is not required to use notifications.

## Scope

1. `Notification` table (append-only-ish, per-user, dedup-keyed) + migration.
2. An on-demand **reconciliation** engine that materializes notifications from existing rows:
   - `MEDICATION_DUE` — a scheduled reminder time for today has passed and the dose is not taken.
   - `REPORT_PROCESSED` / `REPORT_FAILED` — a report reached `PARSED` / `FAILED`.
   - `METRIC_ALERT` — the latest reading for a tracked metric is outside its recommended range.
   - `CARE_CONNECTION` — a doctor connected to the patient's account.
3. Owner-scoped API under `/api/v1/notifications` (requireAuth):
   - `GET /` — refresh + paginated list (filters: `read`, `type`).
   - `GET /unread-count` — refresh + unread count.
   - `PATCH /:id/read` — mark one notification read.
   - `PATCH /read-all` — mark all notifications read.
   - `DELETE /:id` — delete one notification.
4. Web: `/notifications` page (list, unread filter, type filter, mark read/all, delete,
   pagination) and a header bell with a live unread badge.
5. No seed changes; notifications materialize from real user data on first read.

Out of scope: email/SMS/TOTP delivery, push subscriptions, queue-backed fan-out, and
admin-driven notification broadcasting.

## Data model

```prisma
enum NotificationType {
  MEDICATION_DUE
  REPORT_PROCESSED
  REPORT_FAILED
  METRIC_ALERT
  CARE_CONNECTION
}

enum NotificationSeverity {
  INFO
  WARNING
  SUCCESS
  CRITICAL
}

model Notification {
  id        String               @id @default(cuid())
  userId    String
  user      User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      NotificationType
  severity  NotificationSeverity
  title     String
  body      String
  dedupKey  String
  metadata  Json?
  readAt    DateTime?
  createdAt DateTime             @default(now())

  @@unique([userId, dedupKey])
  @@index([userId, createdAt])
  @@index([userId, readAt])
}
```

`@@unique([userId, dedupKey])` makes materialization idempotent. `readAt` marks a notification as
read/dismissed. `metadata` is summary-only (entity ids, values) and never holds secrets or content.

## Reconciliation engine (`NotificationService.refresh(userId)`)

Refresh is authoritative and idempotent; it runs before every list/unread-count read. It computes
the desired set from existing rows and reconciles against stored notifications:

| Type | Source | Dedup key | Refresh behaviour |
| ---- | ------ | --------- | ----------------- |
| `MEDICATION_DUE` | today's schedule (due times `<= now`, dose not `TAKEN`) | `medication-due:<medId>:<date>:<time>` | create if missing; **mark read** when the dose is taken or no longer due today |
| `REPORT_PROCESSED` | report `status = PARSED` | `report-parsed:<reportId>` | create if missing (historical) |
| `REPORT_FAILED` | report `status = FAILED` | `report-failed:<reportId>` | create if missing (historical) |
| `METRIC_ALERT` | latest reading per tracked metric type | `metric-alert:<type>` | upsert content to reflect the latest value; **mark read** when the latest reading is in range |
| `CARE_CONNECTION` | active connection (patient side) | `care-connection:<connectionId>` | create if missing (historical) |

Created notifications start unread. Reconciliation never resurrects a read/dismissed notification
(upsert preserves `readAt`), so user dismissal is respected. The reconciliation set is bounded
(latest reports, today's schedule, latest per-type metric, active connections), so refresh cost is
small and deterministic.

## API

New module under `apps/api/src/modules/notifications/`, mounted behind `requireAuth`. All responses
use the `{ success, data }` envelope.

### `GET /api/v1/notifications`

Query (shared `listNotificationsQuerySchema`, zod-validated):

| Param   | Type                       | Notes                    |
| ------- | -------------------------- | ------------------------ |
| `read`  | `true` / `false`           | filter by read state     |
| `type`  | one of the 5 notification types | exact type filter   |
| `page`  | int >= 1, default 1        |                          |
| `limit` | int 1-100, default 20      |                          |

Response data:

```ts
{
  notifications: {
    items: Array<{
      id, type, severity, title, body,
      metadata: unknown | null, readAt: string | null, createdAt: string
    }>;
    pagination: { page, limit, total, totalPages };
  }
}
```

### `GET /api/v1/notifications/unread-count`

Response data:

```ts
{ unread: number }
```

### `PATCH /api/v1/notifications/:id/read`

Marks one notification read (idempotent). 404 if the notification does not belong to the user.
Response data: `{ notification: {...} }`.

### `PATCH /api/v1/notifications/read-all`

Marks all of the user's notifications read. Response data: `{ marked: number }`.

### `DELETE /api/v1/notifications/:id`

Deletes one notification. 404 if not owned. Response data: `{ deleted: true }`.

## Shared contracts

New files in `packages/shared/src`:

- `types/notifications.ts` — `NotificationType` / `NotificationSeverity` enums + value arrays,
  label maps, `AppNotification`, `NotificationListResult`, `NotificationUnreadCount`.
- `validators/notifications.ts` — `listNotificationsQuerySchema` (`.strict()`).
- `index.ts` — export both.

## Backend structure

```
apps/api/src/modules/notifications/
  notification.repository.types.ts   # NotificationRepository contract + records
  notification.repository.ts         # PrismaNotificationRepository
  notification.service.ts            # refresh() reconciliation + read/delete flows
  notification.controller.ts
  notification.routes.ts
```

- Injected through the container (DI override pattern).
- `NotificationService` depends on `NotificationRepository` plus the existing repositories it
  reads from: `MedicationRepository`, `ReportsRepository`, `MetricsRepository`, `CareRepository`.
- Mounted in `app.ts` behind `requireAuth`:

```ts
apiRouter.use('/notifications', requireAuth(container.tokenService), createNotificationRouter(container.notificationService));
```

## Error handling

- 401 without a token.
- Invalid query params -> `400 VALIDATION_ERROR` (existing `validateQuery`).
- Unknown/unowned notification id -> `404 NOT_FOUND` (owner-scoped pattern).
- No new error codes.

## Security & privacy

- **Owner-scoped only**: every endpoint is keyed by `req.user.id`; no cross-user surface.
- **No PII in bodies beyond the owner's own data**: medication names, report titles, metric labels,
  and the connecting doctor's name are the user's own or explicitly shared data.
- **No content at rest in metadata**: metadata holds ids and summary values only — never report
  text, finding values, adherence data, or tokens.
- **Dedup key is internal**: the `userId+dedupKey` unique is never exposed (serialized responses
  omit it).
- **No audit amplification**: notification reads/materialization are not audited (consistent with
  all other read surfaces); the audit trail stays append-only.
- **No new attack surface**: no uploads, no external calls, no new env vars, no third-party deps.

## Testing

- Shared: query schema accepts/rejects filters; enums and label maps cover all values.
- API unit (`apps/api/tests/notification.service.spec.ts`, new `FakeNotificationRepository`,
  reusing `FakeMedicationRepository`, `FakeReportsRepository`, `FakeMetricsRepository`,
  `FakeCareRepository`): reconciliation for each type, idempotency, resolution (dose taken,
  in-range metric), mark-read/read-all/delete ownership.
- API integration (`apps/api/tests/integration/notifications.integration.spec.ts`): 401 anonymous;
  create medication + metric + report + connection and assert notifications materialize; filters,
  unread-count, mark-read, read-all, delete, 404 ownership.
- Web unit: `notifications-format.spec.ts`.

## Docs

Update `README.md` (Sprint 14 section, roadmap row done, test counts), `docs/API.md`
(notifications endpoints), `docs/SECURITY.md` (notification threat model; remove the pending
Sprint 14 line), `docs/ENVIRONMENT.md` (REDIS_URL now optional queue-push enhancement, not required
for the inbox), `docs/FOLDER_STRUCTURE.md`, and add this design doc.

## Verification

Lint, typecheck, tests, `format:check`, monorepo build, then a live E2E check through the running
dev server (anonymous blocked; materialization from real seeded data; mark-read/read-all/delete).
Commit as `feat: sprint 14 - notifications`. Do not push.
