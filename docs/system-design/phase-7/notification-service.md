# Phase 7: Notification Service

## Scope

Phase 7 centralizes notification creation, adds a delivery queue for email-capable events, exposes self-service notification APIs, and introduces an in-app notification interface with user preference controls.

## Delivered changes

- Added [database/migrations/005_phase_7_notification_service.sql](/C:/Users/DELL/Downloads/nsc-ict-system/database/migrations/005_phase_7_notification_service.sql)
- Expanded `notifications` with `severity` and `action_url`
- Expanded `notification_preferences` with category-level controls for comments, attachments, SLA alerts, and system notices
- Added `notification_deliveries` for queued email, SMS, and WhatsApp delivery attempts and statuses
- Added the centralized service in [backend/src/utils/notificationService.js](/C:/Users/DELL/Downloads/nsc-ict-system/backend/src/utils/notificationService.js)
- Added queue processing in [backend/src/utils/notificationProcessor.js](/C:/Users/DELL/Downloads/nsc-ict-system/backend/src/utils/notificationProcessor.js)
- Added the one-shot queue script [backend/src/scripts/runNotificationQueue.js](/C:/Users/DELL/Downloads/nsc-ict-system/backend/src/scripts/runNotificationQueue.js)
- Added notification APIs in [backend/src/routes/notifications.js](/C:/Users/DELL/Downloads/nsc-ict-system/backend/src/routes/notifications.js)
- Added a shared topbar notification interface and preference modal in [frontend/js/layout.js](/C:/Users/DELL/Downloads/nsc-ict-system/frontend/js/layout.js)

## Architecture

The central flow is now:

1. A business event occurs.
2. The notification service receives a normalized event payload.
3. Recipient preference rows are ensured and loaded.
4. In-app notifications are persisted when the event and preferences allow them.
5. Email-capable events create `notification_deliveries` queue rows when email is enabled for the target user.
6. The notification queue processor attempts delivery and updates queue status.

## Preference model

Users can now control:

- global in-app notifications
- global email notifications
- assignment updates
- status changes
- maintenance updates
- ticket comments
- ticket attachments
- SLA alerts
- system notices

Critical SLA events still bypass non-critical in-app preference suppression so the user can see urgent alerts in the app.

## Delivery model

`notification_deliveries` supports:

- `email`
- `sms`
- `whatsapp`

Current implementation status:

- `email`: queued and processed through the notification queue, but actual SMTP sending only activates when SMTP settings are configured and the optional runtime dependency is available
- `sms`: not implemented, queue schema only
- `whatsapp`: not implemented, queue schema only

## Reliability and failure handling

- Queue rows track attempt count, max attempts, last error, next attempt, sent time, and failure time
- When SMTP is not configured, email deliveries are moved to `deferred` with a retry schedule instead of being falsely reported as sent
- The API server can process the queue on an interval, and `npm run notification-queue` provides a one-shot execution path

## Current scope limitations

- This repo still does not include a verified production email provider setup
- No claim is made that real email delivery is active by default
- SMS and WhatsApp are intentionally left as extension points only

## Operational notes

- Environment examples are in [backend/.env.example](/C:/Users/DELL/Downloads/nsc-ict-system/backend/.env.example)
- Notification APIs are self-scoped; users can only read or update their own notifications and preferences
- Ticket and SLA flows now use the centralized service rather than inserting notification rows directly
