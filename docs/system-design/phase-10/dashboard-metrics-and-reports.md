# Phase 10: Dashboards, Metrics, and Reports

## Scope

Phase 10 upgrades the dashboard and reporting layer from fixed summary queries into a filter-aware operational reporting surface.

Implemented areas:

- explicit metric definitions
- shared date and scope filters
- dashboard operational metrics
- SLA performance metrics
- maintenance cost and schedule-health reporting
- technician workload reporting
- paginated ticket, asset, and maintenance report endpoints
- filtered CSV exports
- frontend filter controls and chart refresh behavior
- future-ready scheduled-report architecture metadata

## Backend changes

New helper:

- [backend/src/modules/reports/report.service.js](/C:/Users/DELL/Downloads/nsc-ict-system/backend/src/modules/reports/report.service.js)

Responsibilities:

- filter parsing
- pagination normalization
- shared ticket, asset, and maintenance filter clauses
- scheduled-report architecture contract

Updated routes:

- [backend/src/modules/dashboard/dashboard.routes.js](/C:/Users/DELL/Downloads/nsc-ict-system/backend/src/modules/dashboard/dashboard.routes.js)
- [backend/src/modules/reports/report.routes.js](/C:/Users/DELL/Downloads/nsc-ict-system/backend/src/modules/reports/report.routes.js)

New report endpoints:

- `GET /api/reports/filters`
- `GET /api/reports/tickets`
- `GET /api/reports/assets`
- `GET /api/reports/maintenance`

Existing endpoints now accept filters:

- `GET /api/dashboard/stats`
- `GET /api/reports/summary`
- CSV export routes under `/api/reports/export/*`

## Filtering model

Supported filters:

- `date_from`
- `date_to`
- `department_id`
- `technician_id`
- `category`
- `ticket_type`

Pagination:

- `page`
- `page_size`

Current defaults:

- page size default `25`
- page size max `100`

## Permission behavior

Dashboard:

- administrators and ICT officers can apply organization-level filters
- technicians are automatically constrained to assigned ticket scope
- staff are automatically constrained to self-service ticket scope

Reports:

- currently limited to administrators and ICT officers
- paginated endpoints and CSV exports inherit the same permission gate

## Frontend changes

Updated React pages:

- [frontend/src/features/dashboard/pages/DashboardPage.jsx](/C:/Users/DELL/Downloads/nsc-ict-system/frontend/src/features/dashboard/pages/DashboardPage.jsx)
- [frontend/src/features/reports/pages/ReportsPage.jsx](/C:/Users/DELL/Downloads/nsc-ict-system/frontend/src/features/reports/pages/ReportsPage.jsx)

Dashboard now includes:

- date and scope filters
- live SLA summary cards
- ticket, asset, and technician workload charts

Reports now include:

- reusable filter bar
- paginated detail tables
- filtered CSV export
- SLA performance table
- maintenance schedule health chart

## Scheduled-report readiness

Phase 10 does not persist scheduled reports yet, but the backend now exposes a future-ready architecture contract with these intended stages:

1. validated filter snapshot
2. scoped query execution
3. render to JSON or CSV
4. persist export metadata
5. deliver through notification channels

Proposed future tables are documented by the backend helper:

- `scheduled_reports`
- `scheduled_report_runs`
- `scheduled_report_recipients`

## Verification

Added tests:

- [backend/test/reporting.test.js](/C:/Users/DELL/Downloads/nsc-ict-system/backend/test/reporting.test.js)

Updated tests:

- [backend/test/run.js](/C:/Users/DELL/Downloads/nsc-ict-system/backend/test/run.js)

Metric semantics are defined in:

- [docs/reports/metric-definitions.md](/C:/Users/DELL/Downloads/nsc-ict-system/docs/reports/metric-definitions.md)
