# Phase 6: Operational Jobs And Delivery Infrastructure

Phase 6 adds database-backed coordination and run history for scheduled operational jobs.

## Changes

- Added `database/migrations/009_operational_job_runs.sql`.
- Added `backend/src/utils/jobRunner.js`.
- Operational jobs now use PostgreSQL advisory locks so only one app instance runs the same job at a time.
- Job attempts are recorded in `operational_job_runs` with status, timestamps, duration, result summary, error message, and metadata.
- Wrapped scheduled and one-shot execution for:
  - account expiry sweep
  - SLA monitor
  - maintenance monitor
  - notification queue
- Added `backend/test/jobRunner.test.js`.

## Operational behavior

- If another instance is already running a job, the second attempt records a `skipped` job run and does not execute the task.
- Successful jobs record `succeeded`.
- Failed jobs record `failed` before the error is rethrown or logged by the caller.
- Existing script commands remain available for external schedulers:
  - `npm run expire-accounts`
  - `npm run sla-monitor`
  - `npm run maintenance-monitor`
  - `npm run notification-queue`

## Remaining gaps

- The app still starts in-process interval schedulers by default.
- There is no external scheduler manifest yet.
- Job run history is not exposed through an admin API.
- Attachment storage is still local disk and should be moved to durable storage before stateless deployment.
