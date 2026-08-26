# Current Schema Baseline

## Inspection date

- Inspected on August 24, 2026
- Repository path: `database/schema.sql` plus incremental files under `database/migrations/`

## Migration model in use

The project currently uses:

- one bootstrap schema file: [database/schema.sql](/C:/Users/DELL/Downloads/nsc-ict-system/database/schema.sql)
- incremental SQL migrations: [database/migrations/001_phase_2_secure_internal_access.sql](/C:/Users/DELL/Downloads/nsc-ict-system/database/migrations/001_phase_2_secure_internal_access.sql)
- a simple migration runner: [backend/src/scripts/runMigrations.js](/C:/Users/DELL/Downloads/nsc-ict-system/backend/src/scripts/runMigrations.js)

The migration naming convention currently observed is:

- `NNN_descriptive_name.sql`

## Current tables before Phase 4

Bootstrap tables from `schema.sql`:

1. `departments`
2. `users`
3. `assets`
4. `service_requests`
5. `maintenance`
6. `audit_logs`

Additional table from migration `001_phase_2_secure_internal_access.sql`:

7. `schema_migrations`
8. `invitations`

## Current primary keys

| Table | Primary key |
|---|---|
| `departments` | `department_id` |
| `users` | `user_id` |
| `assets` | `asset_id` |
| `service_requests` | `request_id` |
| `maintenance` | `maintenance_id` |
| `audit_logs` | `log_id` |
| `schema_migrations` | `filename` |
| `invitations` | `invitation_id` |

## Current foreign keys

| Table | Column | References | Delete behavior |
|---|---|---|---|
| `users` | `department_id` | `departments.department_id` | `SET NULL` |
| `users` | `supervisor_user_id` | `users.user_id` | `SET NULL` |
| `users` | `invitation_id` | `invitations.invitation_id` | `SET NULL` |
| `assets` | `department_id` | `departments.department_id` | `SET NULL` |
| `assets` | `assigned_to` | `users.user_id` | `SET NULL` |
| `service_requests` | `requester_id` | `users.user_id` | `CASCADE` |
| `service_requests` | `department_id` | `departments.department_id` | `SET NULL` |
| `service_requests` | `assigned_technician_id` | `users.user_id` | `SET NULL` |
| `maintenance` | `asset_id` | `assets.asset_id` | `CASCADE` |
| `maintenance` | `technician_id` | `users.user_id` | `SET NULL` |
| `audit_logs` | `user_id` | `users.user_id` | `SET NULL` |
| `invitations` | `department_id` | `departments.department_id` | `SET NULL` |
| `invitations` | `supervisor_user_id` | `users.user_id` | `SET NULL` |
| `invitations` | `invited_by_user_id` | `users.user_id` | `RESTRICT` |
| `invitations` | `accepted_user_id` | `users.user_id` | `SET NULL` |

## Current check constraints and lookup values

### `users`

- `role IN ('admin','ict_officer','technician','staff')`
- `user_type IN ('employee','intern','corper','contractor','guest')`
- `account_expiration_date IS NULL OR account_expiration_date >= account_start_date`

### `assets`

- `asset_type IN ('Laptop','Desktop','Printer','Scanner','Router','Switch','Server','Monitor','UPS','Projector','Other')`
- `condition IN ('New','Good','Fair','Poor')`
- `status IN ('Active','Available','Assigned','Under Maintenance','Damaged','Retired')`

### `service_requests`

- `category IN ('Computer','Network','Printer','Internet','Software','Email','Hardware','Other')`
- `priority IN ('Low','Medium','High','Critical')`
- `status IN ('Pending','Assigned','In Progress','Resolved','Closed')`

### `maintenance`

- `status IN ('Scheduled','In Progress','Completed','Cancelled')`

### `invitations`

- `user_type IN ('employee','intern','corper','contractor','guest')`
- `role IN ('admin','ict_officer','technician','staff')`
- `status IN ('pending','accepted','revoked','expired')`
- `account_expiration_date IS NULL OR account_expiration_date >= account_start_date`

## Current unique constraints and unique indexes

| Table | Constraint or index |
|---|---|
| `departments` | unique `name` |
| `users` | unique `email` |
| `users` | unique `username` |
| `users` | unique index `idx_users_email_ci` on `LOWER(email)` |
| `users` | unique index `idx_users_username_ci` on `LOWER(username)` |
| `assets` | unique `asset_tag` |
| `assets` | unique `serial_number` |

## Current non-unique indexes

| Table | Indexes |
|---|---|
| `users` | `idx_users_role`, `idx_users_department`, `idx_users_user_type`, `idx_users_supervisor`, `idx_users_account_expiration` |
| `assets` | `idx_assets_status`, `idx_assets_type`, `idx_assets_department`, `idx_assets_assigned_to` |
| `service_requests` | `idx_sr_status`, `idx_sr_priority`, `idx_sr_category`, `idx_sr_technician`, `idx_sr_requester` |
| `maintenance` | `idx_maint_asset`, `idx_maint_tech`, `idx_maint_status` |
| `audit_logs` | `idx_audit_user`, `idx_audit_created` |
| `invitations` | `idx_invitations_status`, `idx_invitations_email_ci`, `idx_invitations_expires_at` |

## Current timestamp behavior

Tables with `created_at` and `updated_at`:

- `departments`
- `users`
- `assets`
- `service_requests`
- `maintenance`
- `invitations`

Auto-update trigger function:

- `set_updated_at()`

Current update triggers:

- `trg_departments_updated`
- `trg_users_updated`
- `trg_assets_updated`
- `trg_sr_updated`
- `trg_maint_updated`
- `trg_invitations_updated`

## Current delete behavior summary

- Several operational tables still use hard delete semantics in the schema and route layer.
- `service_requests.requester_id` and `maintenance.asset_id` currently cascade deletes.
- `assets` can still be hard deleted by the admin route.
- Archive and soft-delete fields are mostly absent before Phase 4.

## Current gaps observed before Phase 4

Missing tables:

- `ticket_comments`
- `ticket_history`
- `ticket_attachments`
- `asset_assignments`
- `notifications`
- `notification_preferences`
- `sla_policies`
- `knowledge_base_articles`

Missing structural features:

- transaction helper for multi-step data changes
- database-backed ticket numbering
- stronger archival fields for tickets, assets, and departments
- normalized event history for tickets and asset assignment lifecycle

## Phase 8 additions

Phase 8 extends the current baseline with asset and maintenance lifecycle structures:

- `asset_status_history`
- `maintenance_schedules`

Phase 8 also extends existing tables:

- `asset_assignments.expected_return_at`
- `asset_assignments.returned_condition`
- `asset_assignments.returned_to_user_id`
- `maintenance.maintenance_type`
- `maintenance.related_request_id`
- `maintenance.assigned_by_user_id`
- `maintenance.schedule_id`
- `maintenance.scheduled_start_at`
- `maintenance.started_at`
- `maintenance.completed_at`
- `maintenance.next_due_at`
- `maintenance.reminder_sent_at`
- `maintenance.checklist_json`
- `maintenance.completion_notes`

Reminder and notification support also adds:

- notification type `maintenance_due`

## Phase 9 additions

Phase 9 extends the knowledge-base data model with:

- `knowledge_base_article_revisions`
- `knowledge_base_article_relations`
- `knowledge_base_article_feedback`

Phase 9 also extends `knowledge_base_articles` with:

- `category`
- `visibility_scope`
- `department_id`
- `current_revision_number`
- `last_reviewed_at`
- `search_keywords`
- `usefulness_score`
- `helpful_count`
- `not_helpful_count`
- `view_count`
