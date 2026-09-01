# Phase 11: Role-Based Frontend

## Scope

Phase 11 turns the frontend into a permission-aware React application shell driven by the backend authorization model from Phase 3.

Delivered areas:

- shared authenticated shell and portal context
- centralized frontend session and access-profile handling
- permission-aware route guards
- role-specific navigation
- dashboard portal framing for administrators, ICT officers, technicians, and staff
- page-level action gating through shared permission helpers
- responsive shell improvements for mobile navigation
- frontend helper tests

## Backend contract

The frontend now consumes a normalized `access_profile` returned from:

- `POST /api/auth/login`
- `GET /api/auth/me`

The access profile includes:

- `role`
- `role_label`
- `user_type`
- `department_id`
- `permissions`
- `scope.organization_scope`
- `scope.department_scope`
- `scope.assigned_only`
- `scope.user_only`
- `primary_portal`

This is a presentation contract only. Backend routes still enforce all real authorization rules.

## Frontend architecture

Updated shared React helpers:

- [frontend/src/lib/api-client.js](/C:/Users/DELL/Downloads/nsc-ict-system/frontend/src/lib/api-client.js)
- [frontend/src/features/auth/hooks/useAuth.js](/C:/Users/DELL/Downloads/nsc-ict-system/frontend/src/features/auth/hooks/useAuth.js)
- [frontend/src/permissions/access.js](/C:/Users/DELL/Downloads/nsc-ict-system/frontend/src/permissions/access.js)
- [frontend/src/components/layout/AppShell.jsx](/C:/Users/DELL/Downloads/nsc-ict-system/frontend/src/components/layout/AppShell.jsx)
- [frontend/src/styles/components.css](/C:/Users/DELL/Downloads/nsc-ict-system/frontend/src/styles/components.css)

### API and auth responsibilities

- session storage and normalization
- fallback access-profile derivation for old sessions
- route-permission metadata
- permission checks
- route guards
- session refresh from `/api/auth/me`
- shared page-state rendering helpers

### Shell responsibilities

- grouped navigation sections
- portal and scope summary in the sidebar
- shared topbar and notification shell
- mobile sidebar toggle

## Portal behavior

### Administrator

- sees organization-wide shell context
- sees staff, departments, reports, and audit navigation
- can access full management workflows

### ICT Officer

- sees organization-wide operational context
- sees operational oversight links
- does not receive administrator-only direct-account actions unless separately permitted

### Technician

- lands in a technician-oriented dashboard context
- gets direct access to assigned requests and maintenance
- does not see oversight pages

### Staff

- lands in a self-service or department-scoped dashboard context
- sees only pages available to ordinary internal users
- staff-specific visibility remains limited by backend record scope

## Updated React routes

- `/dashboard`
- `/service-requests`
- `/service-requests/:id`
- `/technician`
- `/technician/work/:kind/:id`
- `/assets`
- `/assets/:id`
- `/maintenance`
- `/knowledge-base`
- `/staff`
- `/departments`
- `/reports`
- `/audit-logs`
- `/about`

Each route uses shared route guards instead of direct role-list redirects.

## Accessibility and responsiveness

- mobile navigation uses a sidebar backdrop and explicit toggle
- page headings now include context subtitles where relevant
- role and portal context is visible without depending on color alone
- empty and informational states use shared shell styling

## Testing

Added frontend helper coverage:

- [backend/test/frontendAccess.test.js](/C:/Users/DELL/Downloads/nsc-ict-system/backend/test/frontendAccess.test.js)

Updated runner:

- [backend/test/run.js](/C:/Users/DELL/Downloads/nsc-ict-system/backend/test/run.js)

The current repository still does not include a dedicated browser E2E runner, so interactive page verification remains manual.
