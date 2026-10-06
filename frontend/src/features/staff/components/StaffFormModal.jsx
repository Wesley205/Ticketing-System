import { useEffect, useState } from 'react';
import { Button } from '../../../components/forms/Button.jsx';
import { FormField } from '../../../components/forms/FormField.jsx';
import { Modal } from '../../../components/modals/Modal.jsx';
import { normalizeApiError } from '../../../lib/error-handling.js';
import { getRoleLabel, getUserTypeLabel, isTemporaryUser } from '../services/staff-api.js';

function buildInitialState(user) {
  return {
    full_name: user?.full_name || '',
    email: user?.email || '',
    username: user?.username || '',
    password: '',
    role: user?.role || 'staff',
    user_type: user?.user_type || 'employee',
    department_id: user?.department_id || '',
    floor_id: user?.floor_id || '',
    technician_availability: user?.technician_availability || 'available',
    technician_capacity: user?.technician_capacity || 8,
    phone: user?.phone || '',
    account_start_date: user?.account_start_date ? String(user.account_start_date).slice(0, 10) : '',
    account_expiration_date: user?.account_expiration_date ? String(user.account_expiration_date).slice(0, 10) : '',
    sponsor_name: user?.sponsor_name || '',
    supervisor_user_id: user?.supervisor_user_id || '',
  };
}

export function StaffFormModal({
  open,
  user = null,
  lookups,
  onClose,
  onSubmit,
  isSubmitting = false,
}) {
  const [form, setForm] = useState(buildInitialState(user));
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setForm(buildInitialState(user));
    setErrorMessage('');
  }, [open, user]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function selectSponsorOfficer(officer) {
    setForm((current) => ({
      ...current,
      sponsor_name: officer.full_name || officer.username || '',
      supervisor_user_id: officer.user_id || '',
    }));
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
    if (!user && !form.username.trim()) {
      setErrorMessage('Username is required.');
      return;
    }
    if (!user && !form.password.trim()) {
      setErrorMessage('Password is required.');
      return;
    }
    if (isTemporaryUser(form.user_type) && !form.account_expiration_date) {
      setErrorMessage('Temporary users require an account expiration date.');
      return;
    }
    if (isTemporaryUser(form.user_type) && !form.supervisor_user_id) {
      setErrorMessage('Select an ICT officer sponsor or supervisor.');
      return;
    }

    setErrorMessage('');

    try {
      await onSubmit({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        username: form.username.trim() || undefined,
        password: form.password || undefined,
        role: form.role,
        user_type: form.user_type,
        department_id: form.department_id || null,
        floor_id: form.role === 'technician' ? form.floor_id || null : null,
        technician_availability: form.role === 'technician' ? form.technician_availability : 'available',
        technician_capacity: form.role === 'technician' ? Number(form.technician_capacity) : 8,
        phone: form.phone.trim() || null,
        account_start_date: form.account_start_date || null,
        account_expiration_date: form.account_expiration_date || null,
        sponsor_name: form.sponsor_name.trim() || null,
        supervisor_user_id: form.supervisor_user_id || null,
      });
      onClose();
    } catch (error) {
      setErrorMessage(normalizeApiError(error, 'Failed to save the staff account.').message);
    }
  }

  return (
    <Modal
      open={open}
      title={user ? `Edit Account - ${user.full_name}` : 'Create Account'}
      onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => document.getElementById('staff-form-submit')?.click()} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Account'}
          </Button>
        </>
      )}
    >
      <form className="ui-stack-md" onSubmit={handleSubmit}>
        <FormField label="Full Name" htmlFor="staff-full-name" error={errorMessage}>
          <input id="staff-full-name" className="ui-input" value={form.full_name} onChange={(event) => updateField('full_name', event.target.value)} />
        </FormField>

        <div className="ui-grid-2">
          <FormField label="Email" htmlFor="staff-email">
            <input id="staff-email" type="email" className="ui-input" value={form.email} onChange={(event) => updateField('email', event.target.value)} />
          </FormField>
          <FormField label="Username" htmlFor="staff-username">
            <input id="staff-username" className="ui-input" value={form.username} disabled={Boolean(user)} onChange={(event) => updateField('username', event.target.value)} />
          </FormField>
        </div>

        {!user ? (
          <FormField label="Password" htmlFor="staff-password" hint="Backend password policy remains enforced.">
            <input id="staff-password" type="password" className="ui-input" value={form.password} onChange={(event) => updateField('password', event.target.value)} />
          </FormField>
        ) : null}

        <div className="ui-grid-2">
          <FormField label="Role" htmlFor="staff-role">
            <select id="staff-role" className="ui-input" value={form.role} onChange={(event) => updateField('role', event.target.value)}>
              {(lookups.roles || []).map((role) => (
                <option key={role} value={role}>{getRoleLabel(role)}</option>
              ))}
            </select>
          </FormField>
          <FormField label="User Type" htmlFor="staff-user-type">
            <select id="staff-user-type" className="ui-input" value={form.user_type} onChange={(event) => updateField('user_type', event.target.value)}>
              {(lookups.user_types || []).map((userType) => (
                <option key={userType} value={userType}>{getUserTypeLabel(userType)}</option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="ui-grid-2">
          <FormField label="Department" htmlFor="staff-department">
            <select id="staff-department" className="ui-input" value={form.department_id} onChange={(event) => updateField('department_id', event.target.value)}>
              <option value="">No department</option>
              {(lookups.departments || []).map((department) => (
                <option key={department.department_id} value={department.department_id}>{department.name}</option>
              ))}
            </select>
          </FormField>
          {form.role === 'technician' ? (
            <FormField label="Assigned Floor" htmlFor="staff-floor" hint="Used to suggest technicians for same-floor tickets.">
              <select id="staff-floor" className="ui-input" value={form.floor_id} onChange={(event) => updateField('floor_id', event.target.value)}>
                <option value="">No floor assigned</option>
                {(lookups.floors || []).map((floor) => (
                  <option key={floor.floor_id} value={floor.floor_id}>{floor.floor_label}</option>
                ))}
              </select>
            </FormField>
          ) : (
            <FormField label="Phone" htmlFor="staff-phone">
              <input id="staff-phone" className="ui-input" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} />
            </FormField>
          )}
        </div>

        {form.role === 'technician' ? (
          <div className="ui-grid-2">
            <FormField label="Availability" htmlFor="staff-technician-availability" hint="Used by assignment recommendations.">
              <select id="staff-technician-availability" className="ui-input" value={form.technician_availability} onChange={(event) => updateField('technician_availability', event.target.value)}>
                <option value="available">Available</option>
                <option value="busy">Busy</option>
                <option value="away">Away</option>
                <option value="on_leave">On leave</option>
                <option value="offline">Offline</option>
              </select>
            </FormField>
            <FormField label="Active Ticket Capacity" htmlFor="staff-technician-capacity" hint="Recommended maximum active workload.">
              <input id="staff-technician-capacity" type="number" min="1" max="50" className="ui-input" value={form.technician_capacity} onChange={(event) => updateField('technician_capacity', event.target.value)} />
            </FormField>
            <FormField label="Phone" htmlFor="staff-phone">
              <input id="staff-phone" className="ui-input" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} />
            </FormField>
          </div>
        ) : null}

        <div className="ui-grid-2">
          <FormField label="Account Start Date" htmlFor="staff-start-date">
            <input id="staff-start-date" type="date" className="ui-input" value={form.account_start_date} onChange={(event) => updateField('account_start_date', event.target.value)} />
          </FormField>
          <FormField label="Account Expiration Date" htmlFor="staff-expiry-date" hint={isTemporaryUser(form.user_type) ? 'Required for temporary users.' : null}>
            <input id="staff-expiry-date" type="date" className="ui-input" value={form.account_expiration_date} onChange={(event) => updateField('account_expiration_date', event.target.value)} />
          </FormField>
        </div>

        {isTemporaryUser(form.user_type) ? (
          <FormField label="ICT Officer Sponsor" htmlFor="staff-sponsor-officer" error={errorMessage}>
            <section id="staff-sponsor-officer" className="assignment-technician-list" aria-label="ICT officer sponsors">
              {(lookups.ict_officers || []).map((officer) => {
                const selected = String(form.supervisor_user_id) === String(officer.user_id);
                return (
                  <button
                    type="button"
                    key={officer.user_id}
                    className={selected ? 'assignment-technician-option active' : 'assignment-technician-option'}
                    onClick={() => selectSponsorOfficer(officer)}
                  >
                    <span aria-hidden="true" />
                    <strong>{officer.full_name || officer.username}</strong>
                    <small>{officer.email || 'ICT officer'}</small>
                    <b>ICT Officer</b>
                  </button>
                );
              })}
              {!(lookups.ict_officers || []).length ? (
                <p className="react-copy">No ICT officers are available for sponsorship.</p>
              ) : null}
            </section>
          </FormField>
        ) : null}

        <button id="staff-form-submit" type="submit" hidden />
      </form>
    </Modal>
  );
}
