# Phase 5: Ticket Management Workflow

## Scope

Phase 5 upgrades the service-request feature into a governed ticket workflow with richer metadata, lifecycle controls, comments, internal notes, secure local attachments, notifications, and timeline visibility.

## Delivered changes

- Added [database/migrations/003_phase_5_ticket_workflow.sql](/C:/Users/DELL/Downloads/nsc-ict-system/database/migrations/003_phase_5_ticket_workflow.sql)
- Expanded `service_requests` with workflow fields such as `subcategory`, `impact`, `urgency`, `source_channel`, SLA timestamps, closure confirmation, reopen/cancel reasons, and `reopened_count`
- Added `ticket_attachments.is_internal` so internal files can be hidden from requesters
- Replaced the simple service-request route flow with ticket detail endpoints that return:
  - governed status transitions
  - comments and internal notes
  - attachment metadata
  - timeline history
- Added secure local attachment storage in [backend/src/utils/ticketAttachments.js](/C:/Users/DELL/Downloads/nsc-ict-system/backend/src/utils/ticketAttachments.js)
- Upgraded the static service-desk frontend page to support:
  - ticket type selection
  - ticket detail viewing
  - status transitions
  - public comments
  - internal ICT notes
  - file upload and authorized download
  - timeline display

## Ticket lifecycle

The active workflow now supports:

- `New`
- `Pending`
- `Assigned`
- `Accepted`
- `In Progress`
- `Waiting for User`
- `Waiting for Parts`
- `Resolved`
- `Closed`
- `Reopened`
- `Cancelled`

### Actor rules

- Administrators and ICT officers can perform all valid transitions
- Assigned technicians can work tickets through the active delivery states but cannot close them
- Requesters can close a resolved ticket or reopen a resolved/closed ticket

## Comments, notes, and attachments

- Public comments are visible to authorized request participants
- Internal notes are restricted to ICT operational users and the assigned technician
- Attachments are stored outside the static frontend path and can only be downloaded through an authorized API route
- Internal attachments follow the same visibility model as internal notes

## Notifications and audit trail

- Assignment, public comments, public attachments, and status changes now create notification records
- Ticket actions continue to write audit log entries
- Status changes, comments, notes, and attachment activity also create `ticket_history` entries for timeline rendering

## Operational notes

- Attachment upload currently uses JSON base64 payloads and local filesystem storage; the JSON body limit was increased to support this development workflow
- Allowed attachment types are restricted in code and file names are sanitized before storage
- This phase preserves existing ticket rows and upgrades them in place through the migration
