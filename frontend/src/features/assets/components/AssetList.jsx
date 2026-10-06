import { Link } from 'react-router-dom';
import { EmptyState } from '../../../components/feedback/EmptyState.jsx';
import { AppIcon } from '../../../components/icons/AppIcon.jsx';
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
          key: 'floor_label',
          label: 'Floor',
          render: (asset) => asset.floor_label || '-',
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
              <Link className="secure-action-button ui-icon-button" to={`/assets/${asset.asset_id}`} aria-label={`View ${asset.asset_tag}`} title="View asset">
                <AppIcon name="view" size={16} />
              </Link>
              {canManage ? (
                <>
                  <button type="button" className="ui-icon-button" onClick={() => onEdit(asset)} aria-label={`Edit ${asset.asset_tag}`} title="Edit asset">
                    <AppIcon name="edit" size={16} />
                  </button>
                  <button type="button" className="ui-icon-button" onClick={() => onAssign(asset)} aria-label={`${asset.assigned_to ? 'Reassign' : 'Assign'} ${asset.asset_tag}`} title={asset.assigned_to ? 'Reassign asset' : 'Assign asset'}>
                    <AppIcon name="user-add" size={16} />
                  </button>
                  {asset.assigned_to ? (
                    <button type="button" className="ui-icon-button" onClick={() => onReturn(asset)} aria-label={`Return ${asset.asset_tag}`} title="Return asset">
                      <AppIcon name="return" size={16} />
                    </button>
                  ) : null}
                </>
              ) : null}
              {canDelete ? (
                <button type="button" className="ui-icon-button secure-icon-danger" onClick={() => onDelete(asset)} aria-label={`Delete ${asset.asset_tag}`} title="Delete asset">
                  <AppIcon name="delete" size={16} />
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
