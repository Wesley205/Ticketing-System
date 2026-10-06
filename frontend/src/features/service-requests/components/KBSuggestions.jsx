import { EmptyState } from '../../../components/feedback/EmptyState.jsx';
import { ErrorState } from '../../../components/feedback/ErrorState.jsx';
import { LoadingState } from '../../../components/feedback/LoadingState.jsx';
import { AppIcon } from '../../../components/icons/AppIcon.jsx';

export function KBSuggestions({ suggestions = [], isLoading = false, error = '' }) {
  if (isLoading) {
    return <LoadingState variant="detail" title="Checking knowledge base" description="Looking for related guidance." />;
  }

  if (error) {
    return <ErrorState title="Suggestions unavailable" description={error} />;
  }

  if (!suggestions.length) {
    return <EmptyState variant="search" title="No matching articles yet." description="Knowledge-base suggestions will appear when the ticket text matches known solutions." />;
  }

  return (
    <div className="ui-stack-md">
      {suggestions.map((article) => (
        <article key={article.article_id} className="ticket-suggestion-card">
          <strong>{article.title}</strong>
          <p>{article.summary || 'No summary available.'}</p>
          <footer className="ticket-suggestion-footer">
            <small>
              <span>{article.category || 'General'}</span>
              <span>{Number(article.helpful_count || 0)} found this helpful</span>
            </small>
            <a
              className="ticket-suggestion-link"
              href={`/knowledge-base/${article.article_id}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${article.title} in a new tab`}
            >
              <AppIcon name="open" size={15} />
              <span>Open article</span>
            </a>
          </footer>
        </article>
      ))}
    </div>
  );
}
