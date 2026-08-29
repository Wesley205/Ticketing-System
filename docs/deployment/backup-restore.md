# PostgreSQL And Attachment Backup/Restore Runbook

This runbook is intentionally tool-agnostic. Adapt paths and commands to the selected production hosting platform.

## Backup Before Release

1. Confirm the target environment and database name.
2. Stop non-essential write-heavy maintenance activities if possible.
3. Capture a PostgreSQL logical backup.

```bash
pg_dump --format=custom --file=nsc_ict_system_YYYYMMDD_HHMM.dump "$DATABASE_URL"
```

4. Capture attachment storage.

```bash
tar -czf nsc_ict_attachments_YYYYMMDD_HHMM.tar.gz storage/ticket-attachments
```

5. Store backup artifacts in approved encrypted storage.
6. Record the backup file names, timestamp, operator, application version, and migration range in the release notes.

Do not print or commit `DATABASE_URL`, passwords, tokens, or backup files.

## Restore Drill

Perform restore drills in a non-production environment.

```bash
createdb nsc_ict_restore_test
pg_restore --dbname=nsc_ict_restore_test --clean --if-exists nsc_ict_system_YYYYMMDD_HHMM.dump
tar -xzf nsc_ict_attachments_YYYYMMDD_HHMM.tar.gz
```

Then verify:

- migrations table exists and contains the expected migration files
- application starts against the restored database
- `/api/health/readiness` returns ready
- sample login works for a test-only account
- representative tickets, assets, maintenance records, notifications, and knowledge-base articles are visible
- attachment download works for an authorized account

## Rollback During Failed Release

1. Stop the new application version.
2. Restore the pre-release database backup to the target database or fail over to the restored database, depending on platform capabilities.
3. Restore attachment storage if the release wrote or migrated files.
4. Redeploy the previous known-good application image.
5. Run the smoke check.
6. Record the incident, failed migration/version, restore point, operator, and verification result.

## Retention

Define retention with the organization before production:

- daily backups
- weekly backups
- monthly backups
- attachment retention period
- audit-log retention period
- ticket and knowledge-base retention period

No destructive purge process should be added until retention policy is approved.
