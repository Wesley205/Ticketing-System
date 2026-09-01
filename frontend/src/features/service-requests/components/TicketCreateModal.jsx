import { useEffect, useState } from 'react';
import { Button } from '../../../components/forms/Button.jsx';
import { FormField } from '../../../components/forms/FormField.jsx';
import { Modal } from '../../../components/modals/Modal.jsx';
import { normalizeApiError } from '../../../lib/error-handling.js';
import { fetchAssets, fetchTicketSuggestions } from '../services/service-requests-api.js';
import { KBSuggestions } from './KBSuggestions.jsx';

const CATEGORY_OPTIONS = ['Computer', 'Network', 'Printer', 'Internet', 'Software', 'Email', 'Hardware', 'Other'];

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
    category: 'Computer',
    subcategory: '',
    priority: 'Medium',
    impact: 'Medium',
    urgency: 'Medium',
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
          ...form,
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
      const created = await onSubmit({
        ...form,
        affected_asset_id: form.affected_asset_id || null,
      });
      setForm({
        ticket_type: 'Incident',
        category: 'Computer',
        subcategory: '',
        priority: 'Medium',
        impact: 'Medium',
        urgency: 'Medium',
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
      title="Create Ticket"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="ticket-create-form" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Ticket'}
          </Button>
        </>
      }
    >
      <form id="ticket-create-form" className="ui-stack-md" onSubmit={handleSubmit}>
        <div className="ticket-form-grid">
          <FormField label="Ticket Type" htmlFor="create-ticket-type">
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

          <FormField label="Category" htmlFor="create-category">
            <select
              id="create-category"
              className="ui-input"
              value={form.category}
              onChange={(event) => updateField('category', event.target.value)}
            >
              {CATEGORY_OPTIONS.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Subcategory" htmlFor="create-subcategory">
            <input
              id="create-subcategory"
              className="ui-input"
              value={form.subcategory}
              placeholder="Optional refinement, e.g. VPN"
              onChange={(event) => updateField('subcategory', event.target.value)}
            />
          </FormField>

          <FormField label="Priority" htmlFor="create-priority">
            <select
              id="create-priority"
              className="ui-input"
              value={form.priority}
              onChange={(event) => updateField('priority', event.target.value)}
            >
              {(metadata.priorities || []).map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Impact" htmlFor="create-impact">
            <select
              id="create-impact"
              className="ui-input"
              value={form.impact}
              onChange={(event) => updateField('impact', event.target.value)}
            >
              {(metadata.priorities || []).map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Urgency" htmlFor="create-urgency">
            <select
              id="create-urgency"
              className="ui-input"
              value={form.urgency}
              onChange={(event) => updateField('urgency', event.target.value)}
            >
              {(metadata.priorities || []).map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField label="Subject" htmlFor="create-subject" error={errorMessage}>
          <input
            id="create-subject"
            className="ui-input"
            value={form.subject}
            required
            placeholder="Brief summary of the issue"
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
            placeholder="Describe the issue in detail"
            onChange={(event) => updateField('description', event.target.value)}
          />
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

        <label className="ticket-checkbox">
          <input
            type="checkbox"
            checked={form.closure_confirmation_required}
            onChange={(event) => updateField('closure_confirmation_required', event.target.checked)}
          />
          <span>Require requester closure confirmation</span>
        </label>

        <section className="ticket-suggestion-block">
          <strong>Suggested Knowledge Articles</strong>
          <KBSuggestions suggestions={suggestions} />
        </section>
      </form>
    </Modal>
  );
}
