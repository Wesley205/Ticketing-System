import { EmptyState } from '../../../components/feedback/EmptyState.jsx';

export function KBSuggestions({ suggestions = [] }) {
  if (!suggestions.length) {
    return <EmptyState title="No matching articles yet." description="Knowledge-base suggestions will appear when the ticket text matches known solutions." />;
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
          <a href={`/knowledge-base#article-${article.article_id}`}>Open article</a>
        </article>
      ))}
    </div>
  );
}
