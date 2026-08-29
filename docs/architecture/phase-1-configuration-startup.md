# Phase 1: Configuration And Startup Hardening

Phase 1 centralizes runtime configuration and adds production guardrails without changing application routes or database behavior.

## Changes

- Added `backend/src/config/runtime.js` for environment parsing and validation.
- Routed PostgreSQL pool configuration through the runtime config module.
- Replaced unrestricted default CORS with an allow-list based on `CORS_ALLOWED_ORIGINS` and `INTERNAL_APP_BASE_URL`.
- Kept same-origin browser requests working by allowing requests with no `Origin` header.
- Added production validation for:
  - strong `JWT_SECRET`
  - configured organization email domains
  - explicit `CORS_ALLOWED_ORIGINS`
  - configured `PGPASSWORD`
  - non-empty `JSON_BODY_LIMIT`
- Added pool and SSL settings to `backend/.env.example`.
- Added graceful shutdown handling for `SIGTERM` and `SIGINT`.
- Validated startup configuration before creating the PostgreSQL pool.
- Added unit tests for runtime config, CORS rules, and database config parsing.

## Environment keys

- `CORS_ALLOWED_ORIGINS`: comma-separated browser origins allowed to call the API.
- `DB_SSL`: enables PostgreSQL SSL when set to `true`.
- `DB_SSL_REJECT_UNAUTHORIZED`: controls PostgreSQL SSL certificate verification.
- `PGPOOL_MAX`: maximum PostgreSQL pool clients.
- `PGIDLE_TIMEOUT_MS`: idle PostgreSQL client timeout.
- `PGCONNECTION_TIMEOUT_MS`: PostgreSQL connection timeout.

## Production deployment notes

- Do not deploy with placeholder `JWT_SECRET`.
- Set `CORS_ALLOWED_ORIGINS` to the real HTTPS frontend origin.
- Keep real database credentials out of Git and environment examples.
- Enable `DB_SSL` when the production database requires encrypted connections.
- Run `npm test` before deployment.
