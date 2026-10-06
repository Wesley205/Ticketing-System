function mapNotificationRow(row) {
  return row || null;
}

function mapPreferenceRow(row) {
  return row || null;
}

function mapDeliveryTargetRow(row) {
  if (!row) return null;

  return {
    ...row,
    preferences: {
      in_app_enabled: row.in_app_enabled,
      email_enabled: row.email_enabled,
      browser_push_enabled: row.browser_push_enabled,
      assignment_enabled: row.assignment_enabled,
      status_change_enabled: row.status_change_enabled,
      maintenance_enabled: row.maintenance_enabled,
      comment_enabled: row.comment_enabled,
      attachment_enabled: row.attachment_enabled,
      sla_enabled: row.sla_enabled,
      system_enabled: row.system_enabled,
    },
  };
}

function mapBrowserSubscriptionRow(row) {
  if (!row) return null;
  return {
    browser_subscription_id: row.browser_subscription_id,
    endpoint: row.endpoint,
    user_agent: row.user_agent,
    is_active: row.is_active,
    last_used_at: row.last_used_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

module.exports = {
  mapBrowserSubscriptionRow,
  mapDeliveryTargetRow,
  mapNotificationRow,
  mapPreferenceRow,
};
