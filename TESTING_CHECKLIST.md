# Testing Checklist

Use this checklist after setup to confirm major workflows end to end.

## Authentication

- [ ] Attempt `POST /api/auth/register` and confirm it returns `403` with a public-registration-disabled message.
- [ ] Open `/index.html` and confirm there is no public sign-up link.
- [ ] Issue an invitation as an administrator and accept it through `/register.html`.
- [ ] Log out and log back in with the invited account.
- [ ] Log in with a wrong password and confirm the UI shows an error instead of crashing.
- [ ] Try to open `/dashboard.html` directly without logging in and confirm the app redirects to login.

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

- [ ] As staff, submit a service request.
- [ ] As staff, confirm only own requests are visible in the main queue.
- [ ] As admin or ICT officer, assign a technician to a pending request.

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

## Role-Based Access

- [ ] Log in as staff and confirm Staff Management, Departments, Reports, and Audit Log links do not appear.
- [ ] Log in as technician and confirm Staff Management, Departments, Reports, and Audit Log links do not appear.
- [ ] Attempt a restricted API call such as `DELETE /api/assets/1` while logged in as staff and confirm it returns `403`.
