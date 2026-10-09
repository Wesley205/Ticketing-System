import { Button } from '../forms/Button.jsx';
import { AppIcon } from '../icons/AppIcon.jsx';

export function Pagination({
  page = 1,
  totalPages = 1,
  onPrevious,
  onNext,
}) {
  const normalizedTotalPages = Math.max(totalPages, 1);

  return (
    <nav className="ui-pagination" aria-label="Pagination">
      <Button aria-label="Go to previous page" variant="secondary" onClick={onPrevious} disabled={page <= 1}>
        <AppIcon name="previous" size={16} />
        Previous
      </Button>
      <span className="ui-pagination-label">
        <span aria-live="polite">Page {page} of {normalizedTotalPages}</span>
      </span>
      <Button aria-label="Go to next page" variant="secondary" onClick={onNext} disabled={page >= normalizedTotalPages}>
        Next
        <AppIcon name="next" size={16} />
      </Button>
    </nav>
  );
}
