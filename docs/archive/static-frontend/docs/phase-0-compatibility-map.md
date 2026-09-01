# Phase 0 Compatibility Map

Date: 2026-08-31

## Scope

This document captures the current static frontend entry points, shared client runtime behavior, Express static serving model, and the REST endpoints that the future React presentation layer must remain compatible with.

Phase 0 constraints followed:

- No runtime application code was changed.
- No backend endpoints, authorization rules, or database behavior were changed.
- The existing static frontend remains the active UI.

## Current Frontend Delivery Model

## Summary

- There is no React app yet.
- There is no `frontend/package.json` or frontend build pipeline yet.
- The Express backend serves the `frontend/` directory directly as static files.
- Current page navigation uses hardcoded `.html` routes.
- Shared browser-side runtime lives in:
  - `frontend/js/api.js`
  - `frontend/js/layout.js`
  - `frontend/js/permissions.js`
  - `frontend/js/ui/*`
- Shared styles live in:
  - `frontend/css/style.css`
  - `frontend/css/tokens.css`
  - `frontend/css/components.css`

## Static Entry Points

| Current page file | Current browser route | Page guard | Proposed React route | Compatibility notes |
| --- | --- | --- | --- | --- |
| `frontend/index.html` | `/index.html` | none before login; redirects to dashboard when token exists | `/` or `/login` | Keep `/index.html` as legacy alias or redirect. |
| `frontend/register.html` | `/register.html?token=...` | none before activation; redirects to dashboard when token exists | `/register` or `/invite/accept` | Must preserve `?token=` query consumption. |
| `frontend/dashboard.html` | `/dashboard.html` | `requireRoutePage('dashboard')` | `/dashboard` | Filters vary by permission; all authenticated users can reach dashboard in current client model. |
| `frontend/service-requests.html` | `/service-requests.html` | `requireRoutePage('service-requests')` | `/service-requests` | Backend notification URLs already point to `#ticket-<id>` even though current page does not parse that hash. |
| `frontend/technician.html` | `/technician.html` | `requireRoutePage('technician')` | `/technician` | Technician-only portal in current frontend route model. |
| `frontend/assets.html` | `/assets.html` | `requireRoutePage('assets')` | `/assets` | Actions vary by backend permissions and record scope. |
| `frontend/maintenance.html` | `/maintenance.html` | `requireRoutePage('maintenance')` | `/maintenance` | Backend maintenance reminder URLs point to `#schedule-<id>`; current page does not parse the hash. |
| `frontend/staff.html` | `/staff.html` | `requireRoutePage('staff')` | `/staff` | Admin-only actions inside page; page visibility is operational-only. |
| `frontend/departments.html` | `/departments.html` | `requireRoutePage('departments')` | `/departments` | Create/edit is admin-only; list/detail are broader. |
| `frontend/knowledge-base.html` | `/knowledge-base.html#article-<id>` | `requireRoutePage('knowledge-base')` | `/knowledge-base` | Must preserve `#article-<id>` deep links. |
| `frontend/reports.html` | `/reports.html` | `requireRoutePage('reports')` | `/reports` | Uses Chart.js CDN and CSV export endpoints. |
| `frontend/audit-log.html` | `/audit-log.html` | `requireRoutePage('audit-log')` | `/audit-logs` | Could also remain `/audit-log`; current file name is singular. |
| `frontend/about.html` | `/about.html` | `requireAuthPage()` | `/about` | Uses auth-only guard, not route-specific permission guard. |

## Shared Assets and Runtime Dependencies

## Static assets

- `/img/logo.svg`
- `/img/logo-solid.svg`

## Styles

- `frontend/css/style.css` imports `/css/tokens.css` and `/css/components.css`
- Shared design tokens are CSS custom properties in `frontend/css/tokens.css`
- Shared layout/detail/timeline primitives are in `frontend/css/components.css`

## Browser-side script dependencies

- All screens use `/js/api.js`
- Most authenticated screens also use `/js/layout.js`
- Some refactored operational screens additionally use:
  - `/js/permissions.js`
  - `/js/ui/badges.js`
  - `/js/ui/feedback.js`
  - `/js/ui/modals.js`
  - `/js/ui/states.js`
  - `/js/ui/tables.js`
- `dashboard.html` and `reports.html` load Chart.js from:
  - `https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js`

## Authentication and Session Compatibility

## Current persistence model

- Access token storage: `localStorage['nsc_token']`
- User/session profile storage: `localStorage['nsc_user']`
- No cookie-based session handling is used by the frontend.
- No `sessionStorage` usage was found in the current frontend.

## Current auth helpers

Defined in `frontend/js/api.js`:

- `getToken()`
- `setSession(token, user)`
- `clearSession()`
- `getUser()`
- `getAccessProfile()`
- `getPermissions()`
- `hasPermission(permissionKey)`
- `ensureSessionProfile()`
- `refreshSessionProfile()`

## Required request headers

- JSON API calls use `Authorization: Bearer <token>` when a token exists.
- JSON API calls default to `Content-Type: application/json`.
- Blob download requests also use `Authorization: Bearer <token>`.

## Current redirect behavior

- If a token exists, `index.html` and `register.html` redirect to `/dashboard.html`.
- Any `401` response from `api()` or `apiBlob()` clears local storage and redirects to `/index.html`.
- Route/page access in the current frontend is convenience-only; Express authorization remains authoritative.

## Current frontend permission model

The client uses `fallbackAccessProfile()` in `frontend/js/api.js` when the backend session payload does not already include `access_profile`.

Role and portal assumptions currently exposed in the browser:

| Role | Current client portal behavior |
| --- | --- |
| Staff | Dashboard, service desk, assets, knowledge base, about |
| Technician | Staff access plus technician portal and maintenance |
| ICT Officer | Organization-scoped dashboard, service desk, assets, maintenance, knowledge base, staff, reports, audit, about |
| Administrator | ICT Officer access plus user-management and department-management actions |

Important constraint for React migration:

- Keep frontend permission checks for usability and route presentation.
- Do not move real authorization out of Express route/service policy checks.

## Express Static Serving and Fallback

## Current server behavior

From `backend/src/app.js`:

- API routes are mounted first under `/api/*`.
- `frontend/` is then served via `express.static(...)`.
- Any non-API route falls back to `frontend/index.html`.

## Compatibility implication

Current static navigation is file-based (`/dashboard.html`, `/assets.html`, etc.), but the fallback sends `frontend/index.html`, which is the login page, not an SPA shell.

This means:

- React route paths like `/dashboard` or `/assets/123` will not work correctly until the fallback target is changed to a dedicated React entry document.
- Legacy `.html` routes should be preserved during migration, or mapped to React routes through redirects/rewrites.

## Backend Build and Deploy Context

## Current scripts

`backend/package.json` currently provides:

- `npm run start`
- `npm run dev`
- `npm run test`
- `npm run migrate`
- `npm run smoke`
- `npm run expire-accounts`
- `npm run notification-queue`
- `npm run maintenance-monitor`
- `npm run sla-monitor`

## Current deployment model

- `Dockerfile` copies:
  - `backend/`
  - `frontend/`
  - `database/migrations/`
- The container serves both Express API and static frontend from one Node process.
- `deploy/docker-compose.example.yml` exposes the app on port `5000`.
- There is no separate frontend build artifact or CDN deployment flow yet.

## Screen-to-API Compatibility Matrix

## Shared shell and cross-screen APIs

These are not tied to a single page and are currently used by `frontend/js/layout.js`.

| Concern | Endpoint | Method | Current server access |
| --- | --- | --- | --- |
| Notification list | `/api/notifications?limit=8` | `GET` | Any authenticated user; records are user-owned |
| Notification unread count | `/api/notifications/unread-count` | `GET` | Any authenticated user |
| Mark notification read | `/api/notifications/:id/read` | `POST` | Any authenticated user; record-level ownership enforced in backend |
| Mark all notifications read | `/api/notifications/read-all` | `POST` | Any authenticated user |
| Get notification preferences | `/api/notifications/preferences/me` | `GET` | Any authenticated user |
| Update notification preferences | `/api/notifications/preferences/me` | `PATCH` | Any authenticated user |
| Refresh current session | `/api/auth/me` | `GET` | Any authenticated user |
| Logout | `/api/auth/logout` | `POST` | Any authenticated user |

## Auth entry points

| Static page | Proposed React route | Endpoint | Method | Payload / query contract | Current server access |
| --- | --- | --- | --- | --- | --- |
| `/index.html` | `/` or `/login` | `/api/auth/login` | `POST` | `{ identifier, password }` | Public |
| `/register.html?token=...` | `/register` or `/invite/accept` | `/api/invitations/accept` | `POST` | `{ token, username, phone, password }`; token also accepted from query string in UI | Public invitation flow |

Related but not yet wired into the current static pages:

| Endpoint | Method | Payload | Notes |
| --- | --- | --- | --- |
| `/api/auth/password-reset/request` | `POST` | validated request body | Exists in backend; no current static UI entry point |
| `/api/auth/password-reset/confirm` | `POST` | validated request body | Exists in backend; no current static UI entry point |
| `/api/auth/register` | `POST` | none usable | Intentionally disabled in backend |

## Dashboard

| Static page | Proposed React route | Endpoint | Method | Query / payload contract | Current server access |
| --- | --- | --- | --- | --- | --- |
| `/dashboard.html` | `/dashboard` | `/api/dashboard/stats` | `GET` | `date_from`, `date_to`, `department_id`, `technician_id`, `category`, `ticket_type` | Any authenticated user; backend scopes records by role/user/department |
| `/dashboard.html` | `/dashboard` | `/api/reports/filters` | `GET` | none | ICT Officer and Administrator only; current UI only requests this when `can_view_reports` |

Notes:

- Dashboard filter visibility is permission-aware in the client.
- Server-side scoping remains in `dashboard.policy.js`.

## Service Desk

| Static page | Proposed React route | Endpoint | Method | Query / payload contract | Current server access |
| --- | --- | --- | --- | --- | --- |
| `/service-requests.html` | `/service-requests` | `/api/service-requests` | `GET` | `status`, `priority`, `ticket_type`, `mine=true` | Authenticated; backend applies record-level visibility |
| `/service-requests.html` | `/service-requests` | `/api/service-requests/:id` | `GET` | path param `id` | Authenticated; backend applies record-level visibility |
| `/service-requests.html` | `/service-requests` | `/api/service-requests/metadata/options` | `GET` | none | Authenticated |
| `/service-requests.html` | `/service-requests` | `/api/service-requests` | `POST` | `{ ticket_type, category, subcategory, priority, impact, urgency, subject, description, affected_asset_id, closure_confirmation_required }` | Authenticated; create rules enforced in backend |
| `/service-requests.html` | `/service-requests` | `/api/service-requests/:id/assign` | `PATCH` | `{ assigned_technician_id, assignment_note, expected_completion_at }` | Administrator and ICT Officer |
| `/service-requests.html` | `/service-requests` | `/api/service-requests/:id/affected-asset` | `PATCH` | `{ affected_asset_id }` | Authenticated with record-level update permission |
| `/service-requests.html` | `/service-requests` | `/api/service-requests/:id/status` | `PATCH` | `{ status, note, resolution }` | Transition- and actor-specific in backend; includes assigned technician and limited requester actions |
| `/service-requests.html` | `/service-requests` | `/api/service-requests/:id/comments` | `POST` | `{ comment_body, is_internal }` | Authenticated with record-level comment permission |
| `/service-requests.html` | `/service-requests` | `/api/service-requests/:id/attachments` | `POST` | `{ file_name, mime_type, content_base64, is_internal }` | Authenticated with record-level attachment permission |
| `/service-requests.html` | `/service-requests` | `/api/service-requests/:id/attachments/:attachmentId/download` | `GET` | path params | Authenticated with record-level attachment access |
| `/service-requests.html` | `/service-requests` | `/api/knowledge-base/suggestions` | `GET` | `category`, `subcategory`, `subject`, `description`, `affected_asset_id`, `limit` | Authenticated; article visibility constrained in backend |
| `/service-requests.html` | `/service-requests` | `/api/assets` | `GET` | none for lookup load | Authenticated; visibility scoped in backend |
| `/service-requests.html` | `/service-requests` | `/api/staff/technicians` | `GET` | none | Users with technician-directory access; current UI only calls during assignment flow |

Deep-link compatibility notes:

- Current page links to `/knowledge-base.html#article-<id>`.
- Backend-generated notification URLs target `/service-requests.html#ticket-<id>`.
- Current static page does not yet parse `#ticket-<id>`, but React should preserve and implement that deep-link target.

## Technician Portal

| Static page | Proposed React route | Endpoint | Method | Query / payload contract | Current server access |
| --- | --- | --- | --- | --- | --- |
| `/technician.html` | `/technician` | `/api/service-requests/assigned-to-me` | `GET` | none | Authenticated; intended for assigned technician workload |
| `/technician.html` | `/technician` | `/api/service-requests/:id/status` | `PATCH` | `{ status, resolution }` | Assigned technician and other authorized actors per backend transition rules |

Notes:

- The frontend route is technician-only.
- The backend remains the true enforcement layer for update permission.

## Assets

| Static page | Proposed React route | Endpoint | Method | Query / payload contract | Current server access |
| --- | --- | --- | --- | --- | --- |
| `/assets.html` | `/assets` | `/api/assets` | `GET` | `search`, `status`, `asset_type` | Authenticated; record scope enforced in backend |
| `/assets.html` | `/assets` | `/api/assets/:id` | `GET` | path param `id` | Authenticated; record scope enforced in backend |
| `/assets.html` | `/assets` | `/api/assets` | `POST` | `{ asset_tag, asset_type, brand, model, serial_number, department_id, assigned_to, purchase_date, condition, status, location, description }` | Asset-management permission; operational roles only |
| `/assets.html` | `/assets` | `/api/assets/:id` | `PUT` | same shape as create | Asset-management permission; operational roles only |
| `/assets.html` | `/assets` | `/api/assets/:id/return` | `PATCH` | `{ returned_condition, return_notes }` | Asset-management permission |
| `/assets.html` | `/assets` | `/api/assets/:id` | `DELETE` | none | Administrator only |
| `/assets.html` | `/assets` | `/api/departments` | `GET` | none | Any authenticated user in current backend |
| `/assets.html` | `/assets` | `/api/staff` | `GET` | none | ICT Officer and Administrator only; lookup load is best-effort in current UI |

Notes:

- `PATCH /api/assets/:id/status` and `PATCH /api/assets/:id/assign` exist in the backend but are not used by the current page.
- React migration should preserve the current create/edit/delete/return behavior first before expanding to unused endpoints.

## Maintenance

| Static page | Proposed React route | Endpoint | Method | Query / payload contract | Current server access |
| --- | --- | --- | --- | --- | --- |
| `/maintenance.html` | `/maintenance` | `/api/maintenance` | `GET` | `status` | Authenticated; visibility scoped in backend |
| `/maintenance.html` | `/maintenance` | `/api/maintenance/schedules` | `GET` | none | Authenticated; visibility scoped in backend |
| `/maintenance.html` | `/maintenance` | `/api/maintenance` | `POST` | `{ asset_id, problem, action_taken, maintenance_type, maintenance_date, cost, status, notes, scheduled_start_at, next_due_at, checklist_items }` | Operational roles; technicians allowed when asset is visible to them |
| `/maintenance.html` | `/maintenance` | `/api/maintenance/:id` | `PUT` | current page uses `{ status: 'Completed' }`; backend supports broader update shape | Operational roles with backend record checks |
| `/maintenance.html` | `/maintenance` | `/api/maintenance/schedules` | `POST` | `{ asset_id, title, description, maintenance_type, frequency_unit, frequency_value, next_due_at, reminder_days_before, checklist_items }` | Operational roles |
| `/maintenance.html` | `/maintenance` | `/api/assets` | `GET` | none for lookup load | Authenticated; visibility scoped in backend |

Deep-link compatibility notes:

- Backend reminder URLs target `/maintenance.html#schedule-<id>`.
- Current static page does not parse `#schedule-<id>`.
- React should preserve and implement this deep-link target.

## Staff and Invitations

| Static page | Proposed React route | Endpoint | Method | Query / payload contract | Current server access |
| --- | --- | --- | --- | --- | --- |
| `/staff.html` | `/staff` | `/api/staff` | `GET` | `search`, `role`, `user_type` | ICT Officer and Administrator |
| `/staff.html` | `/staff` | `/api/staff` | `POST` | `{ full_name, email, username, phone, role, user_type, department_id, account_start_date, account_expiration_date, sponsor_name, password }` | Administrator only |
| `/staff.html` | `/staff` | `/api/staff/:id` | `PUT` | same edit shape, without mandatory password | Administrator only |
| `/staff.html` | `/staff` | `/api/staff/:id/status` | `PATCH` | `{ is_active, deactivation_reason }` | Administrator only |
| `/staff.html` | `/staff` | `/api/staff/:id/extend` | `PATCH` | `{ account_expiration_date }` | Administrator only |
| `/staff.html` | `/staff` | `/api/invitations` | `GET` | none | ICT Officer and Administrator can list; issue/revoke remain narrower |
| `/staff.html` | `/staff` | `/api/invitations` | `POST` | `{ full_name, email, role, user_type, department_id, sponsor_name, expires_in_days }` | Administrator only in current permission model |
| `/staff.html` | `/staff` | `/api/invitations/:id/revoke` | `POST` | none | Administrator only |
| `/staff.html` | `/staff` | `/api/departments` | `GET` | none | Any authenticated user in current backend |

Notes:

- The client displays read-only directory behavior for non-admin operational users if they can reach the page.
- Invitation acceptance is a separate public flow on `/register.html`.

## Departments

| Static page | Proposed React route | Endpoint | Method | Query / payload contract | Current server access |
| --- | --- | --- | --- | --- | --- |
| `/departments.html` | `/departments` | `/api/departments` | `GET` | none | Any authenticated user |
| `/departments.html` | `/departments` | `/api/departments/:id` | `GET` | path param `id` | Authenticated with backend detail checks |
| `/departments.html` | `/departments` | `/api/departments` | `POST` | `{ name, description }` | Administrator only |
| `/departments.html` | `/departments` | `/api/departments/:id` | `PUT` | `{ name, description }` | Administrator only |

Notes:

- The page itself is route-gated in the current frontend, but backend list access is broader than page visibility.

## Knowledge Base

| Static page | Proposed React route | Endpoint | Method | Query / payload contract | Current server access |
| --- | --- | --- | --- | --- | --- |
| `/knowledge-base.html` | `/knowledge-base` | `/api/knowledge-base` | `GET` | `search`, `category`; UI may also send `status=` when manager view is active | Authenticated; visibility constrained in backend |
| `/knowledge-base.html#article-<id>` | `/knowledge-base` | `/api/knowledge-base/:id` | `GET` | path param `id` | Authenticated; article visibility constrained in backend |
| `/knowledge-base.html` | `/knowledge-base` | `/api/knowledge-base` | `POST` | `{ title, slug, summary, body, category, status, visibility_scope, department_id, search_keywords, change_note, relations }` | ICT Officer and Administrator |
| `/knowledge-base.html` | `/knowledge-base` | `/api/knowledge-base/:id` | `PUT` | same shape as create | ICT Officer and Administrator |
| `/knowledge-base.html` | `/knowledge-base` | `/api/knowledge-base/:id/feedback` | `POST` | `{ is_helpful }` | Authenticated users allowed by backend feedback policy |
| `/knowledge-base.html` | `/knowledge-base` | `/api/knowledge-base/:id/revisions` | `GET` | path param `id` | Exists in backend; current page consumes revisions from detail payload, not via separate call |

Deep-link compatibility notes:

- Current static page actively parses and sets `window.location.hash = article-<id>`.
- React migration must preserve this hash behavior or provide a legacy-compatible redirect.

## Reports

| Static page | Proposed React route | Endpoint | Method | Query / payload contract | Current server access |
| --- | --- | --- | --- | --- | --- |
| `/reports.html` | `/reports` | `/api/reports/filters` | `GET` | none | ICT Officer and Administrator |
| `/reports.html` | `/reports` | `/api/reports/summary` | `GET` | `date_from`, `date_to`, `department_id`, `technician_id`, `category`, `ticket_type` | ICT Officer and Administrator |
| `/reports.html` | `/reports` | `/api/reports/tickets` | `GET` | summary filters plus `page`, `page_size` | ICT Officer and Administrator |
| `/reports.html` | `/reports` | `/api/reports/assets` | `GET` | summary filters plus `page`, `page_size` | ICT Officer and Administrator |
| `/reports.html` | `/reports` | `/api/reports/maintenance` | `GET` | summary filters plus `page`, `page_size` | ICT Officer and Administrator |
| `/reports.html` | `/reports` | `/api/reports/export/assets.csv` | `GET` | same filters as summary | ICT Officer and Administrator |
| `/reports.html` | `/reports` | `/api/reports/export/service-requests.csv` | `GET` | same filters as summary | ICT Officer and Administrator |

Compatibility notes:

- Current page expects paginated row endpoints to return `rows`, `total`, `page`, and `page_size`.
- React client must preserve current CSV download behavior using blob responses.

## Audit Log

| Static page | Proposed React route | Endpoint | Method | Query / payload contract | Current server access |
| --- | --- | --- | --- | --- | --- |
| `/audit-log.html` | `/audit-logs` | `/api/audit-logs` | `GET` | `action` | ICT Officer and Administrator |

## About

| Static page | Proposed React route | Endpoint | Method | Query / payload contract | Current server access |
| --- | --- | --- | --- | --- | --- |
| `/about.html` | `/about` | none | none | none | Authenticated page only |

## Express Route Inventory Under `/api`

Mounted API groups from `backend/src/app.js`:

- `/api/health`
- `/api/auth`
- `/api/invitations`
- `/api/dashboard`
- `/api/assets`
- `/api/service-requests`
- `/api/maintenance`
- `/api/notifications`
- `/api/knowledge-base`
- `/api/staff`
- `/api/departments`
- `/api/audit-logs`
- `/api/reports`

## Migration-Critical Findings

## Items React must preserve exactly

- `localStorage` keys:
  - `nsc_token`
  - `nsc_user`
- Bearer-token request model for all authenticated API calls
- Current `.html` deep links during transition, especially:
  - `/register.html?token=...`
  - `/knowledge-base.html#article-<id>`
- Notification shell behavior and its API usage
- CSV export via blob download
- File attachment upload payload shape using base64 content

## Current server/frontend mismatches to account for

- Express wildcard fallback serves `frontend/index.html`, not a dedicated SPA entry file.
- Backend notification URLs already assume ticket and schedule deep links:
  - `/service-requests.html#ticket-<id>`
  - `/maintenance.html#schedule-<id>`
- Current static pages do not yet consume those two hashes.
- Backend route availability is broader than some frontend page visibility rules:
  - `GET /api/departments` is available to any authenticated user
  - `GET /api/departments/:id` is available with backend detail checks

## Recommended Phase 1 verification checkpoints

- Confirm final React route naming:
  - preserve `.html` aliases during transition, or replace them with server redirects
- Confirm whether `#article-<id>` should remain as a hash or become a path/query alias
- Confirm whether React should implement `#ticket-<id>` and `#schedule-<id>` deep-link support immediately
- Confirm whether localStorage key names remain unchanged for Phase 1
- Confirm how Express fallback should be changed once a React build entry exists
