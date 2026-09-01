import { DetailPanel } from '../../../components/status/DetailPanel.jsx';
import { StatusBadge } from '../../../components/status/StatusBadge.jsx';
import { formatDate, formatDateTime } from '../../../lib/formatting.js';
import { getRoleLabel, getUserTypeLabel } from '../services/staff-api.js';

export function StaffDetailPanel({ user }) {
  if (!user) {
    return (
      <DetailPanel title="Staff Detail">
        <p className="react-copy">Select a staff member to inspect account lifecycle, department, and access context.</p>
      </DetailPanel>
    );
  }

  return (
    <DetailPanel
      title={user.full_name}
      aside={<StatusBadge value={user.is_active ? (user.account_status || 'active') : 'inactive'} />}
    >
      <div className="ticket-kpi-grid">
        <div className="ticket-kpi-card"><span>Role</span><strong>{getRoleLabel(user.role)}</strong></div>
        <div className="ticket-kpi-card"><span>User Type</span><strong>{getUserTypeLabel(user.user_type)}</strong></div>
        <div className="ticket-kpi-card"><span>Department</span><strong>{user.department_name || '-'}</strong></div>
        <div className="ticket-kpi-card"><span>Username</span><strong>{user.username || '-'}</strong></div>
      </div>

      <div className="ticket-meta-grid">
        <div><strong>Email</strong><span>{user.email || '-'}</span></div>
        <div><strong>Phone</strong><span>{user.phone || '-'}</span></div>
        <div><strong>Created</strong><span>{formatDateTime(user.created_at)}</span></div>
        <div><strong>Last Login</strong><span>{formatDateTime(user.last_login_at)}</span></div>
        <div><strong>Account Start</strong><span>{formatDate(user.account_start_date)}</span></div>
        <div><strong>Account Expiry</strong><span>{formatDate(user.account_expiration_date)}</span></div>
        <div><strong>Sponsor</strong><span>{user.sponsor_name || '-'}</span></div>
        <div><strong>Deactivation Reason</strong><span>{user.deactivation_reason || '-'}</span></div>
      </div>
    </DetailPanel>
  );
}
