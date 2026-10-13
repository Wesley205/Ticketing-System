import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../../../components/forms/Button.jsx';
import { FormField } from '../../../components/forms/FormField.jsx';
import { Modal } from '../../../components/modals/Modal.jsx';
import { ConfirmDialog } from '../../../components/modals/ConfirmDialog.jsx';
import { normalizeApiError } from '../../../lib/error-handling.js';
import { IMAGE_MIME_TYPES } from '../../../lib/media-files.js';
import { ImageUploadPreview } from '../../../components/media/ImageGallery.jsx';
import { fetchAssets, fetchClassificationRecommendation, fetchTicketSuggestions, mapSimplifiedTicketPayload } from '../services/service-requests-api.js';
import { fetchServiceCatalog } from '../services/service-catalog-api.js';
import { KBSuggestions } from './KBSuggestions.jsx';

const CATEGORY_OPTIONS = ['Account Access', 'Computer', 'Network', 'Printing', 'Software', 'Email', 'Security', 'Phone and Calls', 'Other'];
const CLASSIFICATION_OPTIONS = [
  { value: 'Account Access|Application access', label: 'Account Access / Application access' },
  { value: 'Computer|Computer problem', label: 'Computer / Computer problem' },
  { value: 'Network|Wi-Fi connection', label: 'Network / Wi-Fi connection' },
  { value: 'Printing|Printer offline', label: 'Printing / Printer offline' },
  { value: 'Software|Application not working', label: 'Software / Application not working' },
  { value: 'Email|Cannot send email', label: 'Email / Cannot send email' },
  { value: 'Security|Suspicious email', label: 'Security / Suspicious email' },
  { value: 'Phone and Calls|Phone not working', label: 'Phone and Calls / Phone not working' },
  { value: 'Other|General ICT help', label: 'Other / General ICT help' },
];
const SEVERITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];
const MAX_TICKET_IMAGES = 3;
const INITIAL_FORM = {
  ticket_type: 'Incident',
  classification: 'Computer|Computer problem',
  severity: 'Medium',
  subject: '',
  description: '',
  affected_asset_id: '',
  closure_confirmation_required: false,
  catalog_item_id: '',
  catalog_responses: {},
};
const STEPS = ['Describe', 'Classify', 'Review'];

function isDirty(form) {
  return JSON.stringify(form) !== JSON.stringify(INITIAL_FORM);
}

function selectedAssetLabel(assets, assetId) {
  const asset = assets.find((row) => String(row.asset_id) === String(assetId));
  return asset ? `${asset.asset_tag} - ${asset.asset_type}` : 'No linked asset';
}

function recommendationClassificationValue(recommendation) {
  const category = String(recommendation?.category?.value || '').trim();
  const subcategory = String(recommendation?.subcategory?.value || 'General Support').trim();
  if (!category) return '';
  if (category === 'Hardware' && /printer|scanning/i.test(subcategory)) return 'Printing|Printer offline';
  if (category === 'Hardware' && /endpoint|device/i.test(subcategory)) return 'Computer|Computer problem';
  if (category === 'Software' && /email/i.test(subcategory)) return 'Email|Cannot send email';
  if (category === 'Software' && /application|access/i.test(subcategory)) return 'Software|Application not working';
  if (category === 'Network' && /connect/i.test(subcategory)) return 'Network|Wi-Fi connection';
  return `${category}|${subcategory}`;
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
  const [catalogItems, setCatalogItems] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState('');
  const [classificationRecommendation, setClassificationRecommendation] = useState(null);
  const [classificationLoading, setClassificationLoading] = useState(false);
  const [classificationError, setClassificationError] = useState('');
  const classificationTouchedRef = useRef(new Set());
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [images, setImages] = useState([]);
  const [imageError, setImageError] = useState('');
  const [discardOpen, setDiscardOpen] = useState(false);
  const subjectRef = useRef(null);
  const descriptionRef = useRef(null);

  const payload = useMemo(() => mapSimplifiedTicketPayload(form), [form]);
  const selectedCatalogItem = useMemo(
    () => catalogItems.find((item) => String(item.catalog_item_id) === String(form.catalog_item_id)) || null,
    [catalogItems, form.catalog_item_id]
  );

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setFieldErrors({});
    setSubmitError('');
    setSuggestions([]);
    setSuggestionsError('');
    setClassificationRecommendation(null);
    setClassificationError('');
    setClassificationLoading(false);
    classificationTouchedRef.current = new Set();
    setImages([]);
    setImageError('');
    fetchAssets()
      .then((rows) => setAssets(Array.isArray(rows) ? rows : []))
      .catch(() => setAssets([]));
    fetchServiceCatalog()
      .then((rows) => {
        setCatalogItems(rows);
        if (rows[0]) {
          setForm((current) => current.catalog_item_id ? current : {
            ...current,
            catalog_item_id: rows[0].catalog_item_id,
            ticket_type: rows[0].ticket_type,
            severity: rows[0].default_priority,
          });
        }
      })
      .catch(() => setCatalogItems([]));
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

  useEffect(() => {
    if (!open) return undefined;
    const enoughText = form.subject.trim().length >= 3 || form.description.trim().length >= 12;
    if (!enoughText) {
      setClassificationRecommendation(null);
      setClassificationError('');
      setClassificationLoading(false);
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setClassificationLoading(true);
      setClassificationError('');
      try {
        const result = await fetchClassificationRecommendation({
          subject: form.subject,
          description: form.description,
          service_needed: selectedCatalogItem?.name || '',
        });
        if (!cancelled) setClassificationRecommendation(result);
      } catch (error) {
        if (!cancelled) {
          setClassificationRecommendation(null);
          setClassificationError(normalizeApiError(error, 'Classification suggestions could not be loaded.').message);
        }
      } finally {
        if (!cancelled) setClassificationLoading(false);
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [form.subject, form.description, selectedCatalogItem?.name, open]);

  function updateField(key, value) {
    if (['classification', 'ticket_type', 'severity'].includes(key)) {
      classificationTouchedRef.current.add(key);
    }
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: '' }));
  }

  function applyClassificationRecommendations() {
    const recommendations = classificationRecommendation?.recommendations || {};
    setForm((current) => {
      const next = { ...current };
      if (!classificationTouchedRef.current.has('classification')) {
        const value = recommendationClassificationValue(recommendations);
        if (value) next.classification = value;
      }
      if (!classificationTouchedRef.current.has('ticket_type') && recommendations.ticket_type?.value) {
        next.ticket_type = recommendations.ticket_type.value;
      }
      if (!classificationTouchedRef.current.has('severity') && recommendations.priority?.value) {
        next.severity = recommendations.priority.value;
      }
      return next;
    });
  }

  function selectCatalogItem(value) {
    const item = catalogItems.find((row) => String(row.catalog_item_id) === String(value));
    setForm((current) => ({
      ...current,
      catalog_item_id: value,
      catalog_responses: {},
      ticket_type: item?.ticket_type || current.ticket_type,
      severity: item?.default_priority || current.severity,
    }));
    setFieldErrors({});
  }

  function updateCatalogResponse(key, value) {
    setForm((current) => ({
      ...current,
      catalog_responses: { ...current.catalog_responses, [key]: value },
    }));
    setFieldErrors((current) => ({ ...current, [`catalog_${key}`]: '' }));
  }

  function validateDescribe() {
    const nextErrors = {};
    if (!form.subject.trim()) nextErrors.subject = 'Subject is required.';
    if (!form.description.trim()) nextErrors.description = 'Description is required.';
    if (!form.catalog_item_id) nextErrors.catalog_item_id = 'Select the service you need.';
    for (const field of selectedCatalogItem?.form_schema || []) {
      if (field.required && !String(form.catalog_responses[field.key] || '').trim()) {
        nextErrors[`catalog_${field.key}`] = `${field.label} is required.`;
      }
    }
    setFieldErrors(nextErrors);
    if (nextErrors.subject) subjectRef.current?.focus();
    else if (nextErrors.description) descriptionRef.current?.focus();
    return !Object.keys(nextErrors).length;
  }

  function handleClose() {
    if (isSubmitting) return;
    if (isDirty(form)) {
      setDiscardOpen(true);
      return;
    }
    resetDraft();
    onClose();
  }

  function discardDraft() {
    setDiscardOpen(false);
    resetDraft();
    onClose();
  }

  function resetDraft() {
    setForm(INITIAL_FORM);
    setStep(0);
    setSuggestions([]);
    setImages([]);
    setImageError('');
    setFieldErrors({});
    setSubmitError('');
  }

  function handleAddImages(event) {
    const selected = Array.from(event.target.files || []);
    event.target.value = '';
    setImageError('');

    const invalid = selected.find((file) => !IMAGE_MIME_TYPES.includes(file.type));
    if (invalid) {
      setImageError('Only JPG, PNG, or WEBP images can be attached.');
      return;
    }

    setImages((current) => {
      const next = [...current, ...selected].slice(0, MAX_TICKET_IMAGES);
      if (current.length + selected.length > MAX_TICKET_IMAGES) {
        setImageError(`Tickets can include up to ${MAX_TICKET_IMAGES} images.`);
      }
      return next;
    });
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
      const created = await onSubmit(payload, images);
      resetDraft();
      onCreated(created);
    } catch (error) {
      setSubmitError(normalizeApiError(error, 'Failed to create the ticket.').message);
    }
  }

  return (
    <>
      <Modal
      open={open}
      title="Create request"
      onClose={handleClose}
      className="ticket-create-modal"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
          {step > 0 ? <Button variant="secondary" onClick={() => setStep((current) => current - 1)} disabled={isSubmitting}>Back</Button> : null}
          {step < STEPS.length - 1 ? (
            <Button onClick={continueStep}>Continue</Button>
          ) : (
          <Button type="submit" form="ticket-create-form" loading={isSubmitting} loadingLabel="Submitting...">
            Submit request
            </Button>
          )}
        </>
      }
    >
      <form id="ticket-create-form" className="ticket-create-secure ticket-create-flow" onSubmit={handleSubmit} aria-busy={isSubmitting || undefined}>
        <nav className="ticket-create-steps" aria-label="Ticket creation progress">
          <span className="ticket-create-step-count">Step {step + 1} of {STEPS.length}</span>
          {STEPS.map((label, index) => (
            <span key={label} className={index === step ? 'active' : index < step ? 'complete' : ''} aria-current={index === step ? 'step' : undefined}>
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
              <FormField label="Service needed" htmlFor="create-catalog-item" error={fieldErrors.catalog_item_id}>
                <select id="create-catalog-item" className="ui-input" value={form.catalog_item_id} onChange={(event) => selectCatalogItem(event.target.value)}>
                  <option value="">Select a service</option>
                  {catalogItems.map((item) => <option key={item.catalog_item_id} value={item.catalog_item_id}>{item.name}</option>)}
                </select>
              </FormField>
              {selectedCatalogItem ? (
                <div className="ticket-catalog-summary">
                  <strong>{selectedCatalogItem.name}</strong>
                  <p>{selectedCatalogItem.description}</p>
                  {selectedCatalogItem.approval_required ? <span>Approval required before assignment</span> : <span>No approval required</span>}
                </div>
              ) : null}
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

              {(selectedCatalogItem?.form_schema || []).map((field) => (
                <FormField key={field.key} label={field.label} htmlFor={`create-catalog-${field.key}`} error={fieldErrors[`catalog_${field.key}`]}>
                  {field.type === 'textarea' ? (
                    <textarea
                      id={`create-catalog-${field.key}`}
                      className="ui-input"
                      rows={4}
                      value={form.catalog_responses[field.key] || ''}
                      placeholder={field.placeholder || ''}
                      onChange={(event) => updateCatalogResponse(field.key, event.target.value)}
                    />
                  ) : (
                    <input
                      id={`create-catalog-${field.key}`}
                      className="ui-input"
                      value={form.catalog_responses[field.key] || ''}
                      placeholder={field.placeholder || ''}
                      onChange={(event) => updateCatalogResponse(field.key, event.target.value)}
                    />
                  )}
                </FormField>
              ))}

              <ImageUploadPreview
                files={images}
                limit={MAX_TICKET_IMAGES}
                label="Context images"
                description="Add up to 3 screenshots or photos that help ICT understand the issue."
                error={imageError}
                onAdd={handleAddImages}
                onRemove={(index) => setImages((current) => current.filter((_, itemIndex) => itemIndex !== index))}
              />
            </section>
          ) : null}

          {step === 1 ? (
            <section className="ticket-create-section">
              <strong>Classify the request</strong>
              <p className="ticket-create-help">Severity maps to priority, impact, and urgency so the request remains simple and consistent.</p>
              {classificationLoading ? <p className="ticket-create-help" role="status">Checking your description for classification suggestions...</p> : null}
              {classificationError ? <p className="ui-field-error" role="alert">{classificationError}</p> : null}
              {classificationRecommendation?.recommendations?.category ? (
                <div className="ticket-classification-recommendation" role="status">
                  <div>
                    <strong>Suggested classification</strong>
                    <p>
                      {classificationRecommendation.recommendations.category.value}
                      {classificationRecommendation.recommendations.subcategory?.value ? ` / ${classificationRecommendation.recommendations.subcategory.value}` : ''}
                      {classificationRecommendation.catalog_match?.name ? ` - ${classificationRecommendation.catalog_match.name}` : ''}
                    </p>
                    <small>
                      Matched {classificationRecommendation.matched_signals.join(', ')}. Review before submitting.
                    </small>
                  </div>
                  <Button type="button" variant="secondary" size="sm" onClick={applyClassificationRecommendations}>Use suggestion</Button>
                </div>
              ) : null}
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
                    {classificationRecommendation?.recommendations?.category ? (
                      <option value={recommendationClassificationValue(classificationRecommendation.recommendations)}>
                        {recommendationClassificationValue(classificationRecommendation.recommendations).replace('|', ' / ')}
                      </option>
                    ) : null}
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
              <p className="ticket-create-help">This request will be filed under your account's department.</p>
              {submitError ? <p className="ui-field-error" role="alert">{submitError}</p> : null}
              <dl className="ticket-create-summary">
                <div><dt>Subject</dt><dd>{form.subject}</dd></div>
                <div><dt>Service</dt><dd>{selectedCatalogItem?.name || 'General support'}</dd></div>
                <div><dt>Approval</dt><dd>{selectedCatalogItem?.approval_required ? 'Required' : 'Not required'}</dd></div>
                <div><dt>Type</dt><dd>{form.ticket_type}</dd></div>
                <div><dt>Classification</dt><dd>{form.classification.replace('|', ' / ')}</dd></div>
                <div><dt>Priority</dt><dd>{form.severity}</dd></div>
                <div><dt>Affected asset</dt><dd>{selectedAssetLabel(assets, form.affected_asset_id)}</dd></div>
                <div><dt>Images</dt><dd>{images.length ? `${images.length} attached` : 'No images attached'}</dd></div>
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
      <ConfirmDialog
        open={discardOpen}
        title="Discard this request draft?"
        description="Your entered details and attached images will be removed."
        confirmLabel="Discard draft"
        onCancel={() => setDiscardOpen(false)}
        onConfirm={discardDraft}
      />
    </>
  );
}
