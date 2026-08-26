# Metric Definitions

## Scope

These definitions govern Phase 10 dashboard and reporting outputs.

Unless stated otherwise:

- ticket metrics are based on `service_requests`
- asset metrics are based on `assets`
- maintenance metrics are based on `maintenance`
- knowledge-base metrics are based on `knowledge_base_articles`

## Filtering rules

### Date range

- `date_from` is inclusive
- `date_to` is inclusive at the calendar-day level
- ticket reports filter on `service_requests.date_submitted`
- asset reports filter on `assets.date_added`
- maintenance reports filter on `maintenance.maintenance_date`

### Department filter

- ticket metrics use `service_requests.department_id`
- asset metrics use `assets.department_id`
- maintenance metrics use the linked asset department

### Technician filter

- ticket metrics use `service_requests.assigned_technician_id`
- maintenance metrics use `maintenance.technician_id`
- asset metrics are not technician-filtered

### Category and ticket-type filters

- category filter uses `service_requests.category`
- ticket-type filter uses `service_requests.ticket_type`

## Dashboard metrics

### `total_requests`

- count of tickets created in the filtered range and scope

### `pending_requests`

- tickets with status `New` or `Pending`

### `in_progress_requests`

- tickets with status:
  - `Assigned`
  - `Accepted`
  - `In Progress`
  - `Waiting for User`
  - `Waiting for Parts`
  - `Reopened`

### `resolved_requests`

- tickets with status `Resolved` or `Closed`

### `overdue_requests`

- open tickets where at least one of these is true:
  - `sla_response_due_at` exists and `first_response_at` is null and the due time is past
  - `sla_resolution_due_at` exists and the due time is past
  - `expected_completion_at` exists and the due time is past

### `escalated_requests`

- tickets with `escalation_count > 0`

### `response_sla_met_rate`

- numerator:
  - tickets with both `first_response_at` and `sla_response_due_at`
  - and `first_response_at <= sla_response_due_at`
- denominator:
  - tickets with both `first_response_at` and `sla_response_due_at`

### `resolution_sla_met_rate`

- numerator:
  - tickets with both `date_resolved` and `sla_resolution_due_at`
  - and `date_resolved <= sla_resolution_due_at`
- denominator:
  - tickets with both `date_resolved` and `sla_resolution_due_at`

### `avg_resolution_hours`

- average elapsed hours between `date_submitted` and `date_resolved`
- only resolved tickets are included

### `total_assets`

- asset records in the filtered scope

### `active_assets`

- assets with status `Active`

### `available_assets`

- assets with status `Available`

### `assigned_assets`

- assets with status `Assigned`

### `maintenance_assets`

- assets with status `Under Maintenance`

### `damaged_assets`

- assets with status `Damaged`

### `retired_assets`

- assets with status `Retired`

### `due_maintenance_schedules`

- active maintenance schedules where `next_due_at <= NOW()`

### `maintenance_total_cost`

- sum of `maintenance.cost` in the filtered scope

## Report metrics

### `requests_by_assignment.unassigned`

- open tickets with no assigned technician

### `requests_by_assignment.actively_assigned`

- tickets with an assigned technician and an active work status

### `requests_by_assignment.expected_completion_overdue`

- open tickets whose `expected_completion_at` is in the past

### `maintenance_schedule_health.active_schedules`

- maintenance schedules with `is_active = TRUE`

### `maintenance_schedule_health.due_now`

- active schedules with `next_due_at <= NOW()`

### `maintenance_schedule_health.overdue`

- active schedules where `next_due_at < NOW() - 7 days`

### `asset_ticket_linkage.linked_tickets`

- tickets where `affected_asset_id` is not null

### `asset_ticket_linkage.unlinked_tickets`

- tickets where `affected_asset_id` is null

### `knowledge_base_analytics.total_views`

- sum of `knowledge_base_articles.view_count`

## Permission model

### Dashboard

- admins and ICT officers can use organizational filters
- technicians are automatically scoped to assigned ticket workload and visible maintenance scope
- staff are automatically scoped to their own tickets and visible asset scope

### Reports

- currently available only to admins and ICT officers
- CSV exports inherit the same route-level permission check and filters

## Accuracy notes

- snapshot metrics are evaluated at request time against the live PostgreSQL state
- date filtering limits which records participate in the aggregation
- status-based asset counts are current-state counts, not historical point-in-time reconstructions
