# Phase 7: Frontend Production Readiness

Phase 7 adds browser-facing hardening for the existing static frontend without replacing the frontend stack.

## Changes

- Added `backend/src/middleware/securityHeaders.js`.
- Added global browser security headers:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: same-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - `Content-Security-Policy`
- Added static-file cache controls:
  - HTML responses use `Cache-Control: no-store`
  - production static assets use one-hour public cache
  - development static assets avoid long-lived cache
- Updated `backend/src/app.js` to apply security headers before routes and static frontend serving.
- Added `backend/test/securityHeaders.test.js`.

## CSP compatibility

The current frontend uses inline scripts and inline event handlers across pages, and reports/dashboard pages load Chart.js from `https://cdnjs.cloudflare.com`. The CSP therefore still allows:

- `'unsafe-inline'` for scripts
- `'unsafe-inline'` for styles
- `https://cdnjs.cloudflare.com` for Chart.js

This is a compatibility policy, not the final target policy.

## Remaining gaps

- Remove inline scripts and inline event handlers so `'unsafe-inline'` can be removed.
- Vendor or self-host Chart.js, or pin it with integrity if CDN usage remains.
- Consider replacing `localStorage` token storage with httpOnly secure cookies.
- Add end-to-end browser tests for login, route guards, notifications, reports, and core ticket workflows.
- Add XSS regression tests for user-controlled fields rendered into dynamic HTML.
