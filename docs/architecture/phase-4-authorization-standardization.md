# Phase 4: Authorization Standardization

Phase 4 introduces reusable authorization middleware so route modules do not need to repeat simple privileged-access checks.

## Changes

- Added `backend/src/middleware/authorize.js`.
- Added reusable helpers:
  - `requirePermission(policyFn, message)`
  - `requireAnyPermission(policyFns, message)`
  - `assertAllowed(user, policyFn, message)`
- Replaced repeated route-level privileged checks in the corresponding module route files:
  - `backend/src/modules/auditLogs/auditLog.routes.js`
  - `backend/src/modules/reports/report.routes.js`
  - `backend/src/modules/invitations/invitation.routes.js`
  - `backend/src/modules/departments/department.routes.js`
  - `backend/src/modules/staff/staff.routes.js`
- Added tests for authorization middleware behavior.

## Authorization model

- `requireAuth` remains responsible for identity, account lifecycle, and session-version validation.
- `backend/src/utils/authorization.js` remains the source of policy decisions.
- `backend/src/middleware/authorize.js` adapts policy decisions into Express route middleware.
- Frontend checks remain presentation-only and are not trusted for backend access control.

## Record-level checks

Record-level checks remain inside route handlers when the application must first load a ticket, asset, department, maintenance record, or knowledge-base article before deciding access. These should be moved into reusable record loaders in a later service-layer phase.

## Remaining gaps

- Some routes still perform record-level authorization manually after loading data.
- Several write handlers still mix validation, authorization, SQL, audit logging, and response mapping.
- Full endpoint integration tests for cross-user and cross-department denial paths are still needed.
