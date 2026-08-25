const express = require('express');
const { body, validationResult } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const {
  countUnreadNotifications,
  getNotificationPreferences,
  listUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPreferences,
} = require('../utils/notificationService');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const notifications = await listUserNotifications(req.user.user_id, req.query);
    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load notifications.' });
  }
});

router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const unread_count = await countUnreadNotifications(req.user.user_id);
    res.json({ unread_count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load notification count.' });
  }
});

router.post('/:id/read', requireAuth, async (req, res) => {
  try {
    const result = await markNotificationRead(req.user.user_id, req.params.id);
    if (!result) {
      return res.status(404).json({ error: 'Notification not found.' });
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update notification.' });
  }
});

router.post('/read-all', requireAuth, async (req, res) => {
  try {
    const updated = await markAllNotificationsRead(req.user.user_id);
    res.json({ updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to mark notifications as read.' });
  }
});

router.get('/preferences/me', requireAuth, async (req, res) => {
  try {
    const preferences = await getNotificationPreferences(req.user.user_id);
    res.json(preferences);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load notification preferences.' });
  }
});

router.patch(
  '/preferences/me',
  requireAuth,
  [
    body('in_app_enabled').optional().isBoolean(),
    body('email_enabled').optional().isBoolean(),
    body('assignment_enabled').optional().isBoolean(),
    body('status_change_enabled').optional().isBoolean(),
    body('maintenance_enabled').optional().isBoolean(),
    body('comment_enabled').optional().isBoolean(),
    body('attachment_enabled').optional().isBoolean(),
    body('sla_enabled').optional().isBoolean(),
    body('system_enabled').optional().isBoolean(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid notification preference payload.' });
    }

    try {
      const preferences = await updateNotificationPreferences(req.user.user_id, req.body);
      res.json(preferences);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update notification preferences.' });
    }
  }
);

module.exports = router;
