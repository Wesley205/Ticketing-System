# API Specification

## Inspection summary

The current API is mounted by [backend/src/app.js](/C:/Users/DELL/Downloads/nsc-ict-system/backend/src/app.js) and implemented by route files under `backend/src/modules/*`.

No API versioning is implemented. All current endpoints are mounted under `/api`.

## Current API

### Authentication and identity

| Method | Path | Auth | Allowed roles | Current behavior |
|---|---|---|---|---|
| POST | `/api/auth/register` | No | Public | Creates a `staff` user |
| POST | `/api/auth/login` | No | Public | Login by email or username |
| GET | `/api/auth/me` | Yes | Any authenticated user | Returns current profile |

### Dashboard

| Method | Path | Auth | Allowed roles | Current behavior |
|---|---|---|---|---|
| GET | `/api/dashboard/stats` | Yes | Any authenticated user | Returns asset, request, and staff counts |

### Departments

| Method | Path | Auth | Allowed roles | Current behavior |
|---|---|---|---|---|
| GET | `/api/departments` | Yes | Any authenticated user | Lists departments with counts |
| GET | `/api/departments/:id` | Yes | Any authenticated user | Department detail with staff, assets, requests |
| POST | `/api/departments` | Yes | Admin | Create department |
| PUT | `/api/departments/:id` | Yes | Admin | Update department |

### Staff

| Method | Path | Auth | Allowed roles | Current behavior |
|---|---|---|---|---|
| GET | `/api/staff` | Yes | Admin, ICT Officer | List users with filters |
| GET | `/api/staff/technicians` | Yes | Any authenticated user | List active technicians |
| POST | `/api/staff` | Yes | Admin | Create user directly |
| PUT | `/api/staff/:id` | Yes | Admin | Update user profile |
| PATCH | `/api/staff/:id/status` | Yes | Admin | Activate or deactivate |

### Tickets

| Method | Path | Auth | Allowed roles | Current behavior |
|---|---|---|---|---|
| GET | `/api/service-requests` | Yes | Any authenticated user | Staff see own requests; others see all or `mine=true` |
| GET | `/api/service-requests/assigned-to-me` | Yes | Technician | Technician queue |
| GET | `/api/service-requests/:id` | Yes | Any authenticated user | Returns one request |
| POST | `/api/service-requests` | Yes | Any authenticated user | Create request |
| PATCH | `/api/service-requests/:id/assign` | Yes | Admin, ICT Officer | Assign technician |
| PATCH | `/api/service-requests/:id/status` | Yes | Admin, ICT Officer, Technician | Change status and optional resolution |

### Assets

| Method | Path | Auth | Allowed roles | Current behavior |
|---|---|---|---|---|
| GET | `/api/assets` | Yes | Any authenticated user | List assets |
| GET | `/api/assets/:id` | Yes | Any authenticated user | Asset detail plus maintenance history |
| POST | `/api/assets` | Yes | Admin, ICT Officer | Create asset |
| PUT | `/api/assets/:id` | Yes | Admin, ICT Officer | Update asset |
| PATCH | `/api/assets/:id/status` | Yes | Admin, ICT Officer, Technician | Change asset status |
| PATCH | `/api/assets/:id/assign` | Yes | Admin, ICT Officer | Assign or unassign asset |
| DELETE | `/api/assets/:id` | Yes | Admin | Hard delete asset |

### Maintenance

| Method | Path | Auth | Allowed roles | Current behavior |
|---|---|---|---|---|
| GET | `/api/maintenance` | Yes | Any authenticated user | List maintenance records |
| POST | `/api/maintenance` | Yes | Admin, ICT Officer, Technician | Create maintenance record |
| PUT | `/api/maintenance/:id` | Yes | Admin, ICT Officer, Technician | Update maintenance record |

### Reports and audit

| Method | Path | Auth | Allowed roles | Current behavior |
|---|---|---|---|---|
| GET | `/api/reports/summary` | Yes | Admin, ICT Officer | Summary datasets |
| GET | `/api/reports/export/assets.csv` | Yes | Admin, ICT Officer | Asset export |
| GET | `/api/reports/export/service-requests.csv` | Yes | Admin, ICT Officer | Request export |
| GET | `/api/audit-logs` | Yes | Admin, ICT Officer | Audit list with filters |

## Current API inconsistencies

- Public registration conflicts with the internal-only target design.
- `GET /api/service-requests/:id` does not enforce requester or department visibility.
- `GET /api/assets` and `GET /api/assets/:id` allow all authenticated users to view all assets.
- `GET /api/staff/technicians` exposes the full technician list to any authenticated user.
- No endpoint exists for comments, notes, attachments, invitations, password reset, notifications, or knowledge base.
- Ticket assignment and status transitions are coarse and do not enforce lifecycle rules.
- Delete is used for assets instead of archive.

## Target API

Target API paths below are proposed. They intentionally preserve current route groupings where possible.

### Authentication and identity

| Method | Path | Auth | Allowed roles | Department visibility rule | Notes |
|---|---|---|---|---|---|
| POST | `/api/auth/login` | No | Public credentials only | Not applicable | Keep, but restrict eligible account sources |
| GET | `/api/auth/me` | Yes | Any authenticated user | Self only | Keep |
| POST | `/api/auth/change-password` | Yes | Any authenticated user | Self only | Proposed |
| POST | `/api/auth/password-reset/request` | No | Public for approved identities | Not applicable | Proposed |
| POST | `/api/auth/password-reset/confirm` | No | Public with reset token | Not applicable | Proposed |
| POST | `/api/invitations` | Yes | Admin, proposed Request Approver | Scoped by department | Create invitation |
| GET | `/api/invitations` | Yes | Admin, ICT Officer | Scope by allowed departments | Proposed |
| POST | `/api/invitations/:id/accept` | No | Invitee | Not applicable | Proposed |
| POST | `/api/users/:id/activate` | Yes | Admin | All | Proposed |
| POST | `/api/users/:id/deactivate` | Yes | Admin | All | Proposed |
| POST | `/api/users/:id/extend-temporary-access` | Yes | Admin | All | Proposed |

### Users and staff

| Method | Path | Auth | Allowed roles | Department visibility rule |
|---|---|---|---|---|
| GET | `/api/users` | Yes | Admin, ICT Officer | Allowed departments only |
| POST | `/api/users` | Yes | Admin | All |
| GET | `/api/users/:id` | Yes | Admin, ICT Officer, self | Allowed departments or self |
| PATCH | `/api/users/:id` | Yes | Admin | All |
| PATCH | `/api/users/:id/role` | Yes | Admin | All |
| PATCH | `/api/users/:id/department` | Yes | Admin | All |
| PATCH | `/api/users/:id/supervisor` | Yes | Admin | All |

### Departments

| Method | Path | Auth | Allowed roles | Department visibility rule |
|---|---|---|---|---|
| GET | `/api/departments` | Yes | Any authenticated user | Filtered list where needed |
| GET | `/api/departments/:id` | Yes | Admin, ICT Officer, Department Head, members if allowed | Scoped |
| POST | `/api/departments` | Yes | Admin | All |
| PATCH | `/api/departments/:id` | Yes | Admin | All |
| POST | `/api/departments/:id/archive` | Yes | Admin | All |

### Tickets

| Method | Path | Auth | Allowed roles | Department visibility rule | Notes |
|---|---|---|---|---|---|
| POST | `/api/tickets` | Yes | Any authenticated user | Requester department or approved department | Replacement for current create |
| GET | `/api/tickets` | Yes | Any authenticated user | Scoped by role and department | Add pagination |
| GET | `/api/tickets/:id` | Yes | Any authenticated user | Scoped by role and department | Must validate visibility |
| POST | `/api/tickets/:id/assign` | Yes | ICT Officer, Admin | Scoped operationally | Assign ICT officer or technician |
| POST | `/api/tickets/:id/reassign` | Yes | ICT Officer, Admin | Scoped operationally | Proposed |
| POST | `/api/tickets/:id/comments` | Yes | Authorized viewer | Scoped with ticket | Proposed |
| POST | `/api/tickets/:id/internal-notes` | Yes | Technician, ICT Officer, Admin | Scoped with ticket | Proposed |
| POST | `/api/tickets/:id/change-priority` | Yes | ICT Officer, Admin | Scoped operationally | Proposed |
| POST | `/api/tickets/:id/change-status` | Yes | Technician, ICT Officer, Admin | Scoped operationally | Govern transitions |
| POST | `/api/tickets/:id/resolve` | Yes | Technician, ICT Officer, Admin | Scoped operationally | Proposed |
| POST | `/api/tickets/:id/close` | Yes | ICT Officer, Admin, requester if policy allows | Scoped with ticket | Proposed |
| POST | `/api/tickets/:id/reopen` | Yes | Requester, ICT Officer, Admin | Scoped with ticket | Proposed |
| POST | `/api/tickets/:id/attachments` | Yes | Authorized participant | Scoped with ticket | Proposed |

### Assets

| Method | Path | Auth | Allowed roles | Department visibility rule | Notes |
|---|---|---|---|---|---|
| GET | `/api/assets` | Yes | Any authenticated user | Scoped by role and department | Add pagination |
| GET | `/api/assets/:id` | Yes | Any authenticated user | Scoped by role and department | Keep detail |
| POST | `/api/assets` | Yes | ICT Officer, Admin | Operational scope | Keep with stronger validation |
| PATCH | `/api/assets/:id` | Yes | ICT Officer, Admin | Operational scope | Proposed route normalization |
| POST | `/api/assets/:id/assign` | Yes | ICT Officer, Admin | Operational scope | Must create assignment history |
| POST | `/api/assets/:id/return` | Yes | ICT Officer, Admin | Operational scope | Proposed |
| POST | `/api/assets/:id/change-status` | Yes | Technician, ICT Officer, Admin | Operational scope | Governed transition |
| GET | `/api/assets/:id/history` | Yes | Technician, ICT Officer, Admin, authorized staff | Scoped | Proposed |
| POST | `/api/assets/:id/link-ticket` | Yes | ICT Officer, Admin | Operational scope | Proposed |

### Maintenance

| Method | Path | Auth | Allowed roles | Department visibility rule |
|---|---|---|---|---|
| POST | `/api/maintenance` | Yes | Technician, ICT Officer, Admin | Scoped by asset visibility |
| GET | `/api/maintenance` | Yes | Technician, ICT Officer, Admin | Scoped |
| PATCH | `/api/maintenance/:id` | Yes | Technician, ICT Officer, Admin | Scoped |
| POST | `/api/maintenance/:id/complete` | Yes | Technician, ICT Officer, Admin | Scoped |
| POST | `/api/maintenance/schedules` | Yes | ICT Officer, Admin | Scoped |

### Notifications

| Method | Path | Auth | Allowed roles | Department visibility rule |
|---|---|---|---|---|
| GET | `/api/notifications` | Yes | Any authenticated user | Self only |
| POST | `/api/notifications/:id/read` | Yes | Any authenticated user | Self only |
| PATCH | `/api/notification-preferences` | Yes | Any authenticated user | Self only |

### Reports and audit

| Method | Path | Auth | Allowed roles | Department visibility rule |
|---|---|---|---|---|
| GET | `/api/reports/dashboard-summary` | Yes | ICT Officer, Admin, proposed Department Head | Scoped |
| GET | `/api/reports/tickets` | Yes | ICT Officer, Admin | Scoped |
| GET | `/api/reports/assets` | Yes | ICT Officer, Admin | Scoped |
| GET | `/api/reports/export/tickets.csv` | Yes | ICT Officer, Admin | Scoped |
| GET | `/api/reports/export/assets.csv` | Yes | ICT Officer, Admin | Scoped |
| GET | `/api/audit-logs` | Yes | Admin, ICT Officer if approved | Scoped or global by policy |

## Request and response standards

Target standards:

- All list endpoints should support pagination.
- Validation errors should return a consistent array or keyed object, not only a single message.
- Audit-sensitive endpoints should write structured audit events.
- Department-scoped endpoints should reject access with `403` when records exist but are out of scope.

## Error responses

Recommended standard response shapes:

| Status | Meaning | Example shape |
|---|---|---|
| 400 | Validation or bad request | `{ "error": "Validation failed", "details": [...] }` |
| 401 | Authentication required | `{ "error": "Authentication required" }` |
| 403 | Forbidden | `{ "error": "Insufficient permissions" }` |
| 404 | Not found | `{ "error": "Resource not found" }` |
| 409 | Conflict | `{ "error": "Duplicate or conflicting state" }` |
| 422 | Invalid lifecycle transition | `{ "error": "Transition not allowed" }` |

## Pagination behavior

Recommended standard query parameters:

- `page`
- `page_size`
- `sort`
- `order`
- filters specific to each module

Recommended list response wrapper:

```json
{
  "items": [],
  "page": 1,
  "page_size": 25,
  "total_items": 0,
  "total_pages": 0
}
```
