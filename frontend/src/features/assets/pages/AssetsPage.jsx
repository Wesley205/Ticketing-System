import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/forms/Button.jsx';
import { ErrorState } from '../../../components/feedback/ErrorState.jsx';
import { LoadingState } from '../../../components/feedback/LoadingState.jsx';
import { SecureWorkspaceLayout } from '../../../components/layout/SecureWorkspaceLayout.jsx';
import { Pagination } from '../../../components/tables/Pagination.jsx';
import { useToast } from '../../../hooks/useToast.js';
import { useAuth } from '../../auth/hooks/useAuth.js';
import { AssetAssignmentModal } from '../components/AssetAssignmentModal.jsx';
import { AssetFilters } from '../components/AssetFilters.jsx';
import { AssetFormModal } from '../components/AssetFormModal.jsx';
import { AssetList } from '../components/AssetList.jsx';
import { useAssets } from '../hooks/useAssets.js';
import { assignAsset as saveAssignment, deleteAsset as removeAsset, updateAsset as saveAssetUpdate } from '../services/assets-api.js';

export function AssetsPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const assetsState = useAssets();
  const [formOpen, setFormOpen] = useState(false);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [assignmentAsset, setAssignmentAsset] = useState(null);

  const canManage = auth.accessProfile?.permissions?.can_manage_assets === true;
  const canDelete = auth.user?.role === 'admin' || auth.accessProfile?.permissions?.can_access_admin_portal === true;

  function handleOpenCreate() {
    setEditingAsset(null);
    setFormOpen(true);
  }

  function handleEdit(asset) {
    setEditingAsset(asset);
    setFormOpen(true);
  }

  return (
    <SecureWorkspaceLayout title="Asset Registry" subtitle="Service Desk">
      <div className="secure-registry-page">
        <div className="service-desk-secure-head">
          <div>
            <h2>Asset Registry</h2>
            <p>View, edit, and manage assets across departments.</p>
          </div>
          <div className="service-desk-secure-actions">
            <Button variant="secondary" onClick={() => assetsState.loadAssets(assetsState.filters)}>Refresh</Button>
            {canManage ? <Button onClick={handleOpenCreate}>+ Register Asset</Button> : null}
          </div>
        </div>

        <div className="secure-filter-bar">
          <AssetFilters
            filters={assetsState.filters}
            lookups={assetsState.lookups}
            onChange={assetsState.updateFilter}
          />
          <div className="secure-filter-meta">
            <span>{assetsState.totalAssets} Total Assets</span>
            <button type="button" onClick={() => {
              assetsState.updateFilter('search', '');
              assetsState.updateFilter('status', '');
              assetsState.updateFilter('asset_type', '');
              assetsState.updateFilter('department_id', '');
            }}>
              Clear filters
            </button>
          </div>
        </div>

        {assetsState.error ? (
          <ErrorState
            title="Asset list unavailable"
            description={assetsState.error}
            onRetry={() => assetsState.loadAssets(assetsState.filters)}
          />
        ) : null}

        <section className="secure-data-panel">
          {assetsState.isLoading ? (
            <LoadingState variant="table" description="Loading assets..." />
          ) : (
            <div className="ui-stack-md">
              <AssetList
                assets={assetsState.assets}
                canManage={canManage}
                canDelete={canDelete}
                onCreate={handleOpenCreate}
                onEdit={handleEdit}
                onAssign={(asset) => {
                  setAssignmentAsset(asset);
                  setAssignmentOpen(true);
                }}
                onReturn={(asset) => navigate(`/assets/${asset.asset_id}?return=1`)}
                onDelete={async (asset) => {
                  await removeAsset(asset.asset_id);
                  await assetsState.loadAssets(assetsState.filters);
                  showToast({ tone: 'success', title: 'Asset deleted' });
                }}
              />
              <div className="secure-table-footer">
                <span>
                  Showing {assetsState.assets.length ? '1' : '0'}-{assetsState.assets.length} of {assetsState.totalAssets} assets
                </span>
                <Pagination
                  page={assetsState.pagination.page}
                  totalPages={assetsState.pagination.totalPages}
                  onPrevious={() => assetsState.setPage(assetsState.pagination.page - 1)}
                  onNext={() => assetsState.setPage(assetsState.pagination.page + 1)}
                />
              </div>
            </div>
          )}
        </section>
      </div>

      <AssetFormModal
        open={formOpen}
        asset={editingAsset}
        lookups={assetsState.lookups}
        onClose={() => setFormOpen(false)}
        isSubmitting={assetsState.isSubmitting}
        onSubmit={async (payload) => {
          const saved = editingAsset
            ? await saveAssetUpdate(editingAsset.asset_id, payload)
            : await assetsState.submitCreateAsset(payload);
          if (editingAsset) {
            await assetsState.loadAssets(assetsState.filters);
          }
          showToast({ tone: 'success', title: editingAsset ? 'Asset updated' : 'Asset created' });
          navigate(`/assets/${saved.asset_id || editingAsset.asset_id}`);
        }}
      />

      <AssetAssignmentModal
        open={assignmentOpen}
        asset={assignmentAsset}
        staff={assetsState.lookups.staff}
        onClose={() => setAssignmentOpen(false)}
        onSubmit={async (payload) => {
          await saveAssignment(assignmentAsset.asset_id, payload);
          await assetsState.loadAssets(assetsState.filters);
          showToast({ tone: 'success', title: 'Assignment saved' });
        }}
      />
    </SecureWorkspaceLayout>
  );
}
