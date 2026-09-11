import { Link } from 'react-router-dom';
import { EmptyState } from '../../../components/feedback/EmptyState.jsx';
import { DataTable } from '../../../components/tables/DataTable.jsx';
import { StatusBadge } from '../../../components/status/StatusBadge.jsx';

export function AssetList({
  assets = [],
  canManage = false,
  canDelete = false,
  onCreate,
  onEdit,
  onAssign,
  onReturn,
  onDelete,
}) {
  if (!assets.length) {
    return (
      <EmptyState
        variant={canManage ? 'assets' : 'search'}
        title={canManage ? 'No assets registered' : 'No assets found.'}
        description={canManage ? 'Register your first asset to get started.' : 'Adjust your filters or request access to the asset registry.'}
        actionLabel={canManage ? 'Register Asset' : ''}
        onAction={canManage ? onCreate : undefined}
      />
    );
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
            <div className="secure-row-actions">
              <Link className="secure-action-button" to={`/assets/${asset.asset_id}`}>Actions</Link>
              {canManage ? (
                <>
                  <button type="button" onClick={() => onEdit(asset)}>Edit</button>
                  <button type="button" onClick={() => onAssign(asset)}>
                    {asset.assigned_to ? 'Reassign' : 'Assign'}
                  </button>
                  {asset.assigned_to ? (
                    <button type="button" onClick={() => onReturn(asset)}>Return</button>
                  ) : null}
                </>
              ) : null}
              {canDelete ? (
                <button type="button" onClick={() => onDelete(asset)}>
                  Delete
                </button>
              ) : null}
            </div>
          ),
        },
      ]}
      rows={assets}
    />
  );
}
