import { useState } from 'react';
import { Button } from '../../../components/forms/Button.jsx';
import { ErrorState } from '../../../components/feedback/ErrorState.jsx';
import { LoadingState } from '../../../components/feedback/LoadingState.jsx';
import { Panel } from '../../../components/layout/Panel.jsx';
import { SecureWorkspaceLayout } from '../../../components/layout/SecureWorkspaceLayout.jsx';
import { Pagination } from '../../../components/tables/Pagination.jsx';
import { useToast } from '../../../hooks/useToast.js';
import { formatDate } from '../../../lib/formatting.js';
import { useAuth } from '../../auth/hooks/useAuth.js';
import { InvitationList } from '../components/InvitationList.jsx';
import { InvitationModal } from '../components/InvitationModal.jsx';
import { StaffFormModal } from '../components/StaffFormModal.jsx';
import { StaffList } from '../components/StaffList.jsx';
import { useInvitations } from '../hooks/useInvitations.js';
import { useStaff } from '../hooks/useStaff.js';
import { extendTemporaryAccount, updateStaff, updateStaffStatus } from '../services/staff-api.js';

export function StaffPage() {
  const auth = useAuth();
  const { showToast } = useToast();
  const staffState = useStaff();
  const canManage = auth.accessProfile?.permissions?.can_manage_users === true || auth.user?.role === 'admin';
  const invitationsState = useInvitations({ enabled: canManage || auth.accessProfile?.permissions?.can_create_invitation === true });
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <SecureWorkspaceLayout title="Staff & Access Control Hub" subtitle="ICT Service Hub">
      <div className="staff-secure-page secure-registry-page">
        <div className="service-desk-secure-head">
          <div>
            <h2>Staff Directory</h2>
            <p>Account lifecycle, internal directory visibility, and administrator-issued invitations.</p>
          </div>
          <div className="service-desk-secure-actions responsive-action-row">
            <Button size="sm" variant="secondary" onClick={() => staffState.loadStaff(staffState.filters)}>Refresh</Button>
            {canManage ? (
              <>
                <Button size="sm" variant="secondary" onClick={() => setInviteOpen(true)}>Invite Staff</Button>
                <Button size="sm" onClick={() => {
                  setEditingUser(null);
                  setFormOpen(true);
                }}
                >
                  Add Account
                </Button>
              </>
            ) : null}
          </div>
        </div>

      <div className="staff-secure-layout">
        <section className="secure-data-panel">
        <div className="staff-filter-row responsive-filter-grid">
          <input
            className="ui-input"
            placeholder="Search name, email, username..."
            value={staffState.filters.search}
            onChange={(event) => staffState.updateFilter('search', event.target.value)}
          />
          <select
            className="ui-input"
            value={staffState.filters.role}
            onChange={(event) => staffState.updateFilter('role', event.target.value)}
          >
            <option value="">All roles</option>
            {staffState.lookups.roles.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
          <select
            className="ui-input"
            value={staffState.filters.user_type}
            onChange={(event) => staffState.updateFilter('user_type', event.target.value)}
          >
            <option value="">All user types</option>
            {staffState.lookups.user_types.map((userType) => (
              <option key={userType} value={userType}>{userType}</option>
            ))}
          </select>
          <select
            className="ui-input"
            value={staffState.filters.department_id}
            onChange={(event) => staffState.updateFilter('department_id', event.target.value)}
          >
            <option value="">All departments</option>
            {staffState.lookups.departments.map((department) => (
              <option key={department.department_id} value={department.department_id}>{department.name}</option>
            ))}
          </select>
          <span className="secure-count-chip">{staffState.totalStaff} Active Profiles</span>
        </div>

      {staffState.error ? (
        <ErrorState title="Staff directory unavailable" description={staffState.error} onRetry={() => staffState.loadStaff(staffState.filters)} />
      ) : null}

          {staffState.isLoading ? (
            <LoadingState variant="table" description="Loading staff directory..." />
          ) : (
            <div className="ui-stack-md">
              <StaffList
                rows={staffState.staff}
                canManage={canManage}
                onEdit={(row) => {
                  setEditingUser(row);
                  setFormOpen(true);
                }}
                onToggleActive={async (row) => {
                  await updateStaffStatus(row.user_id, {
                    is_active: !row.is_active,
                    deactivation_reason: row.is_active ? 'Deactivated during React admin verification' : null,
                  });
                  await staffState.loadStaff(staffState.filters);
                  showToast({ tone: 'success', title: row.is_active ? 'Account deactivated' : 'Account activated' });
                }}
                onExtend={async (row) => {
                  const nextDate = row.account_expiration_date || '2026-12-31';
                  await extendTemporaryAccount(row.user_id, { account_expiration_date: nextDate });
                  await staffState.loadStaff(staffState.filters);
                  showToast({ tone: 'success', title: `Account extended to ${formatDate(nextDate)}` });
                }}
              />
              <Pagination
                page={staffState.pagination.page}
                totalPages={staffState.pagination.totalPages}
                onPrevious={() => staffState.setPage(staffState.pagination.page - 1)}
                onNext={() => staffState.setPage(staffState.pagination.page + 1)}
              />
            </div>
          )}
        </section>
      </div>

      {canManage ? (
        <Panel
          title="Pending Invitations"
          actions={(
            <div className="ui-inline-actions responsive-action-row">
              <select
                className="ui-input staff-invitation-filter"
                value={invitationsState.statusFilter}
                onChange={(event) => invitationsState.setStatusFilter(event.target.value)}
              >
                <option value="">All statuses</option>
                {invitationsState.invitationStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <Button size="sm" variant="secondary" onClick={() => invitationsState.loadInvitations(invitationsState.statusFilter)}>Refresh</Button>
            </div>
          )}
        >
          {invitationsState.error ? (
            <ErrorState title="Invitations unavailable" description={invitationsState.error} onRetry={() => invitationsState.loadInvitations(invitationsState.statusFilter)} />
          ) : invitationsState.isLoading ? (
            <LoadingState variant="table" description="Loading invitations..." />
          ) : (
            <InvitationList
              rows={invitationsState.invitations}
              onRevoke={async (row) => {
                await invitationsState.revoke(row.invitation_id);
                showToast({ tone: 'success', title: 'Invitation revoked' });
              }}
              onResend={async (row) => {
                await invitationsState.resend(row.invitation_id);
                showToast({ tone: 'success', title: 'Invitation email queued' });
              }}
            />
          )}
        </Panel>
      ) : null}

      <StaffFormModal
        open={formOpen}
        user={editingUser}
        lookups={staffState.lookups}
        onClose={() => setFormOpen(false)}
        isSubmitting={staffState.isSubmitting}
        onSubmit={async (payload) => {
          if (editingUser) {
            await updateStaff(editingUser.user_id, payload);
            await staffState.loadStaff(staffState.filters);
            showToast({ tone: 'success', title: 'Staff account updated' });
            return;
          }

          const created = await staffState.submitCreateStaff(payload);
          showToast({ tone: 'success', title: 'Staff account created' });
          return created;
        }}
      />

      <InvitationModal
        open={inviteOpen}
        lookups={staffState.lookups}
        onClose={() => setInviteOpen(false)}
        isSubmitting={invitationsState.isSubmitting}
        onSubmit={async (payload) => {
          const created = await invitationsState.submitInvitation(payload);
          showToast({ tone: 'success', title: 'Invitation created' });
          return created;
        }}
      />
      </div>
    </SecureWorkspaceLayout>
  );
}
