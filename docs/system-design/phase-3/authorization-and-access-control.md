# Authorization And Access Control

## Scope

Phase 3 centralizes backend authorization and record-level access control for the current NSC ICT Service Desk prototype.

## Delivered changes

- Added shared policy logic in `backend/src/utils/authorization.js`
- Enriched authenticated request context with `department_id`
- Removed route-level dependence on broad `requireRole(...)` lists for operational authorization
- Restricted service-request listing and detail access by requester, assignee, and operational role
- Restricted asset listing and detail access by department and assignment
- Restricted department detail access to administrators, ICT officers, or members of the department
- Restricted maintenance records by asset visibility, technician assignment, and operational role
- Restricted dashboard data so non-operational users no longer receive global counts
- Kept reports, audit logs, staff records, and invitations behind centralized privileged-role checks

## Policy summary

### Administrators

- Full access to operational and administrative records

### ICT Officers

- Full access to operational records, reports, and audit logs
- No direct user-administration authority unless separately granted in later phases

### Technicians

- Can see tickets assigned to them
- Can update only tickets assigned to them
- Can see assets assigned to them or within their department scope
- Can create maintenance only for assets they are allowed to work on
- Can update only their own maintenance records

### Staff

- Can see only tickets they requested
- Can create tickets only for their own department
- Can see only assets assigned to them or in their department scope
- Cannot access staff management, invitations, reports, or audit logs

## Verification

- Added unit tests for centralized authorization decisions
- Added an app-load smoke test to catch route-level syntax regressions after the refactor
