# Phase 5: Service-Layer Consolidation

Phase 5 starts moving write workflows out of Express route handlers and into transactional service modules.

## Changes

- Added `backend/src/services/departments.js`.
- Added `backend/src/services/staffAccounts.js`.
- Department create/update now commit the database change and audit log in one transaction.
- Staff account create/update/status/temporary-extension now commit account changes and audit logs in one transaction.
- Staff account update/status/extension continue to bump `session_version` so old sessions are invalidated.
- Route handlers still own request validation, authorization middleware, response status codes, and duplicate-key handling.
- Added `backend/test/serviceLayer.test.js`.

## Consolidated operations

- `createDepartment`
- `updateDepartment`
- `createStaffAccount`
- `updateStaffAccount`
- `changeStaffStatus`
- `extendTemporaryAccount`

## Remaining gaps

- Several asset and ticket routes still contain direct write logic.
- Some read paths still assemble SQL directly in routes.
- Error mapping is still route-local rather than centralized.
- Transactional services still use raw SQL; no repository abstraction has been added.
