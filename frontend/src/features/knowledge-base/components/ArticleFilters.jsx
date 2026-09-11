import { Button } from '../../../components/forms/Button.jsx';
import { FormField } from '../../../components/forms/FormField.jsx';
import { ARTICLE_STATUSES } from '../services/knowledge-base-api.js';

export function ArticleFilters({ filters, canManage = false, onChange, onCreate }) {
  return (
    <section className="kb-filters" aria-label="Knowledge-base filters">
      <FormField label="Search" htmlFor="kb-search-react">
        <input
          id="kb-search-react"
          className="ui-input"
          value={filters.search}
          placeholder="Search knowledge articles"
          onChange={(event) => onChange('search', event.target.value)}
        />
      </FormField>

      <FormField label="Category" htmlFor="kb-category-react">
        <input
          id="kb-category-react"
          className="ui-input"
          value={filters.category}
          placeholder="Category"
          onChange={(event) => onChange('category', event.target.value)}
        />
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
            {ARTICLE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </FormField>
      ) : null}

      {canManage ? (
        <div className="kb-filter-actions">
          <Button onClick={onCreate}>New Article</Button>
        </div>
      ) : null}
    </section>
  );
}
