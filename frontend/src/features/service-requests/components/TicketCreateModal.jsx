import { useEffect, useState } from 'react';
import { Button } from '../../../components/forms/Button.jsx';
import { FormField } from '../../../components/forms/FormField.jsx';
import { Modal } from '../../../components/modals/Modal.jsx';
import { normalizeApiError } from '../../../lib/error-handling.js';
import { fetchAssets, fetchTicketSuggestions, mapSimplifiedTicketPayload } from '../services/service-requests-api.js';
import { KBSuggestions } from './KBSuggestions.jsx';

const CATEGORY_OPTIONS = ['Computer', 'Network', 'Printer', 'Internet', 'Software', 'Email', 'Hardware', 'Other'];
const CLASSIFICATION_OPTIONS = [
  { value: 'Computer|Endpoint Device', label: 'Computer / Endpoint Device' },
  { value: 'Network|Connectivity', label: 'Network / Connectivity' },
  { value: 'Network|Uplink Failure', label: 'Network / Uplink Failure' },
  { value: 'Printer|Secure Print', label: 'Printer / Secure Print' },
  { value: 'Software|Application Access', label: 'Software / Application Access' },
  { value: 'Hardware|Peripheral Failure', label: 'Hardware / Peripheral Failure' },
  { value: 'Other|General Support', label: 'Other / General Support' },
];
const SEVERITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];

export function TicketCreateModal({
  open,
  metadata,
  onClose,
  onCreated,
  onSubmit,
  isSubmitting,
}) {
  const [form, setForm] = useState({
    ticket_type: 'Incident',
    classification: 'Computer|Endpoint Device',
    severity: 'Medium',
    subject: '',
    description: '',
    affected_asset_id: '',
    closure_confirmation_required: false,
  });
  const [assets, setAssets] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!open) return;

    setErrorMessage('');
    setSuggestions([]);
    fetchAssets()
      .then((rows) => setAssets(Array.isArray(rows) ? rows : []))
      .catch(() => setAssets([]));
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const enoughText = form.subject.trim().length >= 3 || form.description.trim().length >= 12;
    if (!enoughText) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const rows = await fetchTicketSuggestions({
          ...mapSimplifiedTicketPayload(form),
          limit: 5,
        });
        setSuggestions(Array.isArray(rows) ? rows : []);
      } catch {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [form, open]);

  function updateField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage('');

    try {
      const created = await onSubmit(mapSimplifiedTicketPayload(form));
      setForm({
        ticket_type: 'Incident',
        classification: 'Computer|Endpoint Device',
        severity: 'Medium',
        subject: '',
        description: '',
        affected_asset_id: '',
        closure_confirmation_required: false,
      });
      setSuggestions([]);
      onCreated(created);
    } catch (error) {
      setErrorMessage(normalizeApiError(error, 'Failed to create the ticket.').message);
    }
  }

  return (
    <Modal
      open={open}
      title="Create a security request"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="ticket-create-form" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </>
      }
    >
      <form id="ticket-create-form" className="ticket-create-secure" onSubmit={handleSubmit}>
        <div className="ticket-create-form-pane">
          <section className="ticket-create-section">
            <strong>Request details</strong>
            <FormField label="Subject" htmlFor="create-subject" error={errorMessage}>
              <input
                id="create-subject"
                className="ui-input"
                value={form.subject}
                required
                placeholder="Brief summary of the security incident or service request"
                onChange={(event) => updateField('subject', event.target.value)}
              />
            </FormField>

            <FormField label="Description" htmlFor="create-description">
              <textarea
                id="create-description"
                className="ui-input"
                rows={5}
                value={form.description}
                required
                placeholder="Provide detailed context, error messages, hostnames, and specific systems involved."
                onChange={(event) => updateField('description', event.target.value)}
              />
            </FormField>
          </section>

          <section className="ticket-create-section">
            <strong>Classification</strong>
            <div className="ticket-form-grid">
              <FormField label="Request Type" htmlFor="create-ticket-type">
                <select
                  id="create-ticket-type"
                  className="ui-input"
                  value={form.ticket_type}
                  onChange={(event) => updateField('ticket_type', event.target.value)}
                >
                  {(metadata.ticket_types || []).map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Classification" htmlFor="create-classification">
                <select
                  id="create-classification"
                  className="ui-input"
                  value={form.classification}
                  onChange={(event) => updateField('classification', event.target.value)}
                >
                  {CLASSIFICATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                  {CATEGORY_OPTIONS.map((value) => (
                    <option key={value} value={`${value}|General`}>{value} / General</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Severity" htmlFor="create-severity">
                <select
                  id="create-severity"
                  className="ui-input"
                  value={form.severity}
                  onChange={(event) => updateField('severity', event.target.value)}
                >
                  {SEVERITY_OPTIONS.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Affected Asset" htmlFor="create-asset">
                <select
                  id="create-asset"
                  className="ui-input"
                  value={form.affected_asset_id}
                  onChange={(event) => updateField('affected_asset_id', event.target.value)}
                >
                  <option value="">No linked asset</option>
                  {assets.map((asset) => (
                    <option key={asset.asset_id} value={asset.asset_id}>
                      {asset.asset_tag} - {asset.asset_type}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <label className="ticket-checkbox">
              <input
                type="checkbox"
                checked={form.closure_confirmation_required}
                onChange={(event) => updateField('closure_confirmation_required', event.target.checked)}
              />
              <span>Require requester closure confirmation</span>
            </label>
          </section>
        </div>

        <aside className="ticket-create-review-pane">
          <section className="ticket-create-review-card">
            <strong>Review before submit</strong>
            <p>Confirm the key details below.</p>
            <dl>
              <div><dt>Asset</dt><dd>{form.affected_asset_id || 'No linked asset'}</dd></div>
              <div><dt>Class</dt><dd>{form.classification.replace('|', ' / ')}</dd></div>
              <div><dt>Severity</dt><dd>{form.severity}</dd></div>
            </dl>
          </section>

          <section className="ticket-suggestion-block">
            <strong>Self-Help Knowledge Suggestions</strong>
            <KBSuggestions suggestions={suggestions} />
          </section>
        </aside>
      </form>
    </Modal>
  );
}
