# Vercel Free Deployment

This deployment mode is intended for a low-volume pilot. Docker remains the local fallback.

## Architecture

- Vercel serves the Vite build and runs the Express API as one function.
- Neon provides pooled PostgreSQL.
- Private Vercel Blob stores ticket and knowledge-base media.
- Authenticated user activity runs due operational jobs every five minutes.
- One secured Vercel Cron invocation performs a daily recovery sweep.

The activity heartbeat is required because Vercel Hobby Cron jobs can run only once per day.

## Repository Configuration

- `api/index.js` exports Express without opening a listening port.
- `vercel.json` defines the frontend fallback, API routing, asset caching, and daily Cron.
- `.env.vercel.example` lists hosted environment variables without values.
- Docker continues to use local PostgreSQL and filesystem media by default.

## One-Time Setup

1. Import this Git repository into a Vercel Hobby project.
2. Keep the repository root as the project root and use the `Other` framework preset.
3. Install a Neon Postgres free resource from the Vercel Marketplace.
4. Create a Private Vercel Blob store and connect it to the project.
5. Add the variables listed in `.env.vercel.example` to Production.
6. Use the generated `*.vercel.app` URL to avoid domain charges.
7. Set `INTERNAL_APP_BASE_URL` and `CORS_ALLOWED_ORIGINS` to that exact HTTPS URL.
8. Generate fresh random values for `JWT_SECRET` and `CRON_SECRET`.

Do not copy `backend/.env` into Vercel or commit it to Git.

## Database Migration

Create a backup before changing either database:

```powershell
docker exec deploy-postgres-1 pg_dump -U nsc_app -d nsc_ict_system --format=custom --file=/tmp/nsc-before-vercel.dump
docker cp deploy-postgres-1:/tmp/nsc-before-vercel.dump .\nsc-before-vercel.dump
```

Restore the backup with the Neon connection details using a local PostgreSQL client. Then run:

```powershell
$env:DATABASE_URL="<pooled-neon-connection-url>"
$env:DB_SSL="true"
npm --prefix backend run migrate
```

Never place the connection URL in shell history on a shared computer. Prefer a temporary local environment file that remains ignored by Git.

## Media Migration

Do not enable `MEDIA_STORAGE_PROVIDER=vercel-blob` until existing ticket and article media have been copied to the private Blob store. Keep the local Docker deployment available during this step.

The free Blob allowance is finite. Confirm that `storage/ticket-attachments` and `storage/article-media` together remain comfortably below the current free storage limit before migration.

## Verification

Verify the preview before promoting it:

1. Open `/login` and authenticate with a non-admin test account.
2. Check `/api/health/readiness` returns `200`.
3. Create and update a test ticket.
4. Upload, view, and delete a test image.
5. Open a knowledge-base article image.
6. Confirm an in-app notification and browser push notification.
7. Confirm `/api/system/jobs/daily` returns `401` without the Cron authorization header.
8. Review Vercel Function logs for database or Blob errors.

## Free-Tier Controls

- Keep media files at or below 2 MB.
- Use one production database and avoid automatic preview database branches.
- Do not connect preview deployments to production data.
- Keep the daily Cron schedule unchanged on Hobby.
- Monitor Vercel Function, Blob, and Neon usage weekly.
- Export PostgreSQL and Blob backups regularly.

If a free quota is reached, restore service through the existing Docker deployment instead of adding a payment method automatically.

## Rollback

1. Stop issuing invitations from the hosted deployment.
2. Export data added since cutover.
3. Restore it to the Docker PostgreSQL database.
4. Re-enable local worker intervals and local media storage.
5. Restart the Docker stack and verify `/api/health/readiness`.
