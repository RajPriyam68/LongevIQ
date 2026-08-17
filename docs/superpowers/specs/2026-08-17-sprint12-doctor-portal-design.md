# Sprint 12 — Doctor Portal (Design)

Date: 2026-08-17

## Summary

LongevIQ Sprint 12 adds a **doctor portal** for DOCTOR-role users built on
patient-initiated consent. A patient (USER) generates a one-time, expiring
share code from their account; a doctor redeems that code to establish a
persistent connection; while connected, the doctor can open a read-only
clinical view of the patient's health overview, metrics, reports (metadata +
parsed findings) and health score/analytics. Either side can end the
connection at any time. Everything is educational and covered by the standard
medical disclaimer.

## Scope

1. Patient-side `/api/v1/care` — create one-time share grants, list connected
   doctors, revoke a connection.
2. Doctor-side `/api/v1/doctor` — redeem a share code, list connected
   patients, disconnect, and read-only patient views (overview, metrics,
   reports, analytics).
3. A protected `/doctor` web page (DOCTOR only) and a "Care team" card on the
   `/account` page (all users).
4. One Prisma migration adding `PatientAccessGrant` and `DoctorPatient`.

Out of scope: raw report file downloads for doctors, chat between patient and
doctor, doctor-authored notes, email invites, and admin surfaces.

## Consent & connection model

- **Patient-initiated**: only a patient can create a grant. A grant yields a
  share code `LV-XXXX-XXXX-XXXX` (12 chars from the unambiguous alphabet
  `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`). The plaintext code is returned exactly
  once at creation; only its SHA-256 hash is stored.
- **One-time + expiring**: a grant is consumed by the first successful
  redemption and expires 7 days after creation (`CARE_GRANT_TTL_DAYS`).
- **Persistent connection**: redemption creates a `DoctorPatient` row. At most
  one *active* (unrevoked) connection exists per (doctor, patient) pair.
- **Revocable by either side**: patient revokes a connection; doctor can
  disconnect. A revoked connection may be re-established later with a new
  grant.
- **Isolation**: every doctor patient-view resolves an active connection for
  the requesting doctor before reading any data; missing/revoked/foreign
  patients return `404 NOT_FOUND` (never `403`, matching the existing
  cross-user isolation pattern).

## Data model (one Prisma migration)

`PatientAccessGrant`:

| Column      | Type     | Notes                                    |
| ----------- | -------- | ---------------------------------------- |
| id          | cuid     | PK                                       |
| patientId   | FK User  | cascade delete, indexed                  |
| codeHash    | String   | sha256 hex, unique                       |
| expiresAt   | DateTime | 7 days after creation                    |
| usedAt      | DateTime?| set on first redemption                  |
| createdAt   | DateTime | default now()                            |

`DoctorPatient`:

| Column      | Type     | Notes                                    |
| ----------- | -------- | ---------------------------------------- |
| id          | cuid     | PK                                       |
| doctorId    | FK User  | indexed                                  |
| patientId   | FK User  | indexed, cascade delete                  |
| connectedAt | DateTime | default now()                            |
| revokedAt   | DateTime?| set on revoke/disconnect                 |
| revokedById | String?  | who ended it (patient or doctor id)      |

The "one active connection per pair" rule is enforced in the service layer
(no partial unique index in Prisma).

## API

New modules under `apps/api/src/modules/care/` and
`apps/api/src/modules/doctor/`, mounted behind `requireAuth`. Doctor routes
also use `requireRoles(UserRole.DOCTOR)`. All responses use the
`{ success, data }` envelope.

### Patient side — `/api/v1/care` (requireAuth)

- `POST /grants` — creates a grant. Response data:
  `{ grant: { id, code, expiresAt } }` (plaintext `code` shown once).
  Audit `DATA.CARE_GRANT_CREATE` (summary metadata only).
- `GET /connections` — response data:
  `{ connections: [{ id, doctor: { id, firstName, lastName, email }, connectedAt }] }`
  (only unrevoked).
- `DELETE /connections/:connectionId` — revoke. Not own -> `404`.
  Audit `DATA.CARE_CONNECTION_REVOKE`.

### Doctor side — `/api/v1/doctor` (requireAuth + DOCTOR role)

- `POST /connections` — body `{ code }` validated by shared
  `redeemCodeSchema` (regex). Invalid format -> `400`; unknown/used/expired
  code -> single masked `409 CONFLICT "Invalid or expired share code."`.
  Success returns `{ connection: { id, patient: { id, firstName, lastName, email }, connectedAt } }`;
  if an active connection already exists it is returned instead (grant still
  consumed). Audit `DATA.CARE_CONNECTION_ACCEPT`.
- `GET /connections` — response data:
  `{ connections: [{ id, patient: { id, firstName, lastName, email }, connectedAt }] }`.
- `DELETE /connections/:patientId` — disconnect (soft revoke). Not own ->
  `404`. Audit `DATA.CARE_CONNECTION_DISCONNECT`.
- `GET /patients/:patientId/overview` — delegates to `DashboardService.overview`.
  Response `{ overview }`.
- `GET /patients/:patientId/metrics` — delegates to `MetricsService.listMetrics`
  (same query params: type/from/to/page/limit/sort). Response
  `{ metrics: { items, pagination } }`.
- `GET /patients/:patientId/reports` — delegates to `ReportsService.listReports`
  (same query params: category/status/page/limit/sort). Response
  `{ reports: { items, pagination } }`. No file download endpoint.
- `GET /patients/:patientId/analytics?days=` — delegates to
  `AnalyticsService` summary/score/insights. Response
  `{ analytics: { summary, score, insights } }`. `days` validated 1-365 by the
  shared `analyticsQuerySchema`.

All four patient-data endpoints call a private `requireActiveConnection`
guard (returns the connection row or throws `404`).

## Shared contracts

New files in `packages/shared/src`:

- `types/care.ts` — `CareConnection`, `CareConnectionDoctor`, `DoctorConnection`,
  `DoctorConnectionPatient`, `RedeemConnectionInput`.
- `constants/care.ts` — `CARE_GRANT_TTL_DAYS = 7`,
  `CARE_CODE_REGEX`, `CARE_CODE_ALPHABET`.
- `validators/care.ts` — `redeemCodeSchema` (zod: required string matching
  `CARE_CODE_REGEX`).
- `index.ts` — export all three.

## Backend structure (new modules)

```
apps/api/src/modules/care/
  care.repository.types.ts   # CareRepository interface
  care.repository.ts         # PrismaCareRepository
  care.service.ts            # createGrant, listConnections, revokeConnection
  care.controller.ts
  care.routes.ts
apps/api/src/modules/doctor/
  doctor.service.ts          # redeem/list/disconnect + guarded patient views
  doctor.controller.ts
  doctor.routes.ts
```

- The care/doctor repositories are injected through the container (DI override
  pattern used across the app).
- `DoctorService` depends on `CareRepository` (connections), `DashboardService`,
  `MetricsService`, `ReportsService`, `AnalyticsService`, plus an audit sink,
  and delegates to those services with the **patient's** userId after the
  connection guard passes.

## Web UI

- `apps/web/src/components/auth/require-role.tsx` — `RequireRole` guard
  (client component; reads `useAuthStore`; renders children only when
  `user.role` matches, otherwise redirects with a toast).
- `apps/web/src/app/doctor/page.tsx` — protected DOCTOR-only portal:
  connect-by-code form and connected-patients list.
- `apps/web/src/app/doctor/patients/[patientId]/page.tsx` — patient detail
  reached by linking from the patients list, with tabs (Overview / Metrics /
  Reports / Analytics) reusing existing dashboard/analytics UI primitives
  where practical.
- `/account` — new "Care team" card: generate code (one-time display + copy),
  list active connections, revoke.
- Site header: add a "Doctor" link shown only to DOCTOR-role users.
- `apps/web/src/lib/care-api.ts` and `doctor-api.ts` — typed axios clients.
- `apps/web/src/lib/doctor-format.ts` (+ `doctor-format.spec.ts`) — date/name
  formatting helpers.

## Error handling

- Auth: 401 without token; 403 when a non-DOCTOR hits `/doctor`.
- Share-code redemption: format validation -> `400 VALIDATION_ERROR`; any other
  failure (unknown, used, expired) -> `409 CONFLICT` with a single masked
  message (no existence oracle).
- Patient views without an active connection -> `404 NOT_FOUND`.

## Security & privacy

- Share codes are high-entropy (12-char unambiguous alphabet), hashed with
  SHA-256 at rest, single-use, and TTL-bounded; the plaintext is only ever
  returned once at creation.
- Connections are bidirectional: doctors see only patients who granted them
  access; patients see and can revoke any connection they granted.
- Doctor patient-data endpoints are strictly read-only and never expose the
  raw report file; report responses omit `storageKey`/`parsedText`.
- Audit is limited to connection lifecycle events
  (`DATA.CARE_GRANT_CREATE`, `DATA.CARE_CONNECTION_ACCEPT`,
  `DATA.CARE_CONNECTION_REVOKE`, `DATA.CARE_CONNECTION_DISCONNECT`) with
  summary metadata only; patient-data reads are not individually audited
  (consistent with other read surfaces).
- No new environment variables, no new third-party dependencies, no LLM calls.

## Testing

- Shared: `redeemCodeSchema` accepts/rejects formats.
- API unit (`apps/api/tests/care.service.spec.ts`,
  `apps/api/tests/doctor.service.spec.ts`): grant creation (code format, hash
  stored, TTL), redemption (valid/used/expired/unknown/duplicate), revoke and
  disconnect (404 isolation), and patient-view guards — using new
  `FakeCareRepository`.
- API integration (`apps/api/tests/integration/doctor.integration.spec.ts`):
  full flow — patient registers + creates grant, doctor registers (role USER)
  is forbidden, a DOCTOR redeems the code, patient data endpoints return the
  patient's real data, non-connected doctor gets 404, patient revokes and the
  doctor immediately loses access, reuse of a consumed code -> 409.
- Web unit: `doctor-format.spec.ts`.

## Docs

Update `README.md` (Sprint 12 section, roadmap row done, test counts),
`docs/API.md` (care + doctor endpoints), `docs/SECURITY.md` (doctor portal
threat model), `docs/FOLDER_STRUCTURE.md` (Sprint 12 structure), and
`docs/ENVIRONMENT.md` (no new env vars).

## Verification

Lint, typecheck, tests, `format:check`, monorepo build, then a live E2E check
through the running dev server (patient creates a code -> doctor redeems ->
views patient analytics; patient revokes -> doctor gets 404). Commit as
`feat: sprint 12 - doctor portal`. Do not push.
