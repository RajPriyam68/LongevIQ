# API Reference

Versioned REST API under `/api/v1`. All responses use a uniform envelope:

```json
{ "success": true, "data": { ... } }
{ "success": false, "error": { "code": "...", "message": "...", "details": { ... } } }
```

## Current Endpoints (Sprint 5)

### Health check

`GET /api/v1/health`

Returns application liveness/readiness information.

**Response 200**

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "app": "LongevIQ",
    "version": "0.1.0",
    "environment": "development",
    "timestamp": "2026-08-06T15:33:24.477Z",
    "uptimeSeconds": 12
  }
}
```

### Authentication

All endpoints below are mounted under `/api/v1/auth` and are rate-limited (20 requests / 15 min per
IP). The refresh token is stored in an **httpOnly cookie** (`lq_refresh`, `path=/`, `SameSite=Lax`,
`Secure` when `COOKIE_SECURE=true`). Access tokens are short-lived JWTs sent via
`Authorization: Bearer <token>`.

#### Register

`POST /api/v1/auth/register`

Creates a password user, sends a verification email, and (in non-production) returns a
`verificationUrl`.

**Request body**

```json
{
  "email": "ada@example.com",
  "password": "StrongPass!1",
  "firstName": "Ada",
  "lastName": "Lovelace"
}
```

**Response 201**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_...",
      "email": "ada@example.com",
      "firstName": "Ada",
      "lastName": "Lovelace",
      "role": "USER",
      "emailVerified": false,
      "avatarUrl": null,
      "createdAt": "2026-08-07T00:00:00.000Z"
    },
    "verificationUrl": "http://localhost:3000/auth/verify-email?token=..."
  }
}
```

`verificationUrl` is **only** returned when `NODE_ENV !== 'production'`.

**Errors**: `400 VALIDATION_ERROR`, `409 CONFLICT` (duplicate email).

#### Login

`POST /api/v1/auth/login`

**Request body**

```json
{ "email": "ada@example.com", "password": "StrongPass!1" }
```

**Response 200** (also sets the `lq_refresh` cookie)

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
    "user": { "id": "usr_...", "email": "ada@example.com", "role": "USER", "emailVerified": true }
  }
}
```

**Errors**: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED` (bad credentials; the message does not reveal
whether the account exists), `403 EMAIL_NOT_VERIFIED` (password accounts must verify email first).

#### Refresh

`POST /api/v1/auth/refresh`

Requires the `lq_refresh` cookie. Rotates the refresh token (old token revoked, new token issued)
and returns a fresh access token.

**Response 200**

```json
{ "success": true, "data": { "accessToken": "...", "user": { ... } } }
```

**Errors**: `401 UNAUTHORIZED` (missing/revoked token). Reusing a revoked token revokes the user's
entire session family (theft detection).

#### Logout

`POST /api/v1/auth/logout`

Requires the `lq_refresh` cookie (or an authenticated `Authorization` header). Revokes the refresh
token and clears the cookie.

**Response 200**: `{ "success": true, "data": { "loggedOut": true } }`

#### Verify email

`POST /api/v1/auth/verify-email`

**Request body**

```json
{ "token": "..." }
```

**Response 200**: `{ "success": true, "data": { "verified": true } }`

**Errors**: `400 VALIDATION_ERROR` (invalid, expired, or already-consumed token).

#### Resend verification

`POST /api/v1/auth/resend-verification`

**Request body**

```json
{ "email": "ada@example.com" }
```

**Response 200**: `{ "success": true, "data": { "sent": true } }` (plus `verificationUrl` in
non-production). Silently succeeds for unknown/already-verified accounts to avoid enumeration.

#### Auth config

`GET /api/v1/auth/config`

**Response 200**

```json
{
  "success": true,
  "data": {
    "providers": [{ "provider": "google", "enabled": true, "clientId": "..." }],
    "verificationRequired": true
  }
}
```

#### Google OAuth

`GET /api/v1/auth/google/login` → `200` `{ "url": "https://accounts.google.com/o/oauth2/..." }` and
sets a short-lived `lq_oauth_state` cookie (hashed state).

`GET /api/v1/auth/google/callback?code=...&state=...` → exchanges the code server-side, validates
state (constant-time), sets the `lq_refresh` cookie, and **redirects** to
`<client-origin>/auth/callback`, where the web app calls `POST /auth/refresh` to obtain its access
token.

When `GOOGLE_CLIENT_ID` is unset, the provider is disabled and `/auth/google/login` returns
`503 INTERNAL_ERROR` ("Google authentication is not configured.").

### Current user

All endpoints require `Authorization: Bearer <accessToken>`.

#### Get profile

`GET /api/v1/users/me`

**Response 200**: `{ "success": true, "data": { "user": { ... } } }`

#### Update profile

`PATCH /api/v1/users/me`

**Request body** (at least one field)

```json
{ "firstName": "Ada", "lastName": "King" }
```

**Response 200**: `{ "success": true, "data": { "user": { ... } } }`

#### Change password

`POST /api/v1/users/me/password`

**Request body**

```json
{ "currentPassword": "OldPass!1", "newPassword": "NewPass!1" }
```

**Response 200**: `{ "success": true, "data": { "changed": true } }`. Revokes **all** of the user's
sessions; the client must sign in again.

**Errors**: `400 VALIDATION_ERROR` (incorrect current password).

### Health metrics

All endpoints require `Authorization: Bearer <accessToken>`. Metrics are scoped to the
authenticated user — records belonging to other users are indistinguishable from missing ones
(`404 NOT_FOUND`). The `unit` for each type is canonical (see `HEALTH_METRIC_META` in
`packages/shared`).

Supported metric types and ranges:

| Type               | Label            | Unit    | Range        | Secondary (label)     |
| ------------------ | ---------------- | ------- | ------------ | --------------------- |
| `BLOOD_PRESSURE`   | Blood pressure   | mmHg    | 60–250       | Diastolic 40–150 (required) |
| `HEART_RATE`       | Heart rate       | bpm     | 20–250       | —                     |
| `WEIGHT`           | Weight           | kg      | 1–500        | —                     |
| `BLOOD_GLUCOSE`    | Blood glucose    | mg/dL   | 20–600       | —                     |
| `BMI`              | Body mass index  | kg/m²   | 10–80        | —                     |
| `SLEEP_HOURS`      | Sleep            | hours   | 0–24         | —                     |
| `STEPS`            | Steps            | steps   | 0–200000     | —                     |
| `BODY_TEMPERATURE` | Body temperature | °C      | 30–45        | —                     |

#### Create a metric

`POST /api/v1/metrics`

**Request body**

```json
{
  "type": "BLOOD_PRESSURE",
  "value": 120,
  "valueSecondary": 80,
  "recordedAt": "2026-08-07T08:30:00.000Z",
  "notes": "Morning reading"
}
```

`valueSecondary` is required for compound types (e.g. `BLOOD_PRESSURE`) and rejected for simple
types. `recordedAt` and `notes` are optional; when `recordedAt` is omitted the server uses the
current time.

**Response 201**

```json
{
  "success": true,
  "data": {
    "metric": {
      "id": "met_...",
      "type": "BLOOD_PRESSURE",
      "value": 120,
      "valueSecondary": 80,
      "unit": "mmHg",
      "recordedAt": "2026-08-07T08:30:00.000Z",
      "notes": "Morning reading",
      "createdAt": "2026-08-07T08:31:00.000Z",
      "updatedAt": "2026-08-07T08:31:00.000Z"
    }
  }
}
```

**Errors**: `400 VALIDATION_ERROR` (range/compound/format checks), `401 UNAUTHORIZED`.

#### List metrics

`GET /api/v1/metrics?type=WEIGHT&page=1&limit=20&sort=desc`

Query params are all optional: `type`, `from`/`to` (ISO-8601 date-time), `page` (min 1), `limit`
(1–100, default 20), `sort` (`asc`|`desc`, default `desc` by `recordedAt`).

**Response 200**

```json
{
  "success": true,
  "data": {
    "items": [ { "id": "met_...", "type": "WEIGHT", "value": 72.5, "unit": "kg", "...": "..." } ],
    "pagination": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 }
  }
}
```

#### Get a metric

`GET /api/v1/metrics/:id`

**Response 200**: `{ "success": true, "data": { "metric": { ... } } }`

**Errors**: `404 NOT_FOUND` (does not exist or belongs to another user).

#### Update a metric

`PATCH /api/v1/metrics/:id`

**Request body** (at least one field; omitted fields keep their current value; `valueSecondary`
may be set to `null` to clear it)

```json
{ "value": 121, "notes": null }
```

**Response 200**: `{ "success": true, "data": { "metric": { ... } } }`

**Errors**: `400 VALIDATION_ERROR`, `404 NOT_FOUND`.

#### Delete a metric

`DELETE /api/v1/metrics/:id`

**Response 200**: `{ "success": true, "data": { "deleted": true } }`

**Errors**: `404 NOT_FOUND`.

### Dashboard

All endpoints require `Authorization: Bearer <accessToken>`.

#### Dashboard overview

`GET /api/v1/dashboard/overview`

Aggregates the authenticated user's metrics: latest and previous measurement per type with the
change (`delta`) between them, counts, and the 10 most recent measurements across all types.

**Response 200**

```json
{
  "success": true,
  "data": {
    "overview": {
      "summary": [
        {
          "type": "WEIGHT",
          "label": "Weight",
          "unit": "kg",
          "count": 2,
          "latest": { "id": "met_...", "type": "WEIGHT", "value": 71.8, "unit": "kg", "..." : "..." },
          "previous": { "id": "met_...", "type": "WEIGHT", "value": 72.5, "unit": "kg", "..." : "..." },
          "delta": -0.7
        }
      ],
      "recent": [ { "id": "met_...", "type": "BLOOD_PRESSURE", "value": 120, "..." : "..." } ]
    }
  }
}
```

`delta` is `latest - previous` rounded to 2 decimal places, or `null` when the type has fewer than
two measurements. `summary` always contains all 8 metric types.

### Medical reports

All endpoints require `Authorization: Bearer <accessToken>`. Reports are scoped to the
authenticated user — records belonging to other users are indistinguishable from missing ones
(`404 NOT_FOUND`).

Supported file types (validated by magic bytes, not by the client's content type): PDF
(`application/pdf`), PNG (`image/png`), and JPEG (`image/jpeg`). The maximum file size is
`MAX_UPLOAD_BYTES` (default 10 MB); larger uploads return `413 PAYLOAD_TOO_LARGE`. Files are stored
in S3 when `S3_BUCKET` is configured, otherwise on the local filesystem
(`STORAGE_UPLOAD_DIR`).

Report categories: `BLOODWORK`, `IMAGING`, `GENERAL`, `OTHER` (default `OTHER`).
Report status: `UPLOADED`, `PROCESSING`, `PARSED`, `FAILED`.

Every upload is processed synchronously before the response is returned: digital PDFs are
read via embedded text, and scanned PDFs / PNG / JPEG images are OCR'd (tesseract.js WASM +
`@napi-rs/canvas`; model and font are vendored in `apps/api/assets`). Text is extracted and,
for `BLOODWORK`/`GENERAL` reports, parsed into structured findings (name, value, unit,
reference range, flag, confidence). Successful parsing sets the status to `PARSED`; an
empty/unparseable document sets it to `FAILED` with a `processingError`. Parsing failures
never reject the upload — the file is always stored and retrievable.

#### Upload a report

`POST /api/v1/reports` — `multipart/form-data` with a single `file` field plus metadata fields.

| Field        | Required | Notes                                |
| ------------ | -------- | ------------------------------------ |
| `file`       | yes      | PDF/PNG/JPEG file                    |
| `title`      | yes      | 1–120 characters                     |
| `reportDate` | yes      | Valid date (e.g. `2026-08-01`)       |
| `category`   | no       | Defaults to `OTHER`                  |
| `source`     | no       | Clinic/lab name, max 100 characters  |
| `notes`      | no       | Max 500 characters                   |

**Response 201**

```json
{
  "success": true,
  "data": {
    "report": {
      "id": "rep_...",
      "title": "Annual bloodwork",
      "reportDate": "2026-08-01T00:00:00.000Z",
      "source": "Central Lab",
      "category": "BLOODWORK",
      "notes": null,
      "status": "PARSED",
      "fileName": "bloodwork.pdf",
      "fileSizeBytes": 184000,
      "mimeType": "application/pdf",
      "createdAt": "2026-08-08T10:00:00.000Z",
      "updatedAt": "2026-08-08T10:00:00.000Z"
    }
  }
}
```

**Errors**: `400 VALIDATION_ERROR` (missing metadata, unsupported file type), `413
PAYLOAD_TOO_LARGE`, `401 UNAUTHORIZED`.

#### List reports

`GET /api/v1/reports?page=1&limit=20&sort=desc&category=BLOODWORK&status=UPLOADED`

Query params are all optional: `page` (min 1), `limit` (1–100, default 20), `sort`
(`asc`|`desc` by `createdAt`, default `desc`), `category`, `status`.

**Response 200**

```json
{
  "success": true,
  "data": {
    "items": [ { "id": "rep_...", "title": "Annual bloodwork", "..." : "..." } ],
    "pagination": { "page": 1, "limit": 20, "total": 12, "totalPages": 1 }
  }
}
```

#### Get a report

`GET /api/v1/reports/:id`

**Response 200**: `{ "success": true, "data": { "report": { ... } } }`

The detail response extends the list shape with processing fields:

```json
{
  "success": true,
  "data": {
    "report": {
      "id": "rep_...",
      "title": "Annual bloodwork",
      "reportDate": "2026-08-01T00:00:00.000Z",
      "source": "Central Lab",
      "category": "BLOODWORK",
      "notes": null,
      "status": "PARSED",
      "fileName": "bloodwork.pdf",
      "fileSizeBytes": 184000,
      "mimeType": "application/pdf",
      "createdAt": "2026-08-08T10:00:00.000Z",
      "updatedAt": "2026-08-08T10:00:00.000Z",
      "parsedText": "GLUCOSE 95 mg/dL (ref 70-99)\nHEMOGLOBIN A1c 5.4 % (ref 4.0-5.6)",
      "processingError": null,
      "parsedAt": "2026-08-08T10:00:01.000Z",
      "findings": [
        {
          "id": "repf_...",
          "name": "Glucose",
          "value": "95",
          "unit": "mg/dL",
          "referenceRange": "70 - 99",
          "flag": "NORMAL",
          "confidence": 1,
          "sortOrder": 0
        },
        {
          "id": "repf_...",
          "name": "Hemoglobin A1c",
          "value": "5.4",
          "unit": "%",
          "referenceRange": "4 - 5.6",
          "flag": "NORMAL",
          "confidence": 1,
          "sortOrder": 1
        }
      ]
    }
  }
}
```

Fields:

| Field            | Type      | Notes                                            |
| ---------------- | --------- | ------------------------------------------------ |
| `parsedText`     | string?   | Raw text extracted from the document             |
| `processingError`| string?   | Set when the status is `FAILED`                  |
| `parsedAt`       | string?   | ISO timestamp of the last successful parse       |
| `findings`       | array     | Structured findings, empty for non-parseable reports |
| `findings[].flag`| string?   | `NORMAL`, `HIGH`, `LOW`, or `null`               |
| `findings[].confidence` | number | 0–1 extraction confidence                   |

**Errors**: `404 NOT_FOUND` (does not exist or belongs to another user).

#### Download a report file

`GET /api/v1/reports/:id/file`

Streams the stored file with `Content-Type` set to the detected MIME type, a
`Content-Disposition: inline` header, and `Content-Length`. Requires ownership.

**Response 200**: raw file bytes.

**Errors**: `404 NOT_FOUND`.

#### Update a report

`PATCH /api/v1/reports/:id`

**Request body** (at least one field; `source` and `notes` may be set to `null` to clear them)

```json
{ "title": "Annual bloodwork 2026", "notes": null }
```

**Response 200**: `{ "success": true, "data": { "report": { ... } } }`

**Errors**: `400 VALIDATION_ERROR`, `404 NOT_FOUND`.

#### Delete a report

`DELETE /api/v1/reports/:id`

Removes the database record and the stored file.

**Response 200**: `{ "success": true, "data": { "deleted": true } }`

**Errors**: `404 NOT_FOUND`.

### Knowledge base

All endpoints require `Authorization: Bearer <accessToken>`. The knowledge base holds curated,
chunked educational articles; searches run PostgreSQL full-text search over published chunks.
Create, update, and delete require the `ADMIN` role.

#### Search the knowledge base

`GET /api/v1/knowledge/search?q=HbA1c&limit=10&category=LABS`

| Query     | Type   | Default | Notes                                    |
| --------- | ------ | ------- | ---------------------------------------- |
| `q`       | string | —       | Required search text (1–200 chars)       |
| `limit`   | int    | 10      | Max results (1–50)                       |
| `category`| enum   | —       | `METRICS`, `LABS`, `NUTRITION`, `WELLNESS` |

Only `PUBLISHED` documents are searchable. Responses include a `snippet` with `<mark>` tags
around matches and a `score` produced by `ts_rank_cd`.

**Response 200**

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "chunkId": "clz...",
        "documentId": "clz...",
        "slug": "blood-glucose-and-hba1c",
        "documentTitle": "Blood Glucose and HbA1c",
        "category": "LABS",
        "source": "LongevIQ Editorial",
        "chunkIndex": 1,
        "title": "What the numbers mean",
        "snippet": "A normal <mark>HbA1c</mark> is below 5.7 percent.",
        "content": "A normal fasting glucose is below 100 mg/dL. ...",
        "score": 0.0253
      }
    ]
  }
}
```

#### List knowledge documents

`GET /api/v1/knowledge?page=1&limit=20&category=NUTRITION&status=PUBLISHED`

Non-admin users are always constrained to `PUBLISHED` documents; the `status` filter is only
honored for admins.

**Response 200**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "clz...",
        "slug": "mediterranean-diet",
        "title": "The Mediterranean Diet",
        "summary": "The core principles of the Mediterranean diet.",
        "category": "NUTRITION",
        "source": "LongevIQ Editorial",
        "status": "PUBLISHED",
        "language": "english",
        "createdAt": "2026-08-10T00:00:00.000Z",
        "updatedAt": "2026-08-10T00:00:00.000Z"
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
  }
}
```

#### Get a knowledge document

`GET /api/v1/knowledge/:id`

Returns the document metadata plus its ordered chunks. Drafts return `404 NOT_FOUND` for
non-admin users.

#### Create a knowledge document (admin)

`POST /api/v1/knowledge`

| Field      | Type    | Notes                                              |
| ---------- | ------- | -------------------------------------------------- |
| `slug`     | string  | Unique, lowercase letters/digits/hyphens (≤120)    |
| `title`    | string  | Required (≤150 chars)                              |
| `summary`  | string  | Optional (≤400 chars)                              |
| `category` | enum    | Default `WELLNESS`                                 |
| `source`   | string  | Optional (≤100 chars)                              |
| `status`   | enum    | `DRAFT` or `PUBLISHED` (default `DRAFT`)           |
| `language` | string  | Default `english` (FTS uses the English config)    |
| `content`  | string  | Required markdown (≤1,000,000 chars)               |

The content is chunked server-side and each chunk is indexed for full-text search. A duplicate
`slug` returns `409 CONFLICT`.

**Response 201** — the full document with `chunks`.

**Errors**: `403 FORBIDDEN`, `409 CONFLICT`, `400 VALIDATION_ERROR`.

#### Update a knowledge document (admin)

`PATCH /api/v1/knowledge/:id`

Accepts any subset of `title`, `summary`, `category`, `source`, `status`, `content`. When
`content` is provided the document is re-chunked and re-indexed. At least one field is required.

#### Delete a knowledge document (admin)

`DELETE /api/v1/knowledge/:id`

**Response 200**: `{ "success": true, "data": { "deleted": true } }`

### Not found

Any unknown route returns:

**Response 404**

```json
{
  "success": false,
  "error": { "code": "NOT_FOUND", "message": "Route not found: GET /api/v1/does-not-exist" }
}
```

## Error Codes

| Code                  | HTTP | Meaning                                   |
| --------------------- | ---- | ----------------------------------------- |
| `VALIDATION_ERROR`    | 400  | Request failed zod/input validation; also invalid verification tokens and incorrect current password |
| `INVALID_JSON`        | 400  | Malformed JSON body                       |
| `INVALID_PAYLOAD`     | 400  | Body could not be verified                |
| `UNAUTHORIZED`        | 401  | Missing/invalid credentials or token      |
| `EMAIL_NOT_VERIFIED`  | 403  | Email not verified (login blocked)        |
| `FORBIDDEN`           | 403  | Authenticated but not allowed / deactivated account |
| `NOT_FOUND`           | 404  | Resource or route not found               |
| `CONFLICT`            | 409  | State conflict (e.g. duplicate email)     |
| `RATE_LIMITED`        | 429  | Rate limit exceeded                       |
| `PAYLOAD_TOO_LARGE`   | 413  | Request body or uploaded file exceeds the size limit |
| `INTERNAL_ERROR`      | 500/503 | Unexpected server error (masked in prod); unconfigured OAuth provider |

## Future Modules

The following route groups are added by later Sprints (see `docs/ARCHITECTURE.md`):

- `POST /api/v1/ai/chat` (Sprint 6)
- `GET /api/v1/nutrition/plans` (Sprint 7)
- `GET /api/v1/workouts/plans` (Sprint 8)
- Medication, voice, analytics, doctor, admin modules (Sprints 9-13)

Swagger/OpenAPI documentation will be generated alongside the analytics module.
