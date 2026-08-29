# Refactor Roadmap

This roadmap sequences production-grade standardization work after the Phase 0 audit. It intentionally avoids runtime changes in Phase 0.

## Phase 1: Configuration and startup hardening

- Centralize environment parsing and validation in one config module.
- Require production-safe values for JWT, organization domains, CORS origins, database SSL, upload limits, and scheduler toggles.
- Replace default unrestricted CORS with explicit allowed origins.
- Add graceful startup failure messages that do not expose secrets.
- Add a deployment checklist for local, staging, and production environments.

## Phase 2: Database migration reliability

- Make bootstrap and incremental migrations a single repeatable path for new databases.
- Add live PostgreSQL migration tests using a disposable test database.
- Add migration rollback or forward-fix guidance for production incidents.
- Document seed-data boundaries: demo-only fixtures versus production data.
- Add schema drift checks between `database/schema.sql` and migrations.

## Phase 3: Authentication and session hardening

- Add login rate limiting and account lockout thresholds.
- Move toward httpOnly secure cookies or a documented XSS mitigation strategy if `localStorage` remains.
- Add session invalidation/versioning for deactivated users, password changes, and role changes.
- Add password policy checks at account creation and invitation acceptance.
- Add audit coverage for failed login, locked account, password reset, and profile changes.

## Phase 4: Authorization standardization

- Move authorization from `utils` into an explicit policy/service boundary.
- Replace direct per-route permission checks with reusable route guards and record loaders where possible.
- Add integration tests that prove unauthorized users cannot access cross-department, cross-assignment, or privileged records.
- Document every permission key returned in `access_profile`.
- Keep frontend permission checks presentation-only.

## Phase 5: Service-layer consolidation

- Move remaining write operations out of route handlers and into transactional services.
- Standardize service return shapes and error mapping.
- Ensure audit logs, ticket history, notifications, and state changes are committed atomically.
- Add consistent pagination, sorting, and filter validation helpers.
- Reduce duplicated SQL fragments across dashboard, reports, tickets, assets, and maintenance.

## Phase 6: Operational jobs and delivery infrastructure

- Replace or wrap in-process schedulers with a single-run command plus external scheduler support.
- Add leader-election or lock-table protection if jobs continue to run inside multiple app instances.
- Add job run history tables for SLA, account expiry, maintenance reminders, and notification processing.
- Add retry/backoff observability for notification deliveries.
- Decide on durable file storage for ticket attachments before production scaling.

## Phase 7: Frontend production readiness

- Keep static frontend if project scope remains simple, or move to a build system only with clear justification.
- Add end-to-end tests for login, route guards, ticket workflow, staff lifecycle, reports, and notifications.
- Add CSP and frontend XSS hardening, especially because the current session token is in `localStorage`.
- Standardize accessible loading, empty, error, and unauthorized states across pages.
- Add cache-control and asset-versioning strategy for static files.

## Phase 8: Observability and operations

- Add structured request logging with request IDs.
- Add centralized error logging without leaking sensitive payloads.
- Add health endpoints for app, database, migration state, and background-job status.
- Add metrics for request latency, job results, notification queue depth, SLA overdue counts, and database errors.
- Add backup and restore runbooks for PostgreSQL and attachment storage.

## Phase 9: CI/CD and release controls

- Add CI steps for dependency install, unit tests, migration checks, lint/static checks, and packaging.
- Add environment-specific deployment gates.
- Add dependency vulnerability scanning.
- Add release notes and database migration review requirements.
- Add smoke tests for deployed environments.

## Recommended order

1. Configuration and migration reliability.
2. Authentication/session hardening.
3. Authorization and service-layer standardization.
4. Job/file-storage production readiness.
5. Frontend hardening and E2E tests.
6. Observability and CI/CD.
