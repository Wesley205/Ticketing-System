# Phase 8: Observability and Operations

## Implemented

- Added request correlation through `X-Request-ID`.
- Added structured JSON application logs through `backend/src/utils/logger.js`.
- Added recursive redaction for secret-like log fields such as passwords, tokens, cookies, credentials, authorization headers, sessions, and API keys.
- Added per-request completion logs with method, path, status code, duration, and user ID when available.
- Added request-correlated API error responses.
- Added health endpoints:
  - `GET /api/health`
  - `GET /api/health/readiness`
  - `GET /api/health/operations`
- Added protected operational visibility for migration state, latest background-job runs, notification queue depth, and SLA overdue counts.

## Endpoint Behavior

### `GET /api/health`

Public lightweight liveness check. Returns service name, version, uptime, timestamp, and request ID.

### `GET /api/health/readiness`

Public readiness check. Verifies PostgreSQL connectivity and migration tracking table access. Returns `200` when ready and `503` when a required check fails.

### `GET /api/health/operations`

Authenticated operational check. Requires the same permission used for audit-log access. Returns:

- recent migration state
- latest background-job status by job name
- notification delivery counts by status
- overdue SLA counts

This endpoint intentionally avoids secrets, connection strings, tokens, raw SQL parameters, and payload bodies.

## Logging Rules

- Logs are JSON objects with `timestamp`, `level`, `event`, and event metadata.
- Request bodies are not logged.
- Sensitive fields are redacted recursively before writing.
- Every request receives a request ID, either from a safe inbound `X-Request-ID` header or a generated UUID.
- API error responses include `request_id` so operators can correlate user-visible failures with backend logs.

## Remaining Operational Work

- Add external log shipping in the deployment environment.
- Add runtime metrics scraping if Prometheus, OpenTelemetry, or a hosted APM service is selected.
- Add backup and restore runbooks for PostgreSQL and attachment storage.
- Add synthetic smoke checks for production deployments.
