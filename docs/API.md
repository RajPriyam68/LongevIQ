# API Reference

Versioned REST API under `/api/v1`. All responses use a uniform envelope:

```json
{ "success": true, "data": { ... } }
{ "success": false, "error": { "code": "...", "message": "...", "details": { ... } } }
```

## Current Endpoints (Sprint 0)

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
| `VALIDATION_ERROR`    | 400  | Request failed zod/input validation       |
| `INVALID_JSON`        | 400  | Malformed JSON body                       |
| `INVALID_PAYLOAD`     | 400  | Body could not be verified                |
| `PAYLOAD_TOO_LARGE`   | 413  | Body exceeds the size limit (2 MB)        |
| `UNAUTHORIZED`        | 401  | Missing/invalid credentials               |
| `FORBIDDEN`           | 403  | Authenticated but not allowed             |
| `NOT_FOUND`           | 404  | Resource or route not found               |
| `CONFLICT`            | 409  | State conflict (e.g. duplicate)           |
| `RATE_LIMITED`        | 429  | Rate limit exceeded                       |
| `INTERNAL_ERROR`      | 500  | Unexpected server error (masked in prod)  |

## Future Modules

The following route groups are added by later Sprints (see `docs/ARCHITECTURE.md`):

- `POST /api/v1/auth/*` (Sprint 1)
- `GET /api/v1/users/me` (Sprint 1)
- `GET /api/v1/dashboard/*` (Sprint 2)
- `POST /api/v1/reports` + presigned uploads (Sprint 3)
- `POST /api/v1/ai/chat` (Sprint 6)
- `GET /api/v1/nutrition/plans` (Sprint 7)
- `GET /api/v1/workouts/plans` (Sprint 8)
- Medication, voice, analytics, doctor, admin modules (Sprints 9-13)

Swagger/OpenAPI documentation will be generated when the first stable module ships (Sprint 1).
