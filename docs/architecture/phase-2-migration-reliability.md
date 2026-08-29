# Phase 2: Database Migration Reliability

Phase 2 makes the migration path safer and easier to run from an empty PostgreSQL database.

## Changes

- Added `database/migrations/000_bootstrap_foundation.sql`.
- The bootstrap migration creates the original foundation tables non-destructively with `CREATE TABLE IF NOT EXISTS`.
- The migration runner now exposes small helpers for migration file discovery and application.
- Updated setup guidance so `npm run migrate` is the authoritative schema setup path.
- Added migration tests for the bootstrap migration.

## Operational guidance

- For a new local database, run `npm run migrate` from `backend/`.
- Apply `database/seed.sql` only after migrations complete successfully.
- Do not run `database/schema.sql` against a database that already contains data; it is retained as a legacy reference.
- Production migration execution should still be preceded by a database backup and a reviewed release plan.

## Remaining gaps

- Tests still do not execute all migrations against a live disposable PostgreSQL database.
- There is no rollback framework; failed production changes should use forward-fix migrations.
- The legacy `database/schema.sql` is not yet generated from the migration history, so schema drift can still occur.
