function mapStaffRow(row) {
  if (!row) return null;

  return {
    user_id: row.user_id,
    full_name: row.full_name,
    email: row.email,
    username: row.username,
    role: row.role,
    user_type: row.user_type,
    phone: row.phone,
    is_active: row.is_active,
    account_status: row.account_status,
    created_at: row.created_at,
    last_login_at: row.last_login_at,
    department_id: row.department_id,
    department_name: row.department_name,
    floor_id: row.floor_id,
    floor_label: row.floor_label,
    technician_availability: row.technician_availability,
    technician_capacity: Number(row.technician_capacity || 8),
    sponsor_name: row.sponsor_name,
    account_start_date: row.account_start_date,
    account_expiration_date: row.account_expiration_date,
    deactivated_at: row.deactivated_at,
    deactivation_reason: row.deactivation_reason,
  };
}

function mapTechnicianRow(row) {
  if (!row) return null;
  return {
    user_id: row.user_id,
    full_name: row.full_name,
    email: row.email,
    username: row.username,
    floor_id: row.floor_id,
    floor_label: row.floor_label,
    technician_availability: row.technician_availability || 'available',
    technician_capacity: Number(row.technician_capacity || 8),
    active_count: Number(row.active_count || 0),
  };
}

module.exports = {
  mapStaffRow,
  mapTechnicianRow,
};
