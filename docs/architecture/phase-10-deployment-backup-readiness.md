# Phase 10: Deployment And Backup Readiness

## Implemented

- Added a production-oriented root `Dockerfile`.
- Added `.dockerignore` to exclude secrets, dependencies, logs, runtime attachments, and large generated documents from image builds.
- Added `deploy/docker-compose.example.yml` for a local containerized app plus PostgreSQL smoke environment.
- Added deployment documentation in `docs/deployment/deployment.md`.
- Added PostgreSQL and attachment backup/restore documentation in `docs/deployment/backup-restore.md`.
- Added deployment artifact tests to guard Docker, compose, and runbook expectations.

## Container Behavior

The image:

- uses Node.js 20 slim
- installs backend production dependencies only
- copies `backend/`, `frontend/`, and `database/migrations/`
- runs as the non-root `node` user
- exposes port `5000`
- uses the existing smoke-check script as its container health check

## Operational Boundaries

- The compose file is an example for local smoke testing and adaptation. It is not a committed production secret store.
- Real production secrets must come from the hosting platform secret manager.
- Attachment storage is mounted as a volume in the compose example, but production should use durable shared storage or object storage before stateless scaling.
- Database migrations remain an explicit release step through `npm run migrate`.

## Remaining Work

- Select and document the final production hosting platform.
- Add platform-specific deployment manifests after the hosting target is confirmed.
- Add live PostgreSQL migration tests in CI.
- Add restore-drill evidence capture in release records.
