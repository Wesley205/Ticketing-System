const { canViewNotification } = require('../../authorization/resourceAccess');

function getDefaultPreferenceRow(userId) {
  return {
    user_id: userId,
    in_app_enabled: true,
    email_enabled: false,
    assignment_enabled: true,
    status_change_enabled: true,
    maintenance_enabled: true,
    comment_enabled: true,
    attachment_enabled: true,
    sla_enabled: true,
    system_enabled: true,
  };
}

function shouldDeliverForChannel(eventConfig, preferences, channel) {
  const {
    PREFERENCE_COLUMN_BY_CATEGORY,
  } = require('./notification.constants');
  const prefs = preferences || getDefaultPreferenceRow(null);
  const categoryColumn = PREFERENCE_COLUMN_BY_CATEGORY[eventConfig.category];
  const categoryEnabled = categoryColumn ? prefs[categoryColumn] !== false : true;

  if (channel === 'in_app') {
    if (eventConfig.critical) return true;
    return prefs.in_app_enabled !== false && categoryEnabled;
  }

  if (channel === 'email') {
    if (!eventConfig.supportsEmail) return false;
    if (prefs.email_enabled !== true) return false;
    return eventConfig.critical ? true : categoryEnabled;
  }

  return false;
}

function canAccessNotification(user, notification) {
  if (!notification) return false;
  return canViewNotification(user, {
    ...notification,
    user_id: notification.user_id ?? notification.recipient_user_id,
  });
}

module.exports = {
  canAccessNotification,
  getDefaultPreferenceRow,
  shouldDeliverForChannel,
};
