import { useEffect, useState } from 'react';
import { Button } from '../../../components/forms/Button.jsx';
import { AppIcon } from '../../../components/icons/AppIcon.jsx';
import { FormField } from '../../../components/forms/FormField.jsx';
import { Modal } from '../../../components/modals/Modal.jsx';
import { IMAGE_MIME_TYPES, fileToDataUrl } from '../../../lib/media-files.js';
import { fetchDepartments } from '../../departments/services/departments-api.js';
import {
  ARTICLE_STATUSES,
  ARTICLE_VISIBILITY_SCOPES,
  fetchArticleMediaBlob,
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

function ArticleMediaPreview({ articleId, item }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let active = true;
    let objectUrl = '';

    async function load() {
      try {
        const blob = item.file || (item.media_id && articleId
          ? await fetchArticleMediaBlob(articleId, item.media_id)
          : null);
        if (!blob || !active) return;
        objectUrl = window.URL.createObjectURL(blob);
        if (active) setSrc(objectUrl);
      } catch {
        if (active) setSrc('');
      }
    }

    setSrc('');
    load();
    return () => {
      active = false;
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
    };
  }, [articleId, item.file, item.media_id]);

  return src
    ? <img className="article-media-editor-preview" src={src} alt="" />
    : <span className="article-media-editor-placeholder"><AppIcon name="image" size={22} /></span>;
}

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
  const [departments, setDepartments] = useState([]);
  const [departmentError, setDepartmentError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(buildInitialForm(article));
      setMedia(buildInitialMedia(article));
      setError('');
      setMediaError('');
    }
  }, [open, article?.article_id]);

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    fetchDepartments()
      .then((rows) => {
        if (active) setDepartments(rows);
      })
      .catch(() => {
        if (active) setDepartmentError('Departments could not be loaded. Try reopening the form.');
      });
    return () => {
      active = false;
    };
  }, [open]);

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

  function moveMedia(index, direction) {
    setMedia((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
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
    if (form.visibility_scope === 'department' && !form.department_id) {
      setError('Choose the department that can read this article.');
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
      className="kb-article-modal"
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

            <FormField label="Department" htmlFor="article-department">
              <select
                id="article-department"
                className="ui-input"
                value={form.department_id}
                disabled={form.visibility_scope !== 'department'}
                onChange={(event) => updateField('department_id', event.target.value)}
              >
                <option value="">{form.visibility_scope === 'department' ? 'Choose a department' : 'Not required'}</option>
                {departments.map((department) => (
                  <option key={department.department_id} value={department.department_id}>{department.name}</option>
                ))}
              </select>
              {departmentError ? <small className="ui-field-error">{departmentError}</small> : null}
            </FormField>
          </div>
        </section>

        <section className="secure-modal-section">
          <h3>Article body</h3>
          <FormField label="Short answer" htmlFor="article-summary">
            <textarea id="article-summary" className="ui-input" rows={2} value={form.summary} placeholder="One or two sentences that explain what this article helps with." onChange={(event) => updateField('summary', event.target.value)} />
          </FormField>

          <FormField label="Steps or guidance" htmlFor="article-body">
            <textarea id="article-body" className="ui-input" rows={12} value={form.body} placeholder={'Use # headings, numbered steps, and - bullet points. Wrap commands in ``` code fences.'} onChange={(event) => updateField('body', event.target.value)} required />
            <small className="react-copy">Structure long guides with headings and lists. Commands inside code fences get a copy button.</small>
          </FormField>
        </section>

        <section className="secure-modal-section">
          <h3>Images</h3>
          <div className="article-media-editor-head">
            <div>
              <p className="react-copy">Add screenshots or photos that make the steps easier to follow.</p>
              <small>{media.length} of {MAX_ARTICLE_IMAGES} images · JPG, PNG, or WEBP</small>
            </div>
            <label className="ticket-link-button">
              <AppIcon name="image" size={16} />
              Add images
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={addImages} />
            </label>
          </div>
          {mediaError ? <p className="ui-field-error">{mediaError}</p> : null}
          <div className="article-media-editor-list">
            {media.map((item, index) => (
              <article key={`${item.media_id || item.file_name}-${index}`} className="article-media-editor-row">
                <div className="article-media-editor-file">
                  <ArticleMediaPreview articleId={article?.article_id} item={item} />
                  <div>
                    <strong>{item.file_name}</strong>
                    <small>{item.media_id ? 'Saved image' : 'New image'}</small>
                  </div>
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
                <div className="article-media-editor-actions">
                  <Button variant="secondary" size="sm" className="ui-icon-button" title="Move image up" aria-label="Move image up" disabled={index === 0} onClick={() => moveMedia(index, -1)}><AppIcon name="arrow-up" size={16} /></Button>
                  <Button variant="secondary" size="sm" className="ui-icon-button" title="Move image down" aria-label="Move image down" disabled={index === media.length - 1} onClick={() => moveMedia(index, 1)}><AppIcon name="arrow-down" size={16} /></Button>
                  <Button variant="secondary" size="sm" className="ui-icon-button" title="Remove image" aria-label="Remove image" onClick={() => setMedia((current) => current.filter((_, itemIndex) => itemIndex !== index))}><AppIcon name="delete" size={16} /></Button>
                </div>
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
