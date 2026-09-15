import { useEffect, useMemo, useRef, useState } from 'react';
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
const INITIAL_FORM = {
  ticket_type: 'Incident',
  classification: 'Computer|Endpoint Device',
  severity: 'Medium',
  subject: '',
  description: '',
  affected_asset_id: '',
  closure_confirmation_required: false,
};
const STEPS = ['Describe', 'Classify', 'Review'];

function isDirty(form) {
  return JSON.stringify(form) !== JSON.stringify(INITIAL_FORM);
}

function selectedAssetLabel(assets, assetId) {
  const asset = assets.find((row) => String(row.asset_id) === String(assetId));
  return asset ? `${asset.asset_tag} - ${asset.asset_type}` : 'No linked asset';
}

export function TicketCreateModal({
  open,
  metadata,
  onClose,
  onCreated,
  onSubmit,
  isSubmitting,
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(INITIAL_FORM);
  const [assets, setAssets] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const subjectRef = useRef(null);
  const descriptionRef = useRef(null);

  const payload = useMemo(() => mapSimplifiedTicketPayload(form), [form]);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setFieldErrors({});
    setSubmitError('');
    setSuggestions([]);
    setSuggestionsError('');
    fetchAssets()
      .then((rows) => setAssets(Array.isArray(rows) ? rows : []))
      .catch(() => setAssets([]));
    window.setTimeout(() => subjectRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const enoughText = form.subject.trim().length >= 3 || form.description.trim().length >= 12;
    if (!enoughText) {
      setSuggestions([]);
      setSuggestionsError('');
      setSuggestionsLoading(false);
      return undefined;
    }

    const timer = setTimeout(async () => {
      setSuggestionsLoading(true);
      setSuggestionsError('');
      try {
        const rows = await fetchTicketSuggestions({ ...payload, limit: 3 });
        setSuggestions(Array.isArray(rows) ? rows.slice(0, 3) : []);
      } catch (error) {
        setSuggestions([]);
        setSuggestionsError(normalizeApiError(error, 'Knowledge suggestions could not be loaded.').message);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [form.subject, form.description, form.classification, form.severity, form.ticket_type, form.affected_asset_id, open]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: '' }));
  }

  function validateDescribe() {
    const nextErrors = {};
    if (!form.subject.trim()) nextErrors.subject = 'Subject is required.';
    if (!form.description.trim()) nextErrors.description = 'Description is required.';
    setFieldErrors(nextErrors);
    if (nextErrors.subject) subjectRef.current?.focus();
    else if (nextErrors.description) descriptionRef.current?.focus();
    return !Object.keys(nextErrors).length;
  }

  function handleClose() {
    if (isSubmitting) return;
    if (isDirty(form) && !window.confirm('Discard this request draft?')) return;
    resetDraft();
    onClose();
  }

  function resetDraft() {
    setForm(INITIAL_FORM);
    setStep(0);
    setSuggestions([]);
    setFieldErrors({});
    setSubmitError('');
  }

  function continueStep() {
    if (step === 0 && !validateDescribe()) return;
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validateDescribe()) {
      setStep(0);
      return;
    }

    setSubmitError('');

    try {
      const created = await onSubmit(payload);
      resetDraft();
      onCreated(created);
    } catch (error) {
      setSubmitError(normalizeApiError(error, 'Failed to create the ticket.').message);
    }
  }

  return (
    <Modal
      open={open}
      title="Create request"
      onClose={handleClose}
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
          {step > 0 ? <Button variant="secondary" onClick={() => setStep((current) => current - 1)} disabled={isSubmitting}>Back</Button> : null}
          {step < STEPS.length - 1 ? (
            <Button onClick={continueStep}>Continue</Button>
          ) : (
            <Button type="submit" form="ticket-create-form" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit request'}
            </Button>
          )}
        </>
      }
    >
      <form id="ticket-create-form" className="ticket-create-secure ticket-create-flow" onSubmit={handleSubmit}>
        <nav className="ticket-create-steps" aria-label="Ticket creation progress">
          {STEPS.map((label, index) => (
            <span key={label} className={index === step ? 'active' : index < step ? 'complete' : ''}>
              <b>{index + 1}</b>
              {label}
            </span>
          ))}
        </nav>

        <div className="ticket-create-form-pane">
          {step === 0 ? (
            <section className="ticket-create-section">
              <strong>Describe the request</strong>
              <p className="ticket-create-help">Include location, error messages, affected system or device, and what has already been tried.</p>
              <FormField label="Subject" htmlFor="create-subject" error={fieldErrors.subject}>
                <input
                  ref={subjectRef}
                  id="create-subject"
                  className="ui-input"
                  value={form.subject}
                  required
                  placeholder="Brief summary of the ICT incident or service request"
                  aria-invalid={fieldErrors.subject ? 'true' : undefined}
                  onChange={(event) => updateField('subject', event.target.value)}
                />
              </FormField>

              <FormField label="Description" htmlFor="create-description" error={fieldErrors.description}>
                <textarea
                  ref={descriptionRef}
                  id="create-description"
                  className="ui-input"
                  rows={7}
                  value={form.description}
                  required
                  placeholder="Describe the issue, location, affected device, exact error, and any troubleshooting already attempted."
                  aria-invalid={fieldErrors.description ? 'true' : undefined}
                  onChange={(event) => updateField('description', event.target.value)}
                />
              </FormField>
            </section>
          ) : null}

          {step === 1 ? (
            <section className="ticket-create-section">
              <strong>Classify the request</strong>
              <p className="ticket-create-help">Severity maps to priority, impact, and urgency so the request remains simple and consistent.</p>
              <div className="ticket-form-grid">
                <FormField label="Request Type" htmlFor="create-ticket-type">
                  <select id="create-ticket-type" className="ui-input" value={form.ticket_type} onChange={(event) => updateField('ticket_type', event.target.value)}>
                    {(metadata.ticket_types || []).map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </FormField>

                <FormField label="Classification" htmlFor="create-classification">
                  <select id="create-classification" className="ui-input" value={form.classification} onChange={(event) => updateField('classification', event.target.value)}>
                    {CLASSIFICATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    {CATEGORY_OPTIONS.map((value) => <option key={value} value={`${value}|General`}>{value} / General</option>)}
                  </select>
                </FormField>

                <FormField label="Severity" htmlFor="create-severity">
                  <select id="create-severity" className="ui-input" value={form.severity} onChange={(event) => updateField('severity', event.target.value)}>
                    {SEVERITY_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </FormField>

                <FormField label="Affected Asset" htmlFor="create-asset">
                  <select id="create-asset" className="ui-input" value={form.affected_asset_id} onChange={(event) => updateField('affected_asset_id', event.target.value)}>
                    <option value="">No linked asset</option>
                    {assets.map((asset) => (
                      <option key={asset.asset_id} value={asset.asset_id}>{asset.asset_tag} - {asset.asset_type}</option>
                    ))}
                  </select>
                </FormField>
              </div>

              {!assets.length ? <p className="ticket-create-help">No viewable assets are available for this account. You can submit the request without linking an asset.</p> : null}

              <label className="ticket-checkbox">
                <input
                  type="checkbox"
                  checked={form.closure_confirmation_required}
                  onChange={(event) => updateField('closure_confirmation_required', event.target.checked)}
                />
                <span>Require requester closure confirmation</span>
              </label>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="ticket-create-section">
              <strong>Review and submit</strong>
              {submitError ? <p className="ui-field-error" role="alert">{submitError}</p> : null}
              <dl className="ticket-create-summary">
                <div><dt>Subject</dt><dd>{form.subject}</dd></div>
                <div><dt>Type</dt><dd>{form.ticket_type}</dd></div>
                <div><dt>Classification</dt><dd>{form.classification.replace('|', ' / ')}</dd></div>
                <div><dt>Priority</dt><dd>{form.severity}</dd></div>
                <div><dt>Affected asset</dt><dd>{selectedAssetLabel(assets, form.affected_asset_id)}</dd></div>
                <div><dt>Closure confirmation</dt><dd>{form.closure_confirmation_required ? 'Required' : 'Not required'}</dd></div>
              </dl>
              <Button variant="secondary" onClick={() => setStep(0)}>Edit description</Button>
            </section>
          ) : null}
        </div>

        <aside className="ticket-create-review-pane">
          <section className="ticket-suggestion-block">
            <strong>Knowledge suggestions</strong>
            <KBSuggestions suggestions={suggestions} isLoading={suggestionsLoading} error={suggestionsError} />
          </section>
        </aside>
      </form>
    </Modal>
  );
}
