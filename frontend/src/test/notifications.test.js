import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildNotificationsQuery,
  filterNotifications,
  fetchUnreadNotificationCount,
  groupNotificationsByDate,
  markAllNotificationsRead,
  markNotificationRead,
  normalizeNotificationsPayload,
  notificationTarget,
  relativeNotificationTime,
} from '../features/notifications/services/notifications-api.js';

test('notification query builder preserves supported filters only', () => {
  assert.equal(
    buildNotificationsQuery({
      status: 'unread',
      page: 2,
      pageSize: 20,
      ignored: 'nope',
    }).toString(),
    'status=unread&page=2&page_size=20'
  );
});

test('notification normalizer accepts array and payload wrappers', () => {
  const rows = normalizeNotificationsPayload({
    notifications: [
      {
        id: 7,
        type: 'WARNING',
        subject: 'Maintenance due',
        body: 'Schedule is due.',
        timestamp: '2026-09-11T08:00:00Z',
        related_record_type: 'service_request',
        related_record_id: 22,
      },
    ],
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].notification_id, 7);
  assert.equal(rows[0].severity, 'warning');
  assert.equal(rows[0].title, 'Maintenance due');
  assert.equal(rows[0].source_type, 'service_request');
  assert.equal(rows[0].source_id, 22);
});

test('notification grouping splits today from earlier', () => {
  const groups = groupNotificationsByDate(
    [
      { notification_id: 1, created_at: '2026-09-11T08:00:00Z' },
      { notification_id: 2, created_at: '2026-09-10T08:00:00Z' },
    ],
    new Date('2026-09-11T12:00:00Z')
  );

  assert.equal(groups.today.length, 1);
  assert.equal(groups.earlier.length, 1);
});

test('notification unread filter and targets stay deterministic', () => {
  const rows = [
    { notification_id: 1, read_at: null, source_type: 'technician_ticket', source_id: 8 },
    { notification_id: 2, read_at: '2026-09-11T09:00:00Z', source_type: 'audit', source_id: 1 },
  ];

  assert.equal(filterNotifications(rows, 'unread').length, 1);
  assert.equal(notificationTarget(rows[0]), '/technician/work/ticket/8');
  assert.equal(notificationTarget(rows[1]), '/audit-logs');
});

test('notification targets prefer backend action urls and route service requests to tickets', () => {
  assert.equal(
    notificationTarget({ action_url: '/service-requests/44', source_type: 'maintenance', source_id: 8 }),
    '/service-requests/44'
  );
  assert.equal(
    notificationTarget({ source_type: 'service_request', source_id: 44 }),
    '/service-requests/44'
  );
});

test('notification write APIs use backend-supported POST methods', async () => {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), method: options.method || 'GET' });
    return new Response(JSON.stringify({ unread_count: 4, updated: 2 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  assert.equal(await fetchUnreadNotificationCount(), 4);
  await markNotificationRead(7);
  await markAllNotificationsRead();

  assert.deepEqual(calls.map((call) => call.method), ['GET', 'POST', 'POST']);
  assert.match(calls[0].url, /\/notifications\/unread-count$/);
  assert.match(calls[1].url, /\/notifications\/7\/read$/);
  assert.match(calls[2].url, /\/notifications\/read-all$/);

  delete globalThis.fetch;
});

test('notification relative time labels recent alerts', () => {
  assert.equal(
    relativeNotificationTime('2026-09-11T11:30:00Z', new Date('2026-09-11T12:00:00Z')),
    '30 min ago'
  );
});
