const test = require('node:test');
const assert = require('node:assert/strict');

const constants = require('./notification.constants');
const mapper = require('./notification.mapper');
const policy = require('./notification.policy');
const repository = require('./notification.repository');
const routes = require('./notification.routes');
const service = require('./notification.service');

test('notification module exposes configured event metadata', () => {
  const event = service.getNotificationEventConfig('ticket_escalated');
  assert.equal(event.category, 'sla');
  assert.equal(event.critical, true);
  assert.equal(event.supportsEmail, true);
});

test('notification module treats pre-breach SLA warnings as critical delivery events', () => {
  const event = service.getNotificationEventConfig('ticket_sla_warning');
  assert.equal(event.category, 'sla');
  assert.equal(event.critical, true);
  assert.equal(event.severity, 'warning');
});

test('notification mapper nests delivery target preferences', () => {
  const row = {
    user_id: 3,
    email: 'user@nsc.test',
    in_app_enabled: true,
    email_enabled: false,
    browser_push_enabled: true,
    assignment_enabled: true,
  };

  const mapped = mapper.mapDeliveryTargetRow(row);
  assert.equal(mapped.user_id, 3);
  assert.equal(mapped.preferences.in_app_enabled, true);
  assert.equal(mapped.preferences.email_enabled, false);
  assert.equal(mapped.preferences.browser_push_enabled, true);
});

test('notification policy restricts record access to owner', () => {
  assert.equal(policy.canAccessNotification({ user_id: 7 }, { recipient_user_id: 7 }), true);
  assert.equal(policy.canAccessNotification({ user_id: 7 }, { recipient_user_id: 8 }), false);
});

test('notification preferences use a fixed allowlist', () => {
  assert.ok(constants.PREFERENCE_FIELDS.includes('email_enabled'));
  assert.ok(constants.PREFERENCE_FIELDS.includes('browser_push_enabled'));
  assert.equal(constants.PREFERENCE_FIELDS.includes('password_hash'), false);
});

test('notification policy supports browser push as an opt-in channel', () => {
  const event = service.getNotificationEventConfig('ticket_assigned');
  assert.equal(policy.shouldDeliverForChannel(event, { browser_push_enabled: false }, 'browser_push'), false);
  assert.equal(policy.shouldDeliverForChannel(event, { browser_push_enabled: true }, 'browser_push'), true);
});

test('notification routes preserve public endpoint surface', () => {
  const endpoints = routes.stack
    .filter((layer) => layer.route)
    .map((layer) => `${Object.keys(layer.route.methods).join(',').toUpperCase()} ${layer.route.path}`);

  assert.ok(endpoints.includes('GET /'));
  assert.ok(endpoints.includes('GET /unread-count'));
  assert.ok(endpoints.includes('GET /browser/vapid-public-key'));
  assert.ok(endpoints.includes('GET /browser-subscriptions/me'));
  assert.ok(endpoints.includes('POST /browser-subscriptions'));
  assert.ok(endpoints.includes('DELETE /browser-subscriptions/:id'));
  assert.ok(endpoints.includes('POST /browser/test'));
  assert.ok(endpoints.includes('POST /read-all'));
  assert.ok(endpoints.includes('GET /preferences/me'));
  assert.ok(endpoints.includes('PATCH /preferences/me'));
  assert.ok(endpoints.includes('POST /:id/read'));
});

test('notification repository lists due browser push deliveries per active endpoint', async () => {
  const calls = [];
  const executor = {
    async query(sql, params) {
      calls.push({ sql, params });
      return { rows: [{ notification_delivery_id: 9, channel: 'browser_push' }] };
    },
  };

  const rows = await repository.listDueBrowserPushDeliveries(executor, 4);
  assert.equal(rows[0].notification_delivery_id, 9);
  assert.match(calls[0].sql, /browser_push/i);
  assert.match(calls[0].sql, /bps\.endpoint = nd\.recipient_address/i);
  assert.deepEqual(calls[0].params, [4, 50]);
});

test('notification repository can target one browser push notification for immediate dispatch', async () => {
  const calls = [];
  const executor = {
    async query(sql, params) {
      calls.push({ sql, params });
      return { rows: [{ notification_delivery_id: 11, channel: 'browser_push' }] };
    },
  };

  const rows = await repository.listDueBrowserPushDeliveries(executor, 5, {
    notificationId: 20,
    recipientUserId: 6,
    limit: 5,
  });

  assert.equal(rows[0].notification_delivery_id, 11);
  assert.match(calls[0].sql, /nd\.notification_id = \$2/i);
  assert.match(calls[0].sql, /nd\.recipient_user_id = \$3/i);
  assert.match(calls[0].sql, /LIMIT \$4/i);
  assert.deepEqual(calls[0].params, [5, 20, 6, 5]);
});

test('notification repository lists due email deliveries with capped batch query', async () => {
  const calls = [];
  const executor = {
    async query(sql, params) {
      calls.push({ sql, params });
      return { rows: [{ notification_delivery_id: 4, channel: 'email' }] };
    },
  };

  const rows = await repository.listDueEmailDeliveries(executor, 3);
  assert.equal(rows[0].notification_delivery_id, 4);
  assert.match(calls[0].sql, /FROM notification_deliveries/i);
  assert.match(calls[0].sql, /LIMIT 50/i);
  assert.deepEqual(calls[0].params, [3]);
});

test('notification repository accepts status unread filter from frontend query', async () => {
  const calls = [];
  const executor = {
    async query(sql, params) {
      calls.push({ sql, params });
      return { rows: [] };
    },
  };

  await repository.listUserNotifications(7, { status: 'unread' }, executor);

  assert.match(calls[0].sql, /is_read = FALSE/i);
  assert.deepEqual(calls[0].params, [7, 20]);
});
