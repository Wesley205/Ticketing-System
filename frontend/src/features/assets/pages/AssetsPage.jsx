import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/forms/Button.jsx';
import { ErrorState } from '../../../components/feedback/ErrorState.jsx';
import { LoadingState } from '../../../components/feedback/LoadingState.jsx';
import { PageHero } from '../../../components/layout/PageHero.jsx';
import { Panel } from '../../../components/layout/Panel.jsx';
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
    <div className="ui-stack-lg">
      <PageHero
        eyebrow="Phase 6"
        title="Assets"
        description="Asset registry, assignment workflow, return processing, and lifecycle visibility now run inside the React shell."
        meta={[
          auth.accessProfile?.role_label || 'User',
          `${assetsState.totalAssets} visible assets`,
        ]}
      />

      <Panel
        title="Asset Registry"
        actions={(
          <div className="ui-inline-actions">
            <Button variant="secondary" onClick={() => assetsState.loadAssets(assetsState.filters)}>Refresh</Button>
            {canManage ? <Button onClick={handleOpenCreate}>Register Asset</Button> : null}
          </div>
        )}
      >
        <AssetFilters
          filters={assetsState.filters}
          lookups={assetsState.lookups}
          onChange={assetsState.updateFilter}
        />
      </Panel>

      {assetsState.error ? (
        <ErrorState
          title="Asset list unavailable"
          description={assetsState.error}
          onRetry={() => assetsState.loadAssets(assetsState.filters)}
        />
      ) : null}

      <Panel title="Assets">
        {assetsState.isLoading ? (
          <LoadingState description="Loading assets..." />
        ) : (
          <div className="ui-stack-md">
            <AssetList
              assets={assetsState.assets}
              canManage={canManage}
              canDelete={canDelete}
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
            <Pagination
              page={assetsState.pagination.page}
              totalPages={assetsState.pagination.totalPages}
              onPrevious={() => assetsState.setPage(assetsState.pagination.page - 1)}
              onNext={() => assetsState.setPage(assetsState.pagination.page + 1)}
            />
          </div>
        )}
      </Panel>

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
    </div>
  );
}
