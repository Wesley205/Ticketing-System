# Phase 6: Assignment And SLA Management

## Scope

Phase 6 adds explicit ticket ownership, assignment history, expected completion tracking, SLA policy application, overdue calculations, escalation notifications, and a scheduled SLA monitor.

## Delivered changes

- Added [database/migrations/004_phase_6_assignment_sla_management.sql](/C:/Users/DELL/Downloads/nsc-ict-system/database/migrations/004_phase_6_assignment_sla_management.sql)
- Expanded `service_requests` with:
  - `assigned_by_user_id`
  - `assigned_at`
  - `accepted_at`
  - `assignment_notes`
  - `expected_completion_at`
  - response/resolution escalation timestamps
  - `last_escalated_at`
  - `escalation_count`
- Added `ticket_assignments` to preserve assignment history independently from the current service-request row
- Reused `sla_policies` from Phase 4 and now apply them during ticket creation
- Added [backend/src/utils/sla.js](/C:/Users/DELL/Downloads/nsc-ict-system/backend/src/utils/sla.js) for policy selection and overdue calculations
- Added [backend/src/utils/slaMonitor.js](/C:/Users/DELL/Downloads/nsc-ict-system/backend/src/utils/slaMonitor.js) plus [backend/src/scripts/runSlaMonitor.js](/C:/Users/DELL/Downloads/nsc-ict-system/backend/src/scripts/runSlaMonitor.js) for scheduled escalation sweeps

## Assignment workflow

- ICT officers and administrators can assign, reassign, or remove the technician on an open ticket
- Assignment notes and expected completion dates are stored on the ticket and in assignment-history rows
- Technician acceptance is recorded when the ticket moves to `Accepted`
- Ticket detail responses now include assignment history for UI display

## SLA behavior

- SLA policies are matched by `priority` and `ticket_type`, preferring exact ticket-type policies over generic priority policies
- Ticket creation now stores `sla_policy_id`, `sla_response_due_at`, and `sla_resolution_due_at`
- Ticket detail responses include an SLA summary with overdue flags and escalation counters
- The server now runs an in-process SLA monitor on an interval, similar to the account-expiry sweep

## Escalation model

- The monitor checks open tickets for breached response or resolution deadlines
- On first breach of each deadline type, it:
  - updates escalation timestamps and counters
  - writes a `ticket_history` escalation event
  - inserts in-app notification rows
  - writes an audit log entry
- This phase does not claim any external email or SMS delivery because no verified provider is configured in the repo

## UI and reporting changes

- The service-desk page shows expected completion, escalation count, SLA status, and assignment history
- The dashboard shows overdue and escalated ticket counts
- Reports now include assignment coverage, SLA coverage, overdue-ticket tables, and richer request CSV exports

## Operational notes

- The SLA monitor is in-process. It runs only when the API server is running.
- Example environment keys are documented in [backend/.env.example](/C:/Users/DELL/Downloads/nsc-ict-system/backend/.env.example).
- If a separate scheduler is introduced later, `npm run sla-monitor` can be used as the single-run entry point.
