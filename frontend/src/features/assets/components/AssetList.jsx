import { Link } from 'react-router-dom';
import { EmptyState } from '../../../components/feedback/EmptyState.jsx';
import { DataTable } from '../../../components/tables/DataTable.jsx';
import { StatusBadge } from '../../../components/status/StatusBadge.jsx';

export function AssetList({
  assets = [],
  canManage = false,
  canDelete = false,
  onEdit,
  onAssign,
  onReturn,
  onDelete,
}) {
  if (!assets.length) {
    return <EmptyState title="No assets found." description="Adjust your filters or register a new asset." />;
  }

  return (
    <DataTable
      columns={[
        {
          key: 'asset_tag',
          label: 'Asset',
          render: (asset) => (
            <Link to={`/assets/${asset.asset_id}`}>
              {asset.asset_tag}
            </Link>
          ),
        },
        { key: 'asset_type', label: 'Type' },
        {
          key: 'brand_model',
          label: 'Brand / Model',
          render: (asset) => [asset.brand, asset.model].filter(Boolean).join(' ') || '-',
        },
        {
          key: 'department_name',
          label: 'Department',
          render: (asset) => asset.department_name || '-',
        },
        {
          key: 'assigned_staff_name',
          label: 'Assigned To',
          render: (asset) => asset.assigned_staff_name || '-',
        },
        {
          key: 'status',
          label: 'Status',
          render: (asset) => <StatusBadge value={asset.status} />,
        },
        { key: 'condition', label: 'Condition' },
        {
          key: 'actions',
          label: 'Actions',
          render: (asset) => (
            <div className="ui-inline-actions">
              {canManage ? (
                <>
                  <button type="button" className="ticket-link-button" onClick={() => onEdit(asset)}>Edit</button>
                  <button type="button" className="ticket-link-button" onClick={() => onAssign(asset)}>
                    {asset.assigned_to ? 'Reassign' : 'Assign'}
                  </button>
                  {asset.assigned_to ? (
                    <button type="button" className="ticket-link-button" onClick={() => onReturn(asset)}>Return</button>
                  ) : null}
                </>
              ) : null}
              {canDelete ? (
                <button type="button" className="ticket-link-button" onClick={() => onDelete(asset)}>
                  Delete
                </button>
              ) : null}
              <Link to={`/assets/${asset.asset_id}`}>Open</Link>
            </div>
          ),
        },
      ]}
      rows={assets}
    />
  );
}
