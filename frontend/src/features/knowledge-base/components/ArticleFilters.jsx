import { FormField } from '../../../components/forms/FormField.jsx';
import { ARTICLE_STATUSES } from '../services/knowledge-base-api.js';
import {
  formatArticleStatus,
  formatArticleCategory,
  getCategoryOptions,
} from '../services/knowledge-base-copy.js';

export function ArticleFilters({ filters, canManage = false, resultCount = 0, onChange, onClear }) {
  const hasActiveFilters = Boolean(filters.search || filters.category || (canManage && filters.status));

  return (
    <section className="kb-filter-shell" aria-label="Knowledge-base filters">
      <div className="kb-filters">
      <FormField label="Search" htmlFor="kb-search-react">
        <input
          id="kb-search-react"
          className="ui-input"
          value={filters.search}
          placeholder="Search articles"
          onChange={(event) => onChange('search', event.target.value)}
        />
      </FormField>

      <FormField label="Topic" htmlFor="kb-category-react">
        <select
          id="kb-category-react"
          className="ui-input"
          value={filters.category}
          onChange={(event) => onChange('category', event.target.value)}
        >
          <option value="">All topics</option>
          {getCategoryOptions(filters.category).map((category) => (
            <option key={category} value={category}>{formatArticleCategory(category)}</option>
          ))}
        </select>
      </FormField>

      {canManage ? (
        <FormField label="Status" htmlFor="kb-status-react">
          <select
            id="kb-status-react"
            className="ui-input"
            value={filters.status}
            onChange={(event) => onChange('status', event.target.value)}
          >
            <option value="">All statuses</option>
            {ARTICLE_STATUSES.map((status) => <option key={status} value={status}>{formatArticleStatus(status)}</option>)}
          </select>
        </FormField>
      ) : null}

      </div>
      <div className="kb-filter-meta">
        <span className="kb-result-count" aria-live="polite">{resultCount} article{resultCount === 1 ? '' : 's'}</span>
        {hasActiveFilters ? <button type="button" onClick={onClear}>Clear filters</button> : null}
      </div>
    </section>
  );
}
