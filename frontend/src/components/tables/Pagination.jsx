import { Button } from '../forms/Button.jsx';

export function Pagination({
  page = 1,
  totalPages = 1,
  onPrevious,
  onNext,
}) {
  return (
    <div className="ui-pagination">
      <Button variant="secondary" onClick={onPrevious} disabled={page <= 1}>
        Previous
      </Button>
      <span className="ui-pagination-label">
        Page {page} of {Math.max(totalPages, 1)}
      </span>
      <Button variant="secondary" onClick={onNext} disabled={page >= totalPages}>
        Next
      </Button>
    </div>
  );
}
