import { EmptyState } from '../../../components/feedback/EmptyState.jsx';
import { ErrorState } from '../../../components/feedback/ErrorState.jsx';
import { LoadingState } from '../../../components/feedback/LoadingState.jsx';
import { Button } from '../../../components/forms/Button.jsx';
import { Panel } from '../../../components/layout/Panel.jsx';
import { TimelineList } from '../../../components/status/TimelineList.jsx';
import { formatDateTime } from '../../../lib/formatting.js';
import { splitRelations } from '../services/knowledge-base-api.js';

function feedbackCount(summary, key) {
  return Number(summary?.[key] || 0);
}

export function ArticleDetail({
  article,
  isLoading = false,
  error = '',
  canManage = false,
  canFeedback = false,
  isSubmitting = false,
  onEdit,
  onFeedback,
}) {
  if (isLoading) {
    return <LoadingState description="Loading selected article..." />;
  }

  if (error) {
    return <ErrorState title="Article unavailable" description={error} />;
  }

  if (!article) {
    return <EmptyState title="Select an article" description="Choose a knowledge-base article to view details, feedback, and revision history." />;
  }

  const relations = splitRelations(article.relations);
  const revisionItems = (article.revisions || []).map((revision) => ({
    id: revision.revision_id,
    title: `Revision ${revision.revision_number}`,
    description: revision.change_note || 'No change note provided',
    timestamp: revision.created_at,
  }));

  return (
    <div className="ui-stack-md">
      <Panel
        title={article.title}
        actions={canManage ? <Button variant="secondary" onClick={() => onEdit(article)}>Edit Article</Button> : null}
      >
        <div className="kb-meta-react">
          <span>{article.category || 'General'}</span>
          <span>{article.status}</span>
          <span>{article.visibility_scope}</span>
          {article.department_name ? <span>{article.department_name}</span> : null}
          <span>Revision {article.current_revision_number}</span>
        </div>
        <p className="react-copy">{article.summary || 'No summary available.'}</p>
        <div className="kb-article-body">{article.body}</div>
        <div className="kb-meta-react">
          <span>Asset Types: {relations.assetTypes.join(', ') || '-'}</span>
          <span>Ticket Categories: {relations.ticketCategories.join(', ') || '-'}</span>
          <span>Updated {formatDateTime(article.updated_at)}</span>
        </div>
      </Panel>

      <Panel title="Feedback">
        <div className="kb-feedback-row">
          <span>
            Helpful {feedbackCount(article.feedback_summary, 'helpful_count')} / Not helpful {feedbackCount(article.feedback_summary, 'not_helpful_count')}
          </span>
          {canFeedback ? (
            <div className="ui-inline-actions">
              <Button variant="secondary" onClick={() => onFeedback(true)} disabled={isSubmitting}>Helpful</Button>
              <Button variant="secondary" onClick={() => onFeedback(false)} disabled={isSubmitting}>Not Helpful</Button>
            </div>
          ) : null}
        </div>
      </Panel>

      <Panel title="Revision History">
        {revisionItems.length ? (
          <TimelineList items={revisionItems} />
        ) : (
          <EmptyState title="No revisions recorded" description="Revision history will appear after article create or update events." />
        )}
      </Panel>
    </div>
  );
}
