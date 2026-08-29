# Current Architecture State

Phase 0 repository audit for the NSC ICT Service Desk application.

## Application shape

- Runtime: Node.js 18+, Express 4, CommonJS modules.
- Frontend: static HTML, CSS, and vanilla JavaScript served by the backend from `frontend/`.
- Database: PostgreSQL with a bootstrap schema in `database/schema.sql` and incremental SQL migrations in `database/migrations/`.
- Authentication: JWT bearer tokens, bcrypt password hashes, and PostgreSQL-backed user lifecycle checks.
- Authorization: central policy helper in `backend/src/utils/authorization.js`, consumed by route modules and the frontend access profile.
- Scheduling: in-process interval jobs started from `backend/src/server.js`.

## Backend entry points

- `backend/src/app.js` creates the Express app, mounts API route modules under `/api/*`, serves the static frontend, and has generic 404/error handlers.
- `backend/src/server.js` loads environment configuration, validates security-critical settings, starts the HTTP server, and starts account expiry, notification queue, maintenance, and SLA monitors.
- `backend/src/config/db.js` creates the shared PostgreSQL pool from `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, and `PGPASSWORD`.

## API modules

- `auth.js`: login, disabled public registration, authenticated profile.
- `invitations.js`: invitation listing, creation, acceptance, revocation.
- `staff.js`: user/staff listing, technician directory, staff creation/update/status/temporary extension.
- `departments.js`: department listing, detail, creation, update.
- `serviceRequests.js`: ticket listing/detail/create, assignment, asset linking, status changes, comments, attachments.
- `assets.js`: asset listing/detail/create/update/status/assignment/return/delete.
- `maintenance.js`: maintenance listing/schedules/create/update.
- `notifications.js`: in-app notifications, unread count, read state, preferences.
- `knowledgeBase.js`: articles, suggestions, revisions, feedback.
- `dashboard.js`: dashboard stats and scoped operational summary.
- `reports.js`: filter metadata, summary, paginated reports, CSV exports.
- `auditLogs.js`: audit-log listing.

## Service and utility layers

- Transaction helper: `backend/src/utils/transactions.js`.
- Audit logging: `backend/src/utils/audit.js`.
- Authorization: `backend/src/utils/authorization.js`.
- Ticket workflow: `backend/src/services/serviceRequests.js`, `backend/src/utils/sla.js`, `backend/src/utils/ticketAttachments.js`.
- Asset and maintenance workflows: `backend/src/services/assets.js`, `backend/src/services/maintenance.js`, `backend/src/utils/maintenanceMonitor.js`.
- Notifications: `backend/src/utils/notificationService.js`, `backend/src/utils/notificationProcessor.js`.
- Invitations and account lifecycle: `backend/src/services/invitations.js`, `backend/src/utils/invitations.js`, `backend/src/utils/accountExpiry.js`.
- Reporting: `backend/src/services/reporting.js` and `backend/src/routes/reports.js`.

## Database state

The base schema defines `departments`, `users`, `assets`, `service_requests`, `maintenance`, and `audit_logs`.

Incremental migrations add or extend:

- `invitations`
- user lifecycle fields
- `sla_policies`
- `ticket_comments`
- `ticket_history`
- `ticket_attachments`
- `asset_assignments`
- `notifications`
- `notification_preferences`
- assignment and SLA fields on `service_requests`
- `ticket_assignments`
- `notification_deliveries`
- `asset_status_history`
- `maintenance_schedules`
- maintenance scheduling/checklist fields
- knowledge-base category, visibility, revision, relation, and feedback tables

Important constraints and indexes are present for roles, user types, ticket statuses, ticket types, notification types, active assignment uniqueness, case-insensitive user identifiers, ticket numbers, attachment storage keys, and common report filters.

## Migration behavior

- Migration runner: `backend/src/scripts/runMigrations.js`.
- Tracking table: `schema_migrations(filename, applied_at)`.
- Migrations are applied lexicographically inside explicit `BEGIN`/`COMMIT` blocks.
- The runner assumes the bootstrap `database/schema.sql` has already created the original tables before migration `001` runs.
- Migration tests currently inspect SQL file contents rather than executing migrations against a live PostgreSQL database.

## Frontend state

- Frontend pages are standalone HTML documents that use `frontend/js/api.js` and `frontend/js/layout.js`.
- JWT and user profile are stored in `localStorage` as `nsc_token` and `nsc_user`.
- The backend returns an `access_profile`; the frontend uses it for navigation, redirects, and control visibility.
- Frontend route access is centralized in `ROUTE_ACCESS`.
- Protected pages redirect unauthenticated users to `/index.html`.
- Permission-aware UI exists for dashboard, tickets, technician portal, assets, maintenance, staff, departments, reports, audit logs, notifications, and knowledge base.
- Backend authorization remains the primary security layer.

## Environment and deployment state

- Environment template: `backend/.env.example`.
- Required security values include `JWT_SECRET` and `ORGANIZATION_EMAIL_DOMAINS`.
- PostgreSQL values are environment-driven through `PG*` variables.
- Email delivery is intentionally inactive unless SMTP settings and `EMAIL_DELIVERY_MODE` are configured.
- No Docker, Procfile, reverse-proxy, CI, or production hosting configuration was found during the audit.
- CORS is currently enabled with default unrestricted `cors()` in `backend/src/app.js`.

## Test state

- Test command: `npm test` from `backend/`.
- Test runner: `backend/test/run.js`.
- Coverage areas include auth policy, account expiry, invitations, authorization, transactions, migrations, notifications, service requests, SLA, ticket workflow, ticket attachments, assets/maintenance, knowledge base, reporting, and frontend access helpers.
- Tests are mostly unit/static tests and do not currently run a full HTTP server or live PostgreSQL migration/integration suite.

## Defects and gaps observed

- Production deployment hardening is incomplete: no CI workflow, process manager, reverse proxy, container, or deployment manifest is present.
- CORS is unrestricted.
- JWTs are stored in `localStorage`, which increases impact if frontend XSS is introduced.
- Login throttling/rate limiting was not found in the inspected backend.
- Background jobs are in-process and will not coordinate safely across multiple app instances.
- Migration execution depends on manually applying `database/schema.sql` before migrations.
- Migration tests do not validate migrations against a real PostgreSQL database.
- Some write operations still call `pool.query` directly inside route handlers, so service-layer consistency is not complete.
- Email queue logic exists, but actual SMTP sending is not active unless optional runtime configuration and dependency support are verified.
- File attachments are stored locally, which is not durable across stateless deployments without shared storage.
