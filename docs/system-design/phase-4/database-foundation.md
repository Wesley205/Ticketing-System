# Phase 4: Database Foundation

## Scope

Phase 4 strengthens the PostgreSQL foundation so the application can enforce critical business rules even when requests bypass the frontend or route-layer validation.

The work in this phase focuses on:

- versioned migration growth from the existing bootstrap schema
- stronger relational integrity and check constraints
- archive-ready fields for core operational records
- transactional service operations for multi-step writes
- schema documentation and migration-oriented tests

## Migration strategy

The project continues to use:

- bootstrap schema: [database/schema.sql](/C:/Users/DELL/Downloads/nsc-ict-system/database/schema.sql)
- incremental migration runner: [backend/src/scripts/runMigrations.js](/C:/Users/DELL/Downloads/nsc-ict-system/backend/src/scripts/runMigrations.js)
- versioned SQL migrations under [database/migrations](/C:/Users/DELL/Downloads/nsc-ict-system/database/migrations)

Phase 4 adds:

- [database/migrations/002_phase_4_database_foundation.sql](/C:/Users/DELL/Downloads/nsc-ict-system/database/migrations/002_phase_4_database_foundation.sql)

This migration is additive and includes data backfills so existing records remain usable after deployment.

## Schema additions

### Extended tables

- `departments`: archive flags and archive metadata
- `assets`: archive flags and archive metadata
- `service_requests`: ticket numbering, ticket type, SLA linkage, richer lifecycle timestamps, asset linkage, closure metadata, archive metadata

### New tables

- `sla_policies`
- `ticket_comments`
- `ticket_history`
- `ticket_attachments`
- `asset_assignments`
- `notifications`
- `notification_preferences`
- `knowledge_base_articles`

## Integrity rules added

- ticket types are constrained to approved values
- SLAs require positive response and resolution targets
- ticket comments and knowledge-base records cannot be blank after trimming
- active asset assignments are limited to one active row per asset
- notification read state is constrained so timestamps stay consistent
- attachment file sizes cannot be negative
- `ticket_number` is backfilled and made unique

## Backfill behavior

The migration includes controlled backfills for existing data:

- existing tickets receive `ticket_number` values using `NSC-YYYY-#####`
- existing users receive default `notification_preferences`
- existing asset ownership is copied into `asset_assignments`
- existing tickets receive one imported lifecycle event in `ticket_history`
- default SLA rows are seeded only when matching names do not already exist

## Transaction layer

Phase 4 introduces a reusable helper:

- [backend/src/utils/transactions.js](/C:/Users/DELL/Downloads/nsc-ict-system/backend/src/utils/transactions.js)

It is now used by multi-step write services for:

- invitations
- service requests
- assets
- maintenance

The route layer now delegates critical write operations to service modules so audit logging, history creation, notifications, and status changes commit or roll back together.

## Operational notes

- The migration is intended for non-destructive rollout. No production data should be changed outside the reviewed migration path.
- The repository currently relies on incremental SQL files rather than a generated ORM migration system.
- The current backend test suite validates migration contents and transaction behavior without requiring a live PostgreSQL instance.
