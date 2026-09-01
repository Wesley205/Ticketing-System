# UI Role Coverage

Date: 2026-08-30

## Role baseline used for audit

- Staff
  - Can submit tickets.
  - Can track permitted tickets.
  - Must not see assignment controls.
- Technician
  - Can execute assigned tickets.
  - May create tickets.
  - Must not assign tickets.
- ICT Officer
  - Can manage operational tickets.
  - May create tickets.
  - May assign tickets.
- Administrator
  - Can manage and oversee the system.

`role` and `user_type` remain separate concepts in the current frontend and backend contract.

## Findings by area

### Ticket creation

- `service-requests.html` exposes ticket creation broadly through route access and aligns with Staff, Technician, ICT Officer, and Administrator expectations.
- `technician.html` does not expose a ticket-creation affordance even though technicians may create tickets under the stated role brief.

### Ticket assignment and reassignment

- `service-requests.html` uses assignment controls gated by `can_manage_service_request_assignments`, which aligns with ICT Officer and Administrator expectations.
- The technician screen does not expose assignment controls, which aligns with the brief.
- No mismatch was observed where Staff are shown assignment controls on inspected pages.

### Ticket execution

- `technician.html` clearly supports technician execution through status updates on assigned requests.
- `service-requests.html` also supports workflow changes through backend-provided permissions on ticket detail, which is consistent with ICT Officer and Administrator use and can also support assigned technicians depending on backend permissions.

### Asset management

- `assets.html` gates edit/create actions through `can_manage_assets` and delete through `can_access_admin_portal`.
- Presentation appears broadly aligned, though the route-level screen is still visible to all users with `can_access_assets`, so read-only versus management mode is implicit rather than explicitly framed.

### Maintenance actions

- `maintenance.html` has route-level protection but no finer-grained presentation checks on create or complete actions inside the page.
- This may still be secure because the backend is authoritative, but the UI does not clearly distinguish Staff versus Technician versus ICT Officer presentation responsibilities.

### Staff management

- `staff.html` uses `can_access_admin_portal` for administrative actions.
- The screen preserves separation between `role` and `user_type` in both display and form fields.
- Admin-only invitation and lifecycle actions are presented correctly.

### Report export

- `reports.html` is route-protected, but export buttons are not separately hidden or disabled by a more granular export-specific permission.
- This is not necessarily a backend defect, but it is a presentation granularity gap if future permissions diverge.

### Audit-log access

- `audit-log.html` is route-protected and aligns with oversight-only access.

### Knowledge-base management

- `knowledge-base.html` gates create and edit controls with `can_manage_knowledge_base`.
- General access remains available through route-level access, which aligns with the broader internal-user access model.

## Role mismatches documented

- Technician ticket creation is not surfaced on `technician.html`, even though technicians may create tickets under the audit brief.
- `maintenance.html` does not visibly distinguish management versus read-only actions by role inside the page.
- `reports.html` uses route-level access but does not present export privilege as a distinct action capability.

## Non-mismatches worth preserving

- `service-requests.html` does not expose assignment controls through simple role checks; it uses permission-aware rendering.
- `staff.html` preserves `role` and `user_type` as separate fields and labels.
- `assets.html` distinguishes general access from destructive admin-only actions.
