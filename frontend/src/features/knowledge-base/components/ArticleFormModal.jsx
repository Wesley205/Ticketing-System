import { useEffect, useState } from 'react';
import { Button } from '../../../components/forms/Button.jsx';
import { FormField } from '../../../components/forms/FormField.jsx';
import { Modal } from '../../../components/modals/Modal.jsx';
import {
  ARTICLE_STATUSES,
  ARTICLE_VISIBILITY_SCOPES,
  splitRelations,
  slugifyTitle,
} from '../services/knowledge-base-api.js';
import {
  formatArticleStatus,
  formatArticleVisibility,
  getCategoryOptions,
} from '../services/knowledge-base-copy.js';

function buildInitialForm(article) {
  const relations = splitRelations(article?.relations || []);
  return {
    title: article?.title || '',
    slug: article?.slug || '',
    summary: article?.summary || '',
    body: article?.body || '',
    category: article?.category || 'General support',
    status: article?.status || 'draft',
    visibility_scope: article?.visibility_scope || 'all_users',
    department_id: article?.department_id || '',
    search_keywords: article?.search_keywords || '',
    asset_types: relations.assetTypes.join(', '),
    ticket_categories: relations.ticketCategories.join(', '),
    change_note: '',
  };
}

export function ArticleFormModal({
  open,
  article = null,
  onClose,
  onSubmit,
  isSubmitting = false,
}) {
  const [form, setForm] = useState(buildInitialForm(article));
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(buildInitialForm(article));
      setError('');
    }
  }, [open, article?.article_id]);

  function updateField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === 'title' && !current.slug ? { slug: slugifyTitle(value) } : {}),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!form.slug.trim()) {
      setError('Slug is required.');
      return;
    }
    if (!form.body.trim()) {
      setError('Article body is required.');
      return;
    }

    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save article.');
    }
  }

  return (
    <Modal
      open={open}
      title={article ? `Edit Article - ${article.title}` : 'Create Knowledge Article'}
      onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => document.getElementById('article-form-submit')?.click()} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Article'}
          </Button>
        </>
      )}
    >
      <form className="secure-modal-form" onSubmit={handleSubmit}>
        <section className="secure-modal-section">
          <h3>Basic details</h3>
          <div className="ui-grid-2">
            <FormField label="Title" htmlFor="article-title" error={error}>
              <input id="article-title" className="ui-input" value={form.title} placeholder="Example: Reset a locked account" onChange={(event) => updateField('title', event.target.value)} required />
            </FormField>

            <FormField label="Web link" htmlFor="article-slug">
              <input id="article-slug" className="ui-input" value={form.slug} placeholder="auto-filled-from-title" onChange={(event) => updateField('slug', event.target.value)} required />
            </FormField>

            <FormField label="Topic" htmlFor="article-category">
              <select id="article-category" className="ui-input" value={form.category} onChange={(event) => updateField('category', event.target.value)}>
                {getCategoryOptions(form.category).map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </FormField>

            <FormField label="Search words" htmlFor="article-keywords">
              <input id="article-keywords" className="ui-input" value={form.search_keywords} placeholder="Optional words people may search for" onChange={(event) => updateField('search_keywords', event.target.value)} />
            </FormField>
          </div>
        </section>

        <section className="secure-modal-section">
          <h3>Publish settings</h3>
          <div className="ui-grid-2">
            <FormField label="Status" htmlFor="article-status">
              <select id="article-status" className="ui-input" value={form.status} onChange={(event) => updateField('status', event.target.value)}>
                {ARTICLE_STATUSES.map((status) => <option key={status} value={status}>{formatArticleStatus(status)}</option>)}
              </select>
            </FormField>

            <FormField label="Who can read this?" htmlFor="article-visibility">
              <select id="article-visibility" className="ui-input" value={form.visibility_scope} onChange={(event) => updateField('visibility_scope', event.target.value)}>
                {ARTICLE_VISIBILITY_SCOPES.map((scope) => <option key={scope} value={scope}>{formatArticleVisibility(scope)}</option>)}
              </select>
            </FormField>

            <FormField label="Department ID, if needed" htmlFor="article-department">
              <input id="article-department" type="number" min="1" className="ui-input" value={form.department_id} placeholder="Only for one department" onChange={(event) => updateField('department_id', event.target.value)} />
            </FormField>
          </div>
        </section>

        <section className="secure-modal-section">
          <h3>Article body</h3>
          <FormField label="Short answer" htmlFor="article-summary">
            <textarea id="article-summary" className="ui-input" rows={2} value={form.summary} placeholder="One or two sentences that explain what this article helps with." onChange={(event) => updateField('summary', event.target.value)} />
          </FormField>

          <FormField label="Steps or guidance" htmlFor="article-body">
            <textarea id="article-body" className="ui-input" rows={10} value={form.body} placeholder="Write the steps, notes, and checks officers should follow." onChange={(event) => updateField('body', event.target.value)} required />
          </FormField>
        </section>

        <section className="secure-modal-section">
          <h3>Links and update note</h3>
          <FormField label="Applies to these asset types" htmlFor="article-asset-types">
            <input id="article-asset-types" className="ui-input" value={form.asset_types} placeholder="Example: Printer, Laptop, Router" onChange={(event) => updateField('asset_types', event.target.value)} />
          </FormField>

          <FormField label="Applies to these request topics" htmlFor="article-ticket-categories">
            <input id="article-ticket-categories" className="ui-input" value={form.ticket_categories} placeholder="Example: Network issues, Printers" onChange={(event) => updateField('ticket_categories', event.target.value)} />
          </FormField>

          <FormField label="What changed?" htmlFor="article-change-note">
            <input id="article-change-note" className="ui-input" value={form.change_note} placeholder="Optional note for the revision history" onChange={(event) => updateField('change_note', event.target.value)} />
          </FormField>
        </section>

        <button id="article-form-submit" type="submit" hidden />
      </form>
    </Modal>
  );
}
