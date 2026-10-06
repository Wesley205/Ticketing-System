import { EmptyState } from '../../../components/feedback/EmptyState.jsx';
import { ErrorState } from '../../../components/feedback/ErrorState.jsx';
import { LoadingState } from '../../../components/feedback/LoadingState.jsx';
import { Button } from '../../../components/forms/Button.jsx';
import { AppIcon } from '../../../components/icons/AppIcon.jsx';
import { TimelineList } from '../../../components/status/TimelineList.jsx';
import { ImageGallery } from '../../../components/media/ImageGallery.jsx';
import { formatDateTime } from '../../../lib/formatting.js';
import { fetchArticleMediaBlob, splitRelations } from '../services/knowledge-base-api.js';
import { formatArticleVisibility } from '../services/knowledge-base-copy.js';
import { ArticleBody } from './ArticleBody.jsx';

function feedbackCount(summary, key) {
  return Number(summary?.[key] || 0);
}

export function ArticleDetail({
  article,
  isLoading = false,
  error = '',
  canManage = false,
  canFeedback = false,
  hasArticles = false,
  isSubmitting = false,
  onEdit,
  onFeedback,
  onBack,
}) {
  if (isLoading) {
    return <LoadingState variant="detail" description="Loading selected article..." />;
  }

  if (error) {
    return <ErrorState title="Article unavailable" description={error} />;
  }

  if (!article) {
    if (hasArticles) return null;
    return <EmptyState variant="search" title="Select an article" description="Choose a knowledge-base article to view details, feedback, and revision history." />;
  }

  const relations = splitRelations(article.relations);
  const revisionItems = (article.revisions || []).map((revision) => ({
    id: revision.revision_id,
    title: `Revision ${revision.revision_number}`,
    description: `${revision.change_note || 'No change note provided'}${revision.changed_by_name ? ` · ${revision.changed_by_name}` : ''}`,
    timestamp: revision.created_at,
  }));
  const mediaItems = (article.media || []).map((item) => ({
    id: item.media_id,
    fileName: item.file_name,
    caption: item.caption,
    altText: item.alt_text || item.caption || item.file_name,
  }));

  async function downloadMedia(item) {
    const blob = await fetchArticleMediaBlob(article.article_id, item.id);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = item.fileName || 'article-image';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  return (
    <article className="kb-secure-detail">
      <button type="button" className="kb-mobile-back" onClick={onBack}>
        <AppIcon name="previous" size={16} />
        All articles
      </button>
      <header className="kb-secure-detail-head">
        <div>
          <div className="kb-meta-react">
            <strong>{article.article_code || `NSC-KB-${article.article_id}`}</strong>
            <span>{article.category || 'General'}</span>
            <span>{formatArticleVisibility(article.visibility_scope)}</span>
          </div>
          <h3>{article.title}</h3>
        </div>
        <small>Updated {formatDateTime(article.updated_at)}</small>
      </header>

      <section className="kb-summary-box">
        <strong>Summary</strong>
        <p>{article.summary || 'No summary available.'}</p>
      </section>

      <ArticleBody value={article.body} />

      <dl className="kb-article-facts">
        <div><dt>Owner</dt><dd>{article.updated_by_name || article.created_by_name || 'ICT Service Desk'}</dd></div>
        <div><dt>Revision</dt><dd>{article.current_revision_number || 1}</dd></div>
        <div><dt>Views</dt><dd>{article.view_count || 0}</dd></div>
        <div><dt>Last reviewed</dt><dd>{article.last_reviewed_at ? formatDateTime(article.last_reviewed_at) : 'Not reviewed'}</dd></div>
      </dl>

      {mediaItems.length ? (
        <section className="kb-secure-section">
          <ImageGallery
            title="Article images"
            items={mediaItems}
            loadImage={(mediaId) => fetchArticleMediaBlob(article.article_id, mediaId)}
            onDownload={downloadMedia}
          />
        </section>
      ) : null}

      <section className="kb-secure-section">
        <strong>Related assets</strong>
        <div className="kb-tag-row">
          {(relations.assetTypes.length ? relations.assetTypes : ['No asset type links']).map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </section>

      <section className="kb-secure-section">
        <strong>Revision history</strong>
        {revisionItems.length ? (
          <TimelineList items={revisionItems} />
        ) : (
          <p className="react-copy">No revisions recorded.</p>
        )}
      </section>

      <footer className="kb-feedback-row">
        <span>Was this helpful?</span>
        {canFeedback ? (
          <div className="ui-inline-actions">
            <Button variant="secondary" size="sm" onClick={() => onFeedback(true)} disabled={isSubmitting}>Yes</Button>
            <Button variant="secondary" size="sm" onClick={() => onFeedback(false)} disabled={isSubmitting}>No</Button>
          </div>
        ) : null}
        <span className="kb-feedback-saved">
          Helpful {feedbackCount(article.feedback_summary, 'helpful_count')} / Not helpful {feedbackCount(article.feedback_summary, 'not_helpful_count')}
        </span>
        {canManage ? (
          <Button size="sm" onClick={() => onEdit(article)}>Edit</Button>
        ) : null}
      </footer>
    </article>
  );
}
