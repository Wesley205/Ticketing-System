import { useMemo, useState } from 'react';
import { Button } from '../../../components/forms/Button.jsx';
import { ErrorState } from '../../../components/feedback/ErrorState.jsx';
import { LoadingState } from '../../../components/feedback/LoadingState.jsx';
import { PageHero } from '../../../components/layout/PageHero.jsx';
import { Panel } from '../../../components/layout/Panel.jsx';
import { Pagination } from '../../../components/tables/Pagination.jsx';
import { useToast } from '../../../hooks/useToast.js';
import { formatDate } from '../../../lib/formatting.js';
import { useAuth } from '../../auth/hooks/useAuth.js';
import { InvitationList } from '../components/InvitationList.jsx';
import { InvitationModal } from '../components/InvitationModal.jsx';
import { StaffDetailPanel } from '../components/StaffDetailPanel.jsx';
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
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const selectedUser = useMemo(
    () => staffState.staff.find((row) => Number(row.user_id) === Number(selectedUserId)) || staffState.staff[0] || null,
    [selectedUserId, staffState.staff]
  );

  return (
    <div className="ui-stack-lg">
      <PageHero
        eyebrow="Phase 7"
        title="Staff Management"
        description="Account lifecycle, internal directory visibility, and administrator-issued invitations now run inside the React shell."
        meta={[
          auth.accessProfile?.role_label || 'User',
          `${staffState.totalStaff} visible accounts`,
          canManage ? 'Admin controls enabled' : 'Read-only directory access',
        ]}
      />

      <Panel
        title="Directory"
        actions={(
          <div className="ui-inline-actions">
            <Button variant="secondary" onClick={() => staffState.loadStaff(staffState.filters)}>Refresh</Button>
            {canManage ? (
              <>
                <Button variant="secondary" onClick={() => setInviteOpen(true)}>Issue Invitation</Button>
                <Button onClick={() => {
                  setEditingUser(null);
                  setFormOpen(true);
                }}
                >
                  Add Account
                </Button>
              </>
            ) : null}
          </div>
        )}
      >
        <div className="ui-grid-2 asset-filter-grid">
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
        </div>
      </Panel>

      {staffState.error ? (
        <ErrorState title="Staff directory unavailable" description={staffState.error} onRetry={() => staffState.loadStaff(staffState.filters)} />
      ) : null}

      <div className="service-grid-react">
        <Panel title="Staff Directory">
          {staffState.isLoading ? (
            <LoadingState description="Loading staff directory..." />
          ) : (
            <div className="ui-stack-md">
              <StaffList
                rows={staffState.staff}
                canManage={canManage}
                onSelect={(row) => setSelectedUserId(row.user_id)}
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
        </Panel>

        <StaffDetailPanel user={selectedUser} />
      </div>

      {canManage ? (
        <Panel
          title="Pending Invitations"
          actions={(
            <div className="ui-inline-actions">
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
              <Button variant="secondary" onClick={() => invitationsState.loadInvitations(invitationsState.statusFilter)}>Refresh</Button>
            </div>
          )}
        >
          {invitationsState.error ? (
            <ErrorState title="Invitations unavailable" description={invitationsState.error} onRetry={() => invitationsState.loadInvitations(invitationsState.statusFilter)} />
          ) : invitationsState.isLoading ? (
            <LoadingState description="Loading invitations..." />
          ) : (
            <InvitationList
              rows={invitationsState.invitations}
              onRevoke={async (row) => {
                await invitationsState.revoke(row.invitation_id);
                showToast({ tone: 'success', title: 'Invitation revoked' });
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
          setSelectedUserId(created.user_id);
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
  );
}
