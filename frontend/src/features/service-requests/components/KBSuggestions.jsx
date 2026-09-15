import { EmptyState } from '../../../components/feedback/EmptyState.jsx';
import { ErrorState } from '../../../components/feedback/ErrorState.jsx';
import { LoadingState } from '../../../components/feedback/LoadingState.jsx';

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
          <small>
            {article.category || 'General'} | Helpful: {Number(article.helpful_count || 0)} | Score: {Number(article.suggestion_score || 0)}
          </small>
          <a href={`/knowledge-base#article-${article.article_id}`} target="_blank" rel="noreferrer">Open article</a>
        </article>
      ))}
    </div>
  );
}
