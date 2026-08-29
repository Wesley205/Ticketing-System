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

module.exports = {
  mapDeliveryTargetRow,
  mapNotificationRow,
  mapPreferenceRow,
};
