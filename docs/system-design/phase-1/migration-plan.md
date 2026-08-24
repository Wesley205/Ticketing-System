# Migration Plan

## Purpose

This plan describes how to move from the current prototype schema and API behavior to the target internal service desk design without destructive actions during Phase 1.

## Current-state constraints

- No migration history directory exists.
- Current schema is created from a single bootstrap script.
- Current records do not contain `user_type`, invitation data, supervisor data, ticket numbers, ticket history, or asset assignment history.
- Assets can currently be hard deleted.

## Migration principles

- Back up before every schema change.
- Additive changes first.
- Preserve current ids wherever possible.
- Introduce mapping tables and default values before enforcing stricter constraints.
- Perform dry runs on a copy of production-like data first.
- Delay destructive cleanup until business rules are confirmed.

## Migration order

1. Freeze and export a database backup.
2. Create additive schema changes for new columns and new tables.
3. Backfill reference data such as user type and ticket numbers.
4. Backfill history tables from existing current-state records where possible.
5. Update application code to write both current and new structures if a staged rollout is needed.
6. Validate counts, referential integrity, and visibility rules.
7. Switch application logic to new lifecycle rules.
8. Decommission deprecated paths only after sign-off.

## User migration

### Existing users without `user_type`

Proposed default mapping:

| Current signal | Proposed `user_type` |
|---|---|
| Known employee with organization email | `Employee` |
| Manually identified temporary worker | `Intern`, `Corper`, or `Contractor` |
| Unknown | `Employee` as provisional only if supported by organization confirmation; otherwise hold for review |

### Existing employees

- Keep active status and existing role.
- Verify approved email domain list before enforcing domain constraints.

### Existing interns and corpers

- None are explicitly modeled today.
- If such users exist in real data, they need manual classification before strict policy enforcement.

### Missing organization emails

- For real production data, flag records lacking official domains for review.
- Do not block login immediately until the organization confirms policy and exception handling.

### Existing roles

Current roles:

- `admin`
- `ict_officer`
- `technician`
- `staff`

Map directly to target system roles.

### Invalid or unknown roles

- Query for any role values outside the known list before migration.
- Reject strict constraints until all anomalies are remediated.

### Missing departments

- Current schema allows `NULL` department on users.
- Proposed action: assign to a temporary `Unassigned` department or hold for admin review.

### Missing supervisors

- Current schema has no supervisor field.
- Backfill as `NULL` and require admin completion only for temporary users.

### Temporary account expiry dates

- No current data exists.
- Populate only for users classified as temporary.

## Ticket migration

### Existing statuses

| Current status | Proposed target status |
|---|---|
| `Pending` | `Pending` or `New` after policy decision |
| `Assigned` | `Assigned` |
| `In Progress` | `In Progress` |
| `Resolved` | `Resolved` |
| `Closed` | `Closed` |

### Existing priorities

Current priorities map directly:

- `Low`
- `Medium`
- `High`
- `Critical`

### Missing ticket numbers

- Generate deterministic ticket numbers for existing records.
- Recommended pattern: `NSC-YYYY-NNNNN`.
- Preserve `request_id` as the permanent internal foreign-key reference.

### Missing assignment information

- Existing `assigned_technician_id` can seed the current assignment snapshot.
- No historical assignment trail exists, so history must begin from migration date unless audit logs allow partial inference.

### Existing resolution dates

- Preserve `date_resolved`.
- For `Closed` records with null resolution text, leave null and flag for data-quality review.

### Existing department references

- Preserve current `department_id`.
- Flag null department tickets for review.

### Existing asset references

- No direct asset reference exists on tickets.
- Do not invent links retroactively unless supported by maintenance or description evidence and approved manual review.

## Asset migration

### Existing statuses

| Current status | Proposed target status |
|---|---|
| `Available` | `Available` |
| `Assigned` | `Assigned` |
| `Active` | `Active` |
| `Under Maintenance` | `Under Maintenance` |
| `Damaged` | `Damaged` |
| `Retired` | `Retired` |

### Duplicate asset tags

- Current schema already enforces unique `asset_tag`.
- Validate before migration anyway.

### Missing departments

- Current assets may have null departments.
- Flag for review or assign an `Unassigned` department if approved.

### Existing assignments

- Seed an `asset_assignments` table from current `assigned_to` values as initial open assignments with a migration note.

### Existing maintenance history

- Preserve current `maintenance` rows.
- If a future `related_ticket_id` is added, do not auto-populate without evidence.

## Audit migration

### Existing audit records

- Preserve all current `audit_logs` rows.
- Do not rewrite historical text into new normalized enums unless a separate mapping column is added.

### New audit event format

- Add structured columns or metadata JSON while preserving legacy text fields.

### Preservation requirements

- Audit records should be retained unchanged for governance traceability.

## Backups

- Full PostgreSQL logical dump before schema changes
- Optional table-level exports for `users`, `assets`, `service_requests`, `maintenance`, and `audit_logs`
- Store backup identifiers and restoration test results in change records

## Dry-run process

1. Restore a fresh copy of the current database.
2. Apply additive schema scripts.
3. Run backfill scripts.
4. Run validation queries.
5. Run application smoke tests against the migrated copy.
6. Review counts and spot-check critical records.

## Validation queries

Recommended validations:

- user counts by role before and after migration
- ticket counts by status and priority before and after migration
- asset counts by status before and after migration
- orphan detection for foreign keys
- duplicate detection for emails, usernames, and asset tags
- null checks for new required fields before enforcing constraints

## Rollback strategy

- Keep pre-migration backups.
- Apply migrations in reversible units where possible.
- Do not drop legacy columns during the first rollout.
- If application cutover fails, restore the prior database snapshot and redeploy the previous application package.

## Data cleanup rules

- Flag, do not silently overwrite, uncertain user classifications.
- Flag null departments for admin review.
- Archive, do not delete, retired assets moving forward.
- Keep all legacy audit text.

## Deployment strategy

- Stage on a non-production copy first.
- Release schema additions before code that depends on them if the changes are backward-compatible.
- Use feature flags or staged route cutover if possible.

## Downtime expectations

- Minimal downtime for additive schema changes.
- Moderate downtime may be required for final cutover if non-backward-compatible constraints are enforced.
- Downtime window depends on data volume and whether route compatibility is maintained.

## Phase 1 caution

No destructive migration scripts should be written until:

- the stakeholder decisions in `open-decisions.md` are resolved
- the target schema is approved
- rollback procedures are tested
