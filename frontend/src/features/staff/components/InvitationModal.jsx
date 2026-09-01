import { useEffect, useState } from 'react';
import { Button } from '../../../components/forms/Button.jsx';
import { FormField } from '../../../components/forms/FormField.jsx';
import { Modal } from '../../../components/modals/Modal.jsx';
import { normalizeApiError } from '../../../lib/error-handling.js';
import { getRoleLabel, getUserTypeLabel, isTemporaryUser } from '../services/staff-api.js';

const defaultAcceptance = {
  url: '',
  email: '',
};

export function InvitationModal({
  open,
  lookups,
  onClose,
  onSubmit,
  isSubmitting = false,
}) {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    preferred_username: '',
    role: 'staff',
    user_type: 'employee',
    department_id: '',
    account_start_date: '',
    account_expiration_date: '',
    expires_in_days: 7,
    sponsor_name: '',
    supervisor_user_id: '',
  });
  const [acceptance, setAcceptance] = useState(defaultAcceptance);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (open) {
      setForm({
        full_name: '',
        email: '',
        preferred_username: '',
        role: 'staff',
        user_type: 'employee',
        department_id: '',
        account_start_date: '',
        account_expiration_date: '',
        expires_in_days: 7,
        sponsor_name: '',
        supervisor_user_id: '',
      });
      setAcceptance(defaultAcceptance);
      setErrorMessage('');
    }
  }, [open]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.full_name.trim()) {
      setErrorMessage('Full name is required.');
      return;
    }
    if (!form.email.trim()) {
      setErrorMessage('Email is required.');
      return;
    }
    if (isTemporaryUser(form.user_type) && !form.account_expiration_date) {
      setErrorMessage('Temporary-user invitations require an account expiration date.');
      return;
    }
    if (isTemporaryUser(form.user_type) && !form.sponsor_name.trim()) {
      setErrorMessage('Temporary-user invitations require a sponsor or supervisor.');
      return;
    }

    setErrorMessage('');

    try {
      const created = await onSubmit({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        preferred_username: form.preferred_username.trim() || null,
        role: form.role,
        user_type: form.user_type,
        department_id: form.department_id || null,
        account_start_date: form.account_start_date || null,
        account_expiration_date: form.account_expiration_date || null,
        expires_in_days: Number(form.expires_in_days) || 7,
        sponsor_name: form.sponsor_name.trim() || null,
        supervisor_user_id: form.supervisor_user_id || null,
      });

      setAcceptance({
        url: created.acceptance_url || '',
        email: created.email || form.email.trim(),
      });
    } catch (error) {
      setErrorMessage(normalizeApiError(error, 'Failed to create the invitation.').message);
    }
  }

  return (
    <Modal
      open={open}
      title="Issue Invitation"
      onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button onClick={() => document.getElementById('invitation-form-submit')?.click()} disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Invitation'}
          </Button>
        </>
      )}
    >
      <form className="ui-stack-md" onSubmit={handleSubmit}>
        <FormField label="Full Name" htmlFor="invite-full-name" error={errorMessage}>
          <input id="invite-full-name" className="ui-input" value={form.full_name} onChange={(event) => updateField('full_name', event.target.value)} />
        </FormField>

        <div className="ui-grid-2">
          <FormField label="Email" htmlFor="invite-email">
            <input id="invite-email" type="email" className="ui-input" value={form.email} onChange={(event) => updateField('email', event.target.value)} />
          </FormField>
          <FormField label="Preferred Username" htmlFor="invite-username">
            <input id="invite-username" className="ui-input" value={form.preferred_username} onChange={(event) => updateField('preferred_username', event.target.value)} />
          </FormField>
        </div>

        <div className="ui-grid-2">
          <FormField label="Role" htmlFor="invite-role">
            <select id="invite-role" className="ui-input" value={form.role} onChange={(event) => updateField('role', event.target.value)}>
              {(lookups.roles || []).map((role) => (
                <option key={role} value={role}>{getRoleLabel(role)}</option>
              ))}
            </select>
          </FormField>
          <FormField label="User Type" htmlFor="invite-user-type">
            <select id="invite-user-type" className="ui-input" value={form.user_type} onChange={(event) => updateField('user_type', event.target.value)}>
              {(lookups.user_types || []).map((userType) => (
                <option key={userType} value={userType}>{getUserTypeLabel(userType)}</option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="ui-grid-2">
          <FormField label="Department" htmlFor="invite-department">
            <select id="invite-department" className="ui-input" value={form.department_id} onChange={(event) => updateField('department_id', event.target.value)}>
              <option value="">No department</option>
              {(lookups.departments || []).map((department) => (
                <option key={department.department_id} value={department.department_id}>{department.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Expires In (days)" htmlFor="invite-expiry-days">
            <input id="invite-expiry-days" type="number" min="1" className="ui-input" value={form.expires_in_days} onChange={(event) => updateField('expires_in_days', event.target.value)} />
          </FormField>
        </div>

        <div className="ui-grid-2">
          <FormField label="Account Start Date" htmlFor="invite-start-date">
            <input id="invite-start-date" type="date" className="ui-input" value={form.account_start_date} onChange={(event) => updateField('account_start_date', event.target.value)} />
          </FormField>
          <FormField label="Account Expiration Date" htmlFor="invite-account-expiry">
            <input id="invite-account-expiry" type="date" className="ui-input" value={form.account_expiration_date} onChange={(event) => updateField('account_expiration_date', event.target.value)} />
          </FormField>
        </div>

        <div className="ui-grid-2">
          <FormField label="Sponsor Or Supervisor" htmlFor="invite-sponsor">
            <input id="invite-sponsor" className="ui-input" value={form.sponsor_name} onChange={(event) => updateField('sponsor_name', event.target.value)} />
          </FormField>
          <FormField label="Supervisor User ID" htmlFor="invite-supervisor-id">
            <input id="invite-supervisor-id" className="ui-input" value={form.supervisor_user_id} onChange={(event) => updateField('supervisor_user_id', event.target.value)} />
          </FormField>
        </div>

        {acceptance.url ? (
          <div className="react-panel">
            <strong>Invitation created for {acceptance.email}</strong>
            <p className="react-copy">The backend returned an activation link for manual delivery or verification.</p>
            <textarea className="ui-input" rows={3} readOnly value={acceptance.url} />
          </div>
        ) : null}

        <button id="invitation-form-submit" type="submit" hidden />
      </form>
    </Modal>
  );
}
