import { EmptyState } from '../../../components/feedback/EmptyState.jsx';
import { Button } from '../../../components/forms/Button.jsx';
import { Panel } from '../../../components/layout/Panel.jsx';
import { DataTable } from '../../../components/tables/DataTable.jsx';
import { Pagination } from '../../../components/tables/Pagination.jsx';

export function ReportTableSection({
  title,
  rows,
  columns,
  page,
  totalPages,
  total,
  onPrevious,
  onNext,
  exportLabel,
  onExport,
  isExporting = false,
}) {
  return (
    <Panel
      title={title}
      actions={onExport ? (
        <Button variant="secondary" onClick={onExport} disabled={isExporting}>
          {isExporting ? 'Exporting...' : exportLabel}
        </Button>
      ) : null}
    >
      <DataTable
        columns={columns}
        rows={rows}
        emptyState={<EmptyState title="No report rows" description="No rows matched the current report filters." />}
      />
      <div className="report-table-footer">
        <span>{Number(total || 0).toLocaleString()} total rows</span>
        <Pagination page={page} totalPages={totalPages} onPrevious={onPrevious} onNext={onNext} />
      </div>
    </Panel>
  );
}
