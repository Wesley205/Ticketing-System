# Domain Consistency and Database Integrity

Phase 10 standardizes business domains across backend code, migrations, and development seed data.

## Canonical Domains

Domain values are centralized in `backend/src/shared/constants/domain.js`.

| Domain | Canonical values |
| --- | --- |
| Ticket types | Incident, Service Request, Access Request, Maintenance Request, Change Request |
| Ticket statuses | New, Pending, Assigned, Accepted, In Progress, Waiting for User, Waiting for Parts, Resolved, Closed, Reopened, Cancelled |
| Ticket priorities | Low, Medium, High, Critical |
| Asset statuses | Active, Available, Assigned, Under Maintenance, Damaged, Retired |
| Maintenance statuses | Scheduled, In Progress, Completed, Cancelled |
| User roles | admin, ict_officer, technician, staff |
| User types | employee, intern, corper, contractor, guest |
| Notification types | ticket_assigned, ticket_updated, ticket_resolved, ticket_comment, ticket_attachment, ticket_overdue, ticket_escalated, maintenance_created, maintenance_completed, maintenance_due, invitation_created, account_expiry, system |
| Knowledge-base statuses | draft, in_review, published, archived |
| Knowledge-base visibility scopes | all_users, department, operational_only |
| Knowledge-base relation types | asset, asset_type, ticket_category |

`Maintenance Request` remains the canonical ticket type because existing migrations, services, frontend seed data, and reporting already use that value. Renaming it to `Maintenance` should be handled as an explicit compatibility/versioning change, not as an integrity cleanup.

## Timestamp Meanings

Ticket timestamps:

- `date_submitted`: when the requester created the ticket.
- `status_changed_at`: when the current status was last applied.
- `assigned_at`: when the current assignment was made.
- `accepted_at`: when the responsible technician accepted work.
- `first_response_at`: first non-requester ICT response.
- `date_resolved`: when a resolution was recorded.
- `closed_at`: when the ticket was closed.
- `closure_confirmed_at`: when requester closure confirmation occurred or was not required.
- `sla_response_due_at` and `sla_resolution_due_at`: calculated SLA target deadlines.

Account timestamps:

- `account_start_date`: first valid date for account access.
- `account_expiration_date`: required expiry date for temporary users.
- `deactivated_at`: when an inactive account was deactivated or suspended.
- `last_login_at`: most recent successful login.

Soft deletion/archive timestamps:

- `is_archived` with `archived_at` marks archive state for departments, assets, and tickets.
- `deleted_at` marks soft-deleted ticket comments and attachments.
- `is_active` with `archived_at` marks active/inactive maintenance schedules.

## Enforced Constraints

Migration `011_phase_10_domain_integrity.sql` adds non-destructive constraints for:

- Ticket number format: `NSC-YYYY-00000`.
- Temporary user sponsor and expiry requirements.
- Account state alignment between `is_active`, `account_status`, and `deactivated_at`.
- Asset tag and serial-number nonblank values.
- Assigned asset and assigned ticket state consistency.
- Ticket lifecycle and SLA timestamp ordering.
- Archive timestamp consistency.
- Active ticket-assignment and asset-assignment consistency.
- Maintenance cost and completion timestamp validity.
- Notification type, delivery attempt count, and delivery timestamp validity.
- Knowledge-base status, publish state, and nonnegative counters.
- Nonblank audit actions and record types.

## Migration and Rollback

The Phase 10 migration performs preflight validation and raises clear exceptions if existing data violates a new rule. It does not delete rows, drop tables, or silently rewrite production data.

Rollback script:

```text
database/rollbacks/011_phase_10_domain_integrity.rollback.sql
```

The rollback removes only Phase 10 constraints and supporting indexes. It does not delete data.

## Known Cleanup Requirement

If an existing database was seeded before `account_status` was included in `database/seed.sql`, inactive seed users may have `is_active = false` but `account_status = active`. Rerun the updated seed in a local development database or apply a reviewed production cleanup migration before applying Phase 10 constraints.
