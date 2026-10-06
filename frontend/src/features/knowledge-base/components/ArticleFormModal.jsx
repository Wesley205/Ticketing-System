import { useEffect, useState } from 'react';
import { Button } from '../../../components/forms/Button.jsx';
import { FormField } from '../../../components/forms/FormField.jsx';
import { Modal } from '../../../components/modals/Modal.jsx';
import { IMAGE_MIME_TYPES, fileToDataUrl } from '../../../lib/media-files.js';
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

const MAX_ARTICLE_IMAGES = 5;

function buildInitialMedia(article) {
  return (article?.media || []).map((item, index) => ({
    media_id: item.media_id,
    file_name: item.file_name,
    caption: item.caption || '',
    alt_text: item.alt_text || item.caption || item.file_name || '',
    sort_order: Number(item.sort_order ?? index),
    file: null,
  }));
}

export function ArticleFormModal({
  open,
  article = null,
  onClose,
  onSubmit,
  isSubmitting = false,
}) {
  const [form, setForm] = useState(buildInitialForm(article));
  const [media, setMedia] = useState(buildInitialMedia(article));
  const [error, setError] = useState('');
  const [mediaError, setMediaError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(buildInitialForm(article));
      setMedia(buildInitialMedia(article));
      setError('');
      setMediaError('');
    }
  }, [open, article?.article_id]);

  function updateField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === 'title' && !current.slug ? { slug: slugifyTitle(value) } : {}),
    }));
  }

  function addImages(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    setMediaError('');

    const invalid = files.find((file) => !IMAGE_MIME_TYPES.includes(file.type));
    if (invalid) {
      setMediaError('Only JPG, PNG, or WEBP images are allowed.');
      return;
    }

    setMedia((current) => {
      const available = MAX_ARTICLE_IMAGES - current.length;
      if (available < files.length) {
        setMediaError(`Articles can include up to ${MAX_ARTICLE_IMAGES} images.`);
      }
      return [
        ...current,
        ...files.slice(0, Math.max(0, available)).map((file, offset) => ({
          media_id: null,
          file_name: file.name,
          caption: '',
          alt_text: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
          sort_order: current.length + offset,
          file,
        })),
      ];
    });
  }

  function updateMedia(index, key, value) {
    setMedia((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [key]: value } : item
    )));
  }

  async function buildMediaPayload() {
    return Promise.all(media.map(async (item, index) => {
      const base = {
        media_id: item.media_id || null,
        file_name: item.file_name,
        caption: item.caption.trim(),
        alt_text: item.alt_text.trim(),
        sort_order: index,
      };

      if (!base.alt_text) {
        throw new Error('Alt text is required for each article image.');
      }

      if (!item.file) return base;

      return {
        ...base,
        mime_type: item.file.type,
        content_base64: await fileToDataUrl(item.file),
      };
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
      const mediaPayload = await buildMediaPayload();
      await onSubmit({ ...form, media: mediaPayload });
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
          <h3>Images</h3>
          <div className="article-media-editor-head">
            <p className="react-copy">Add up to 5 screenshots or photos. Captions appear below images in the article gallery.</p>
            <label className="ticket-link-button">
              Add Images
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={addImages} />
            </label>
          </div>
          {mediaError ? <p className="ui-field-error">{mediaError}</p> : null}
          <div className="article-media-editor-list">
            {media.map((item, index) => (
              <article key={`${item.media_id || item.file_name}-${index}`} className="article-media-editor-row">
                <div>
                  <strong>{item.file_name}</strong>
                  <small>{item.media_id ? 'Saved image' : 'New image'}</small>
                </div>
                <FormField label="Caption" htmlFor={`article-media-caption-${index}`}>
                  <input
                    id={`article-media-caption-${index}`}
                    className="ui-input"
                    value={item.caption}
                    placeholder="Short context shown under the image"
                    onChange={(event) => updateMedia(index, 'caption', event.target.value)}
                  />
                </FormField>
                <FormField label="Alt text" htmlFor={`article-media-alt-${index}`}>
                  <input
                    id={`article-media-alt-${index}`}
                    className="ui-input"
                    value={item.alt_text}
                    placeholder="Describe what the image shows"
                    onChange={(event) => updateMedia(index, 'alt_text', event.target.value)}
                    required
                  />
                </FormField>
                <Button variant="secondary" size="sm" onClick={() => setMedia((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                  Remove
                </Button>
              </article>
            ))}
            {!media.length ? <p className="react-copy">No article images added.</p> : null}
          </div>
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
