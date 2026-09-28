import { EmptyState } from '../../../components/feedback/EmptyState.jsx';
import { formatArticleStatus } from '../services/knowledge-base-copy.js';

export function ArticleList({ articles = [], selectedArticleId = null, onSelect }) {
  if (!articles.length) {
    return <EmptyState variant="search" title="No articles found" description="No knowledge-base articles match the current filters or visibility scope." />;
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
          <small>
            {article.category || 'General support'} / {formatArticleStatus(article.status)} / Helpful {article.helpful_count} / Views {article.view_count}
          </small>
        </button>
      ))}
    </div>
  );
}
