# Permission Matrix

## Scope

This matrix describes the target permission model while showing where the current prototype already supports or does not support each action.

Legend:

- `Y` allowed
- `N` not allowed
- `L` limited or conditional
- `Current` shows whether the capability exists in the current codebase

## Role matrix

| Permission | Staff | Technician | ICT Officer | Administrator | Current |
|---|---:|---:|---:|---:|---|
| Submit ticket | Y | Y | Y | Y | Yes |
| View own tickets | Y | Y | Y | Y | Yes |
| View department tickets | L | L | Y | Y | No |
| View all tickets | N | L | Y | Y | Yes, but too broad |
| Comment on tickets | Y | Y | Y | Y | No |
| Add internal notes | N | Y | Y | Y | No |
| Assign tickets | N | N | Y | Y | Yes |
| Reassign tickets | N | N | Y | Y | Partially |
| Change priority | N | L | Y | Y | No dedicated endpoint |
| Change status | L | Y | Y | Y | Yes |
| Resolve tickets | N | Y | Y | Y | Yes |
| Close tickets | L | L | Y | Y | Partially via status |
| Reopen tickets | L | L | Y | Y | No |
| Create assets | N | N | Y | Y | Yes |
| Edit assets | N | L | Y | Y | Yes |
| Assign assets | N | N | Y | Y | Yes |
| View asset history | L | Y | Y | Y | Partial maintenance only |
| Delete or archive assets | N | N | L | Y | Delete only |
| Create maintenance records | N | Y | Y | Y | Yes |
| Complete maintenance | N | Y | Y | Y | Yes |
| Manage staff | N | N | L | Y | Partial |
| Invite users | N | N | L | Y | No |
| Deactivate users | N | N | L | Y | Yes, admin only |
| Extend temporary accounts | N | N | L | Y | No |
| Manage departments | N | N | L | Y | Partial |
| View dashboard | Y | Y | Y | Y | Yes |
| View reports | N | N | Y | Y | Yes |
| Export reports | N | N | Y | Y | Yes |
| View audit logs | N | N | L | Y | Yes |
| Manage system settings | N | N | N | Y | No module yet |

## User-type considerations

| Topic | Employee | Intern | Corper | Contractor | Guest |
|---|---|---|---|---|---|
| Official email required | Yes | No | No | No | No |
| Admin approval required | Policy dependent | Yes | Yes | Yes | Yes |
| Account expiry required | No | Yes | Yes | Yes | Yes |
| Sponsor/supervisor required | No | Yes | Yes | Yes | Yes |
| Privileged role allowed | Yes, if approved | Yes, if approved | Yes, if approved | Yes, if approved | Normally no |

## Enforcement layers

| Permission area | Frontend enforcement | Backend enforcement | Database-level support |
|---|---|---|---|
| Route/page visibility | Required for usability | Not sufficient by itself | Not applicable |
| Ticket access scope | Helpful | Required | Optional through views or row-security if adopted |
| Asset access scope | Helpful | Required | Optional through views or row-security if adopted |
| User administration | Helpful | Required | Constraints for valid roles and foreign keys |
| Temporary account expiry | Helpful warnings only | Required | Supported by account dates and scheduled checks |
| Ticket lifecycle validity | Helpful | Required | Optional status transition tables |

## Confirmed current backend enforcement

Current code enforces these role checks in backend routes:

- assets create and update: admin, ict_officer
- assets status change: admin, ict_officer, technician
- assets delete: admin
- service request assignment: admin, ict_officer
- service request status change: admin, ict_officer, technician
- maintenance create and update: admin, ict_officer, technician
- staff list: admin, ict_officer
- staff create, update, activate, deactivate: admin
- department create and update: admin
- reports: admin, ict_officer
- audit logs: admin, ict_officer

## Confirmed current frontend-only restrictions

Current frontend navigation hides pages based on role, but this is not enough for security:

- sidebar links are filtered through `frontend/src/components/layout/Sidebar.jsx`
- route redirects use the React auth guard and `frontend/src/permissions/access.js`

These are convenience controls, not permission guarantees.

## Confirmed current gaps

- Staff can query `GET /api/assets` and see all assets.
- Any authenticated user can query `GET /api/departments` and `GET /api/departments/:id`.
- Any authenticated user can query `GET /api/service-requests/:id`, which risks viewing requests outside intended scope.
- Ticket closure and reopening permissions are not modeled separately.
- No database structure exists for invitation approval, temporary access, or internal notes.

## Recommendation summary

- Keep UI role checks for usability.
- Make backend rules the source of truth.
- Introduce department-scope evaluation in backend query builders.
- Add explicit transition and permission checks for sensitive ticket actions.
- Replace asset hard delete with archive unless a true purge workflow is approved.
