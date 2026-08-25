const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getNotificationEventConfig,
  shouldDeliverForChannel,
} = require('../src/utils/notificationService');
const { getEmailTransportConfig } = require('../src/utils/notificationProcessor');

test('critical SLA notifications bypass in-app category preference but not email global opt-in', () => {
  const event = getNotificationEventConfig('ticket_escalated');
  const prefs = {
    in_app_enabled: false,
    email_enabled: false,
    sla_enabled: false,
  };

  assert.equal(shouldDeliverForChannel(event, prefs, 'in_app'), true);
  assert.equal(shouldDeliverForChannel(event, prefs, 'email'), false);
});

test('non-critical comment notifications respect category and channel preferences', () => {
  const event = getNotificationEventConfig('ticket_comment');
  const prefs = {
    in_app_enabled: true,
    email_enabled: true,
    comment_enabled: false,
  };

  assert.equal(shouldDeliverForChannel(event, prefs, 'in_app'), false);
  assert.equal(shouldDeliverForChannel(event, prefs, 'email'), false);
});

test('email transport reports unconfigured state by default', () => {
  delete process.env.EMAIL_DELIVERY_MODE;
  delete process.env.SMTP_HOST;
  delete process.env.EMAIL_FROM_ADDRESS;

  const config = getEmailTransportConfig();
  assert.equal(config.configured, false);
  assert.match(config.reason, /not configured/i);
});
