# Phase 8: Asset and Maintenance Management

## Scope delivered

Phase 8 connects ticket records to assets, strengthens asset lifecycle history, and introduces preventive maintenance scheduling.

Implemented areas:

- ticket-to-asset validation and relinking
- asset return workflow
- assignment-history enrichment
- asset status history
- preventive maintenance schedules
- recurring due-date advancement on completed scheduled maintenance
- scheduled maintenance reminders
- maintenance assignment metadata and checklist support
- transactional asset and maintenance updates
- frontend asset and maintenance workflow updates

## Database changes

Migration added:

- `asset_assignments.expected_return_at`
- `asset_assignments.returned_condition`
- `asset_assignments.returned_to_user_id`
- `asset_status_history`
- `maintenance_schedules`
- maintenance columns for:
  - `maintenance_type`
  - `related_request_id`
  - `assigned_by_user_id`
  - `schedule_id`
  - `scheduled_start_at`
  - `started_at`
  - `completed_at`
  - `next_due_at`
  - `reminder_sent_at`
  - `checklist_json`
  - `completion_notes`

Notification constraint support was extended with:

- `maintenance_due`

## Asset workflow

Asset operations now use transactional services:

- assignment
- reassignment
- return
- status changes
- general edits that affect assignee or status

Return flow rules:

- active assignment is closed
- return metadata is stored on the assignment record
- asset assignee is cleared
- next asset status is resolved safely
- asset status history is written
- audit log is written

## Ticket-to-asset rules

When creating or relinking a ticket:

- the asset must exist
- archived assets cannot be linked
- the current user must be allowed to view the asset

The ticket detail view now exposes:

- affected asset tag when available
- a controlled asset relink action

## Preventive maintenance

New schedule model supports:

- `Preventive`
- `Inspection`

Schedules include:

- title
- frequency unit and value
- next due date
- reminder lead time
- assigned technician
- checklist items
- active/archive state

Completing scheduled maintenance advances the next due date using the stored schedule interval.

## Reminder job

New monitor:

- file: [backend/src/utils/maintenanceMonitor.js](/C:/Users/DELL/Downloads/nsc-ict-system/backend/src/utils/maintenanceMonitor.js)
- script: `npm run maintenance-monitor`

Server startup now launches the maintenance reminder monitor alongside the existing expiry, notification, and SLA jobs.

Environment keys:

- `MAINTENANCE_MONITOR_INTERVAL_MINUTES`
- `MAINTENANCE_MONITOR_ON_START`

## Frontend changes

Updated pages:

- [frontend/assets.html](/C:/Users/DELL/Downloads/nsc-ict-system/frontend/assets.html)
- [frontend/maintenance.html](/C:/Users/DELL/Downloads/nsc-ict-system/frontend/maintenance.html)
- [frontend/service-requests.html](/C:/Users/DELL/Downloads/nsc-ict-system/frontend/service-requests.html)

Visible user improvements:

- real asset selector on ticket creation
- affected-asset relink action on ticket detail
- asset return action
- asset history view with maintenance, assignments, statuses, and linked tickets
- maintenance schedule creation and schedule list

## Tests

Added coverage for:

- phase 8 migration structure
- returned asset status resolution
- next due date calculation
- asset status restoration after maintenance
