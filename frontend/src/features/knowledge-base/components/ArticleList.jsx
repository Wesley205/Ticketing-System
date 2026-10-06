import { EmptyState } from '../../../components/feedback/EmptyState.jsx';
import { formatArticleStatus } from '../services/knowledge-base-copy.js';

export function ArticleList({ articles = [], selectedArticleId = null, hasActiveFilters = false, onSelect }) {
  if (!articles.length) {
    return (
      <EmptyState
        variant="search"
        title={hasActiveFilters ? 'No matching articles' : 'No articles yet'}
        description={hasActiveFilters ? 'Try a different search term or clear the filters.' : 'Published guidance will appear here.'}
      />
    );
  }

  return (
    <div className="kb-list-react">
      {articles.map((article) => (
        <button
          key={article.article_id}
          type="button"
          className={`kb-article-card ${Number(selectedArticleId) === Number(article.article_id) ? 'active' : ''}`}
          onClick={() => onSelect(article.article_id)}
        >
          <strong>{article.title}</strong>
          <span>{article.summary || 'No summary available.'}</span>
          <small>{article.category || 'General support'} · {formatArticleStatus(article.status)} · {article.view_count} views</small>
        </button>
      ))}
    </div>
  );
}
