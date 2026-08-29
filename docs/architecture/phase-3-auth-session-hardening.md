# Phase 3: Authentication And Session Hardening

Phase 3 strengthens login protection and session invalidation.

## Changes

- Added `database/migrations/008_auth_session_hardening.sql`.
- Added user fields for failed login tracking, lockout windows, password-change timestamps, and session versioning.
- Added `backend/src/utils/authSecurity.js` for login-protection config, lockout state checks, failure recording, reset behavior, session-version bumps, and password strength validation.
- Login now records failed password attempts for known accounts.
- Accounts are temporarily locked after the configured failed-attempt threshold.
- Successful login clears failed-attempt counters and lockout state.
- JWTs now include `session_version`.
- Auth middleware rejects tokens whose session version does not match the database value.
- Staff profile, status, and temporary-extension changes bump session version so old sessions are invalidated.
- Direct account creation and invitation acceptance now require a stronger password than the old six-character minimum.

## Environment keys

- `LOGIN_MAX_FAILED_ATTEMPTS`: number of failed password attempts before lockout.
- `LOGIN_LOCKOUT_MINUTES`: lockout duration in minutes.

## Compatibility note

Existing JWTs issued before this phase do not contain `session_version` and will be rejected. Users should log in again after deployment.

## Remaining gaps

- Unknown-account login failures are not persisted because there is no auth-event table yet.
- Lockout is account-based, not IP-based.
- Password reset and forced password rotation flows are still not implemented.
