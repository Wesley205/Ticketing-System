import { DetailPanel } from '../../../components/status/DetailPanel.jsx';
import { StatusBadge } from '../../../components/status/StatusBadge.jsx';
import { Button } from '../../../components/forms/Button.jsx';
import { formatDate, formatDateTime } from '../../../lib/formatting.js';
import { getRoleLabel, getUserTypeLabel } from '../services/staff-api.js';

export function StaffDetailPanel({ user, canManage = false, invitations = [], onEdit, onToggleActive }) {
  if (!user) {
    return (
      <DetailPanel title="Staff Detail">
        <p className="react-copy">Select a staff member to inspect account lifecycle, department, and access context.</p>
      </DetailPanel>
    );
  }

  return (
    <DetailPanel title={user.full_name} aside={<StatusBadge value={user.is_active ? (user.account_status || 'active') : 'inactive'} />}>
      <div className="staff-profile-card">
        <div className="staff-profile-avatar" aria-hidden="true">
          {(user.full_name || user.username || 'U').slice(0, 1).toUpperCase()}
        </div>
        <div>
          <h3>{user.full_name}</h3>
          <small>ID: {user.staff_code || `NSC-${String(user.user_id).padStart(4, '0')}`}</small>
        </div>
      </div>

      <div className="secure-definition-grid">
        <div><span>Email address</span><strong>{user.email || '-'}</strong></div>
        <div><span>Role title</span><strong>{getRoleLabel(user.role)}</strong></div>
        <div><span>Department</span><strong>{user.department_name || '-'}</strong></div>
        <div><span>Appointment</span><strong>{getUserTypeLabel(user.user_type)}</strong></div>
        <div><span>Account expiration</span><strong>{formatDate(user.account_expiration_date) || 'Indefinite'}</strong></div>
        <div><span>Last login</span><strong>{formatDateTime(user.last_login_at)}</strong></div>
        <div><span>Account start</span><strong>{formatDate(user.account_start_date)}</strong></div>
        <div><span>Sponsor</span><strong>{user.sponsor_name || '-'}</strong></div>
      </div>

      <section className="staff-pending-invitations">
        <h4>Pending Invitations</h4>
        {invitations.length ? invitations.slice(0, 3).map((invite) => (
          <article key={invite.invitation_id || invite.email}>
            <strong>{invite.email}</strong>
            <span>{invite.role || '-'} / expires {formatDate(invite.expires_at)}</span>
          </article>
        )) : <p className="react-copy">No pending invitations linked to this profile.</p>}
      </section>

      {canManage ? (
        <div className="staff-detail-actions">
          <Button onClick={() => onEdit(user)}>Edit Profile</Button>
          <Button variant="secondary" onClick={() => onToggleActive(user)}>
            {user.is_active ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ) : null}
    </DetailPanel>
  );
}
