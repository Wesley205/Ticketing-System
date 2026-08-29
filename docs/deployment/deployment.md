# Deployment Guide

This project can be packaged as a Node.js container that serves both the Express API and the static frontend.

## Build

From the repository root:

```bash
docker build -t nsc-ict-service-desk:local .
```

The image:

- installs backend production dependencies only
- copies `backend/`, `frontend/`, and `database/migrations/`
- runs as the non-root `node` user
- exposes port `5000`
- uses `npm run smoke` logic as the container health check

## Local Compose Smoke Environment

Use `deploy/docker-compose.example.yml` as a starting point. It is intentionally an example file and does not contain real secrets.

```bash
cd deploy
NSC_DB_PASSWORD=change-this-locally NSC_JWT_SECRET=change-this-to-a-long-random-value docker compose -f docker-compose.example.yml up --build
```

After the database is running, apply migrations from the app container or host:

```bash
docker compose -f docker-compose.example.yml exec app npm run migrate
```

Then verify:

```bash
SMOKE_BASE_URL=http://localhost:5000 npm run smoke
```

## Production Requirements

- Store secrets in the platform secret manager, not in compose files or Git.
- Set `NODE_ENV=production`.
- Use a strong `JWT_SECRET`.
- Restrict `CORS_ALLOWED_ORIGINS` to approved application origins.
- Use `DB_SSL=true` when required by the managed PostgreSQL provider.
- Mount durable storage or move attachments to object storage before stateless scaling.
- Run migrations during a controlled release window after backups complete.
- Keep background jobs single-run safe. The app already uses advisory locks, but external scheduler ownership still needs a deployment decision.

## Health Checks

- `GET /api/health` checks process liveness.
- `GET /api/health/readiness` checks database and migration readiness.
- `GET /api/health/operations` gives protected operational state to admin/ICT officer users.

Use `/api/health/readiness` for load balancer readiness checks when the load balancer supports HTTP checks.
