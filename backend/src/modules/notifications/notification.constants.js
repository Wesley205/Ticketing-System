const { NOTIFICATION_TYPES } = require('../../shared/constants/domain');

const NOTIFICATION_EVENT_TYPES = {
  ticket_assigned: { category: 'assignment', critical: true, supportsEmail: true, severity: 'info' },
  ticket_updated: { category: 'status_change', critical: false, supportsEmail: true, severity: 'info' },
  ticket_resolved: { category: 'status_change', critical: false, supportsEmail: true, severity: 'success' },
  ticket_comment: { category: 'comment', critical: false, supportsEmail: true, severity: 'info' },
  ticket_attachment: { category: 'attachment', critical: false, supportsEmail: true, severity: 'info' },
  ticket_sla_warning: { category: 'sla', critical: true, supportsEmail: true, severity: 'warning' },
  ticket_overdue: { category: 'sla', critical: true, supportsEmail: true, severity: 'warning' },
  ticket_escalated: { category: 'sla', critical: true, supportsEmail: true, severity: 'error' },
  approval_requested: { category: 'system', critical: true, supportsEmail: true, severity: 'warning' },
  approval_approved: { category: 'system', critical: false, supportsEmail: true, severity: 'success' },
  approval_rejected: { category: 'system', critical: true, supportsEmail: true, severity: 'error' },
  maintenance_created: { category: 'maintenance', critical: false, supportsEmail: true, severity: 'info' },
  maintenance_completed: { category: 'maintenance', critical: false, supportsEmail: true, severity: 'success' },
  maintenance_due: { category: 'maintenance', critical: true, supportsEmail: true, severity: 'warning' },
  invitation_created: { category: 'system', critical: false, supportsEmail: true, severity: 'info' },
  account_expiry: { category: 'system', critical: true, supportsEmail: true, severity: 'warning' },
  system: { category: 'system', critical: false, supportsEmail: false, severity: 'info' },
};

const PREFERENCE_FIELDS = [
  'in_app_enabled',
  'email_enabled',
  'browser_push_enabled',
  'assignment_enabled',
  'status_change_enabled',
  'maintenance_enabled',
  'comment_enabled',
  'attachment_enabled',
  'sla_enabled',
  'system_enabled',
];

const PREFERENCE_COLUMN_BY_CATEGORY = {
  assignment: 'assignment_enabled',
  status_change: 'status_change_enabled',
  comment: 'comment_enabled',
  attachment: 'attachment_enabled',
  sla: 'sla_enabled',
  maintenance: 'maintenance_enabled',
  system: 'system_enabled',
};

const NOTIFICATION_ERROR_MESSAGES = {
  countFailed: 'Failed to load notification count.',
  invalidPreferences: 'Invalid notification preference payload.',
  listFailed: 'Failed to load notifications.',
  notFound: 'Notification not found.',
  preferencesFailed: 'Failed to load notification preferences.',
  preferencesUpdateFailed: 'Failed to update notification preferences.',
  readAllFailed: 'Failed to mark notifications as read.',
  readFailed: 'Failed to update notification.',
  browserPushUnavailable: 'Browser push notifications are not configured.',
  browserSubscriptionFailed: 'Failed to save browser notification subscription.',
  browserSubscriptionDeleteFailed: 'Failed to disable browser notification subscription.',
  browserSubscriptionListFailed: 'Failed to load browser notification devices.',
  browserTestFailed: 'Failed to send browser test notification.',
};

module.exports = {
  NOTIFICATION_ERROR_MESSAGES,
  NOTIFICATION_EVENT_TYPES,
  NOTIFICATION_TYPES,
  PREFERENCE_COLUMN_BY_CATEGORY,
  PREFERENCE_FIELDS,
};
