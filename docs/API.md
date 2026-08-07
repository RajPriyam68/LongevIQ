# API Reference

Versioned REST API under `/api/v1`. All responses use a uniform envelope:

```json
{ "success": true, "data": { ... } }
{ "success": false, "error": { "code": "...", "message": "...", "details": { ... } } }
```

## Current Endpoints (Sprint 1)

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
| `INTERNAL_ERROR`      | 500/503 | Unexpected server error (masked in prod); unconfigured OAuth provider |

## Future Modules

The following route groups are added by later Sprints (see `docs/ARCHITECTURE.md`):

- `GET /api/v1/dashboard/*` (Sprint 2)
- `POST /api/v1/reports` + presigned uploads (Sprint 3)
- `POST /api/v1/ai/chat` (Sprint 6)
- `GET /api/v1/nutrition/plans` (Sprint 7)
- `GET /api/v1/workouts/plans` (Sprint 8)
- Medication, voice, analytics, doctor, admin modules (Sprints 9-13)

Swagger/OpenAPI documentation will be generated when the dashboard module ships (Sprint 2).
