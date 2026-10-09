# Testing Checklist

Use this checklist after setup to confirm major workflows end to end.

## Authentication

- [ ] Attempt `POST /api/auth/register` and confirm it returns `403` with a public-registration-disabled message.
- [ ] Open `/login` and confirm there is no public sign-up link.
- [ ] Issue an invitation as an administrator and accept it through `/activate`.
- [ ] Log out and log back in with the invited account.
- [ ] Log in with a wrong password and confirm the UI shows an error instead of crashing.
- [ ] Try to open `/dashboard` directly without logging in and confirm the app redirects to login.

## Internal Access Controls

- [ ] Create an employee account or invitation with a non-organization email and confirm validation blocks it.
- [ ] Create an intern, corper, contractor, or guest account without a sponsor and confirm validation blocks it.
- [ ] Create a temporary account without an expiration date and confirm validation blocks it.
- [ ] Deactivate an account, keep an old token, call an authenticated API, and confirm the request is rejected.
- [ ] Create a temporary account with an expired end date and confirm login is blocked.

## Authorization And Access Control

- [ ] As staff, call `GET /api/service-requests/:id` for another user's ticket and confirm it returns `403`.
- [ ] As staff, call `GET /api/assets/:id` for an asset outside the user's department and assignment and confirm it returns `403`.
- [ ] As staff, call `GET /api/departments/:id` for another department and confirm it returns `403`.
- [ ] As technician, call `PATCH /api/service-requests/:id/status` on a ticket not assigned to that technician and confirm it returns `403`.
- [ ] As technician, call `PUT /api/maintenance/:id` on another technician's maintenance record and confirm it returns `403`.
- [ ] As non-admin user, call `GET /api/dashboard/stats` and confirm returned counts are scoped rather than global.
- [ ] As staff or technician, call `GET /api/reports/summary` and `GET /api/audit-logs` and confirm both return `403`.

## Dashboard

- [ ] Confirm dashboard cards still load for an authenticated user.

## Asset Management

- [ ] Confirm asset listing still loads for authorized users.
- [ ] Confirm restricted users still cannot create or delete assets.

## Service Desk

- [ ] As staff, submit a service request with ticket type, priority, impact, and urgency.
- [ ] As staff, confirm only own requests are visible in the main queue.
- [ ] As admin or ICT officer, assign or reassign a technician to an open ticket.
- [ ] As assigned technician, move a ticket from `Assigned` to `Accepted`, then `In Progress`, then `Resolved`.
- [ ] As requester, confirm internal notes and internal attachments are not visible.
- [ ] As ICT officer, add an internal note and confirm it appears in the timeline.
- [ ] Upload an allowed attachment to a ticket and confirm the authorized download route works.
- [ ] Attempt to upload a blocked file type and confirm validation rejects it.
- [ ] Attempt an invalid status jump such as `New -> Resolved` and confirm the API rejects it.
- [ ] As requester, close a resolved ticket and confirm the timeline records the closure.
- [ ] Reopen a resolved or closed ticket with a reason and confirm the reopen event appears in history.
- [ ] Assign a ticket with an expected completion date and confirm both the ticket detail and assignment history show it.
- [ ] Reassign an open ticket and confirm the previous assignment is closed in assignment history.
- [ ] Remove an assignee from an open ticket and confirm the ticket returns to a pending state.
- [ ] Move an assigned ticket to `Accepted` and confirm acceptance time is recorded.
- [ ] Confirm a newly created ticket gets an SLA policy and response/resolution due timestamps when a matching policy exists.
- [ ] Force a ticket past its SLA response deadline in a local test database, run `npm run sla-monitor`, and confirm escalation notifications and a timeline escalation event are created.
- [ ] Confirm overdue and escalated ticket counts appear on the dashboard.
- [ ] Confirm reports show assignment coverage, SLA coverage, and overdue-ticket rows.

## Notifications

- [ ] Trigger a ticket assignment and confirm a new in-app notification appears for the requester and assignee.
- [ ] Trigger a public ticket comment and confirm it creates a new notification row for other participants.
- [ ] Trigger an SLA escalation and confirm the in-app notification severity reflects the escalation.
- [ ] Open the topbar notification menu and confirm unread count, list rendering, and mark-read actions work.
- [ ] Use the notification preference modal to disable comment notifications and confirm later comments no longer create in-app notifications for that user.
- [ ] Enable email notifications for a test user, run `npm run notification-queue` without SMTP configuration, and confirm queued deliveries move to a deferred or retryable state rather than being marked sent.

## Staff Management

- [ ] Add a direct employee account with an approved organization email.
- [ ] Add a temporary account with `user_type`, sponsor, and expiration date.
- [ ] Edit an existing account's role, department, or lifecycle fields.
- [ ] Deactivate a staff account and confirm login no longer works.
- [ ] Reactivate the account and confirm login works again.
- [ ] Extend a temporary account and confirm the updated expiry is saved.

## Invitations

- [ ] Create an employee invitation and copy the one-time acceptance URL.
- [ ] Create a contractor invitation with sponsor and expiry date.
- [ ] Revoke a pending invitation and confirm it can no longer be accepted.

## Audit Log

- [ ] Confirm invitation creation, invitation revocation, login, and account deactivation events appear.

## Reports

- [ ] Confirm reports still load for admin and ICT officer users.

## Operations And Release Controls

- [ ] Run `npm run ci` from `backend/` before opening a pull request.
- [ ] Run `npm run release:check` from `backend/` before deployment.
- [ ] Start the app and run `npm run smoke` from `backend/`.
- [ ] Build the container image with `docker build -t nsc-ict-service-desk:local .`.
- [ ] Start the compose smoke environment from `deploy/docker-compose.example.yml` with local-only secret values.
- [ ] Apply migrations in the containerized environment with `npm run migrate`.
- [ ] Confirm `GET /api/health/readiness` returns `200` after migrations are applied.
- [ ] As an admin or ICT officer, call `GET /api/health/operations` and confirm migration, job, notification queue, and SLA status are visible.
- [ ] As staff or technician, call `GET /api/health/operations` and confirm it returns `403`.
- [ ] Confirm a PostgreSQL backup and attachment backup are captured before any production migration.

## UI Release Review

- [x] Shared focus, loading, empty, error, table, pagination, and modal states reviewed.
- [x] Responsive navigation, modal sizing, safe-area spacing, and mobile touch targets reviewed.
- [x] Shared icon usage and accessible names reviewed for primary actions and media controls.
- [x] Core user-facing copy reviewed for clarity and encoding defects.
- [ ] Reinstall frontend dependencies, run the frontend test suite, and complete desktop/mobile browser screenshots.
- [ ] Run the production frontend build and verify both `index.html` and `react-shell.html` entry points.
- [ ] Verify login, ticket creation, ticket detail, notifications, knowledge base, and role-restricted routes in the release build.
- [ ] At 320px, 390px, and 430px, verify the shell, login, ticket creation, ticket detail, notifications, knowledge base, and technician assigned-work views have no unintended horizontal overflow.
- [ ] At 768px and 1024px, verify navigation, filters, dialogs, tables, and two-column content transition without clipped labels or select values.
- [ ] At 1440px and 1830px, verify content remains readable within its max width and does not stretch into overly long lines or oversized empty regions.
- [ ] Use keyboard-only navigation to confirm skip-to-content, visible focus, menu and dialog controls, modal focus trapping, Escape handling, and focus restoration.
- [ ] Verify icon-only controls have accessible names, touch targets are at least 44px, and screen-reader announcements identify loading, error, empty, unread, and success states.
- [ ] Verify text and control contrast in the light theme, including disabled, selected, error, warning, and overdue states.
- [ ] Enable reduced motion and confirm navigation, modal, notification, and loading transitions are reduced or removed.

## Role-Based Access

- [ ] Log in as staff and confirm Staff Management, Departments, Reports, and Audit Log links do not appear.
- [ ] Log in as technician and confirm Staff Management, Departments, Reports, and Audit Log links do not appear.
- [ ] Attempt a restricted API call such as `DELETE /api/assets/1` while logged in as staff and confirm it returns `403`.
- [ ] Confirm the dashboard hero and shell portal context change appropriately for administrator, ICT officer, technician, and staff accounts.
- [ ] Confirm mobile navigation opens and closes correctly on authenticated pages.
- [ ] Confirm direct navigation to `/reports`, `/staff`, `/departments`, `/audit-logs`, `/maintenance`, and `/technician` redirects unauthorized users back to their allowed landing page.
- [ ] Confirm ticket assignment buttons, asset-management buttons, and knowledge-base article management buttons appear only when the current access profile allows them.
