import { useEffect, useState } from 'react';
import { Button } from '../../../components/forms/Button.jsx';
import { FormField } from '../../../components/forms/FormField.jsx';
import { Modal } from '../../../components/modals/Modal.jsx';
import { normalizeApiError } from '../../../lib/error-handling.js';

function buildInitialState(asset) {
  return {
    asset_tag: asset?.asset_tag || '',
    asset_type: asset?.asset_type || 'Laptop',
    brand: asset?.brand || '',
    model: asset?.model || '',
    serial_number: asset?.serial_number || '',
    department_id: asset?.department_id || '',
    assigned_to: asset?.assigned_to || '',
    purchase_date: asset?.purchase_date ? String(asset.purchase_date).slice(0, 10) : '',
    condition: asset?.condition || 'Good',
    status: asset?.status || 'Available',
    location: asset?.location || '',
    description: asset?.description || '',
    assignment_notes: '',
    expected_return_at: '',
  };
}

export function AssetFormModal({
  open,
  asset = null,
  lookups,
  onClose,
  onSubmit,
  isSubmitting = false,
}) {
  const [form, setForm] = useState(buildInitialState(asset));
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setForm(buildInitialState(asset));
    setErrorMessage('');
  }, [asset, open]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.asset_tag.trim()) {
      setErrorMessage('Asset tag is required.');
      return;
    }

    if (!form.asset_type) {
      setErrorMessage('Asset type is required.');
      return;
    }

    setErrorMessage('');

    try {
      await onSubmit({
        asset_tag: form.asset_tag.trim(),
        asset_type: form.asset_type,
        brand: form.brand.trim() || null,
        model: form.model.trim() || null,
        serial_number: form.serial_number.trim() || null,
        department_id: form.department_id || null,
        assigned_to: form.assigned_to || null,
        purchase_date: form.purchase_date || null,
        condition: form.condition || null,
        status: form.status || null,
        location: form.location.trim() || null,
        description: form.description.trim() || null,
        assignment_notes: form.assignment_notes.trim() || null,
        expected_return_at: form.expected_return_at || null,
      });
      onClose();
    } catch (error) {
      setErrorMessage(normalizeApiError(error, 'Failed to save the asset.').message);
    }
  }

  return (
    <Modal
      open={open}
      title={asset ? `Edit Asset - ${asset.asset_tag}` : 'Register New Asset'}
      onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => document.getElementById('asset-form-submit')?.click()} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : asset ? 'Save Changes' : 'Register Asset'}
          </Button>
        </>
      )}
    >
      <form className="secure-modal-form" onSubmit={handleSubmit}>
        <section className="secure-modal-section">
          <h3>Identity</h3>
          <p>Core asset identifiers and categorisation.</p>
          <div className="ui-grid-2">
            <FormField label="Asset Tag" htmlFor="asset-form-tag" error={errorMessage}>
              <input id="asset-form-tag" className="ui-input" value={form.asset_tag} onChange={(event) => updateField('asset_tag', event.target.value)} />
            </FormField>
            <FormField label="Asset Type" htmlFor="asset-form-type">
              <select id="asset-form-type" className="ui-input" value={form.asset_type} onChange={(event) => updateField('asset_type', event.target.value)}>
                {(lookups.asset_types || []).map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Brand" htmlFor="asset-form-brand">
              <input id="asset-form-brand" className="ui-input" value={form.brand} onChange={(event) => updateField('brand', event.target.value)} />
            </FormField>
            <FormField label="Model" htmlFor="asset-form-model">
              <input id="asset-form-model" className="ui-input" value={form.model} onChange={(event) => updateField('model', event.target.value)} />
            </FormField>
            <FormField label="Serial Number" htmlFor="asset-form-serial">
              <input id="asset-form-serial" className="ui-input" value={form.serial_number} onChange={(event) => updateField('serial_number', event.target.value)} />
            </FormField>
            <FormField label="Purchase Date" htmlFor="asset-form-purchase-date">
              <input id="asset-form-purchase-date" type="date" className="ui-input" value={form.purchase_date} onChange={(event) => updateField('purchase_date', event.target.value)} />
            </FormField>
          </div>
        </section>

        <section className="secure-modal-section">
          <h3>Ownership and assignment</h3>
          <div className="ui-grid-2">
            <FormField label="Department" htmlFor="asset-form-department">
              <select id="asset-form-department" className="ui-input" value={form.department_id} onChange={(event) => updateField('department_id', event.target.value)}>
                <option value="">No department</option>
                {(lookups.departments || []).map((department) => (
                  <option key={department.department_id} value={department.department_id}>{department.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Assigned To" htmlFor="asset-form-assigned-to">
              <select id="asset-form-assigned-to" className="ui-input" value={form.assigned_to} onChange={(event) => updateField('assigned_to', event.target.value)}>
                <option value="">Unassigned</option>
                {(lookups.staff || []).map((staff) => (
                  <option key={staff.user_id} value={staff.user_id}>{staff.full_name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Assignment Notes" htmlFor="asset-form-assignment-notes">
              <textarea id="asset-form-assignment-notes" className="ui-input" rows={3} value={form.assignment_notes} onChange={(event) => updateField('assignment_notes', event.target.value)} />
            </FormField>
            <FormField label="Expected Return" htmlFor="asset-form-expected-return">
              <input id="asset-form-expected-return" type="datetime-local" className="ui-input" value={form.expected_return_at} onChange={(event) => updateField('expected_return_at', event.target.value)} />
            </FormField>
          </div>
        </section>

        <section className="secure-modal-section">
          <h3>Lifecycle</h3>
          <div className="ui-grid-2">
            <FormField label="Condition" htmlFor="asset-form-condition">
              <select id="asset-form-condition" className="ui-input" value={form.condition} onChange={(event) => updateField('condition', event.target.value)}>
                {(lookups.conditions || []).map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Status" htmlFor="asset-form-status">
              <select id="asset-form-status" className="ui-input" value={form.status} onChange={(event) => updateField('status', event.target.value)}>
                {(lookups.statuses || []).map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </FormField>
          </div>
        </section>

        <section className="secure-modal-section">
          <h3>Notes</h3>
          <FormField label="Location" htmlFor="asset-form-location">
            <input id="asset-form-location" className="ui-input" value={form.location} onChange={(event) => updateField('location', event.target.value)} />
          </FormField>
          <FormField label="Operational Notes" htmlFor="asset-form-description">
            <textarea id="asset-form-description" className="ui-input" rows={4} value={form.description} onChange={(event) => updateField('description', event.target.value)} />
          </FormField>
        </section>

        <button id="asset-form-submit" type="submit" hidden />
      </form>
    </Modal>
  );
}
