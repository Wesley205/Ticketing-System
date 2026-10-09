export function DataTable({ columns = [], rows = [], emptyState = null, ariaLabel = 'Data table', caption = '' }) {
  if (!rows.length && emptyState) {
    return <div className="ui-table-empty">{emptyState}</div>;
  }

  return (
    <div className="ui-table-wrap">
      <table className="ui-table" aria-label={ariaLabel}>
        {caption ? <caption className="ui-table-caption">{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col">{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.key || index}>
              {columns.map((column) => (
                <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
