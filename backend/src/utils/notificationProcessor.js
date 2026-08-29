const pool = require('../config/db');
const { runExclusiveJob } = require('./jobRunner');
const notificationRepository = require('../modules/notifications/notification.repository');

const DEFAULT_NOTIFICATION_QUEUE_INTERVAL_MINUTES = 10;
const DEFAULT_NOTIFICATION_MAX_ATTEMPTS = 5;

function getEmailTransportConfig() {
  const mode = String(process.env.EMAIL_DELIVERY_MODE || '').toLowerCase();
  if (mode !== 'smtp') {
    return { configured: false, reason: 'SMTP email transport is not configured.' };
  }

  const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM_ADDRESS'];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    return {
      configured: false,
      reason: `SMTP email transport is missing configuration: ${missing.join(', ')}`,
    };
  }

  return {
    configured: true,
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM_ADDRESS,
  };
}

function computeNextAttempt(attemptCount) {
  const minutes = Math.min(60, Math.max(5, attemptCount * 10));
  return new Date(Date.now() + minutes * 60 * 1000);
}

async function sendEmailDelivery(delivery, config) {
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  const info = await transporter.sendMail({
    from: config.from,
    to: delivery.recipient_address,
    subject: delivery.subject,
    text: delivery.body_text,
  });

  return info.messageId || null;
}

async function processNotificationQueue(executor = pool) {
  const maxAttempts = Number(process.env.NOTIFICATION_MAX_ATTEMPTS || DEFAULT_NOTIFICATION_MAX_ATTEMPTS);
  const transportConfig = getEmailTransportConfig();

  const deliveries = await notificationRepository.listDueEmailDeliveries(executor, maxAttempts);

  let processed = 0;
  for (const delivery of deliveries) {
    processed += 1;

    if (!transportConfig.configured) {
      await notificationRepository.deferEmailDelivery(
        executor,
        delivery.notification_delivery_id,
        transportConfig.reason,
        computeNextAttempt(delivery.attempt_count + 1)
      );
      continue;
    }

    try {
      await notificationRepository.markDeliveryProcessing(executor, delivery.notification_delivery_id);

      const providerMessageId = await sendEmailDelivery(delivery, transportConfig);

      await notificationRepository.markDeliverySent(executor, delivery.notification_delivery_id, providerMessageId);
    } catch (err) {
      const attemptCount = delivery.attempt_count + 1;
      const exhausted = attemptCount >= Math.min(maxAttempts, delivery.max_attempts);
      await notificationRepository.markDeliveryFailed(
        executor,
        delivery.notification_delivery_id,
        exhausted ? 'failed' : 'pending',
        attemptCount,
        err.message,
        computeNextAttempt(attemptCount)
      );
    }
  }

  return processed;
}

function startNotificationQueue({ pool: notificationPool = pool }) {
  const intervalMinutes = Number(
    process.env.NOTIFICATION_QUEUE_INTERVAL_MINUTES || DEFAULT_NOTIFICATION_QUEUE_INTERVAL_MINUTES
  );
  if (!Number.isFinite(intervalMinutes) || intervalMinutes <= 0) {
    return () => {};
  }

  const runSweep = async () => {
    try {
      await runExclusiveJob({
        pool: notificationPool,
        jobName: 'notification_queue',
        task: () => processNotificationQueue(notificationPool),
      });
    } catch (err) {
      console.error('[notifications] Failed to process notification queue:', err.message);
    }
  };

  if (String(process.env.NOTIFICATION_QUEUE_ON_START || 'true').toLowerCase() !== 'false') {
    runSweep();
  }

  const timer = setInterval(runSweep, intervalMinutes * 60 * 1000);
  if (typeof timer.unref === 'function') {
    timer.unref();
  }

  return () => clearInterval(timer);
}

module.exports = {
  DEFAULT_NOTIFICATION_MAX_ATTEMPTS,
  DEFAULT_NOTIFICATION_QUEUE_INTERVAL_MINUTES,
  getEmailTransportConfig,
  processNotificationQueue,
  runExclusiveJob,
  startNotificationQueue,
};
