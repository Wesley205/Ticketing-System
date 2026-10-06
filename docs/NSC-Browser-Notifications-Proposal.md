# NSC Ticketing System Browser Notification Proposal

## Goal
Notify authenticated users about ticket assignments, status changes, SLA warnings, and comments even when the NSC Ticketing System tab is not focused.

## Recommended MVP Path

1. Keep the existing in-app notification table as the source of truth.
2. Add a service worker, for example `/notification-sw.js`, to receive Web Push payloads.
3. Add backend Web Push subscriptions:
   - `POST /notifications/browser-subscriptions` to save endpoint, keys, user agent, and user ID.
   - `DELETE /notifications/browser-subscriptions/:id` to disable a device.
4. Generate VAPID public/private keys in backend environment config. Do not commit keys.
5. When `emitNotificationEvent` creates an in-app notification, enqueue a browser-push delivery for users with browser notifications enabled.
6. The push payload should include only safe metadata:
   - notification ID
   - title
   - short message
   - severity
   - action URL, such as `/service-requests/:ticketId` or `/technician/work/ticket/:ticketId`
7. The service worker should open or focus the matching route when the user clicks the browser notification.
8. Add a user-facing permission control in notification preferences:
   - Enable browser notifications
   - Test notification
   - Disable this device

## Why this approach

This keeps the database notification feed authoritative, avoids exposing sensitive ticket details in push payloads, supports offline/tab-closed delivery, and lets users control browser permission per device.

## Fallback

For browsers where Web Push is unavailable or permission is denied, keep the current in-app unread badge polling and notification inbox behavior.
