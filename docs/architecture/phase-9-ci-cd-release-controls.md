# Phase 9: CI/CD and Release Controls

## Implemented

- Added `.github/workflows/backend-ci.yml`.
- Added backend CI scripts:
  - `npm run ci`
  - `npm run secret-scan`
  - `npm run smoke`
  - `npm run release:check`
- Added a local committed-secret scan that reports only file names and key names, never secret values.
- Added a smoke-check script for deployed or locally running environments.
- Added release-control tests to verify CI configuration, package scripts, secret-scan behavior, and smoke-check behavior.

## CI Gates

The GitHub Actions workflow runs on pull requests, pushes to `main` or `master`, and manual dispatch.

Workflow steps:

- checkout
- Node.js setup
- `npm ci`
- `npm test`
- `npm run secret-scan`
- `npm audit --audit-level=high --omit=dev`
- `npm pack --dry-run`

The current test suite includes static migration checks, authorization tests, workflow tests, and frontend-helper tests. It does not yet apply migrations to a live disposable PostgreSQL database in CI.

## Local Commands

From `backend/`:

```bash
npm run ci
npm run release:check
npm run smoke
```

Use `npm run smoke` only when the app is already running and the configured database is migrated. Override the target with:

```bash
SMOKE_BASE_URL=https://example.internal npm run smoke
```

## Release Checklist

Before deployment:

- Run `npm run release:check`.
- Review every pending SQL migration.
- Back up PostgreSQL before applying migrations to production.
- Confirm `.env` values are present in the deployment environment and are not committed.
- Confirm `NODE_ENV=production`.
- Confirm `JWT_SECRET` is production-strength and not a placeholder.
- Confirm `CORS_ALLOWED_ORIGINS` contains only approved frontend origins.
- Confirm attachment storage durability for the deployment model.
- Run `npm run migrate` against the target database during the release window.
- Start the application.
- Run `npm run smoke` against the deployed base URL.
- Check `/api/health/readiness`.
- Check `/api/health/operations` with an authorized operational account.

## Remaining Work

- Add live PostgreSQL migration execution in CI using a disposable database.
- Add browser end-to-end tests for critical user journeys.
- Add a deployment manifest for the selected hosting platform.
- Add release notes automation.
- Add dependency update automation and vulnerability triage ownership.
