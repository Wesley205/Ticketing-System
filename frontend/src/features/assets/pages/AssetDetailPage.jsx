import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../../components/forms/Button.jsx';
import { ErrorState } from '../../../components/feedback/ErrorState.jsx';
import { LoadingState } from '../../../components/feedback/LoadingState.jsx';
import { SecureWorkspaceLayout } from '../../../components/layout/SecureWorkspaceLayout.jsx';
import { useToast } from '../../../hooks/useToast.js';
import { useAuth } from '../../auth/hooks/useAuth.js';
import { AssetAssignmentModal } from '../components/AssetAssignmentModal.jsx';
import { AssetDetail } from '../components/AssetDetail.jsx';
import { AssetFormModal } from '../components/AssetFormModal.jsx';
import { useAssetDetail } from '../hooks/useAssetDetail.js';
import { useAssets } from '../hooks/useAssets.js';
import { normalizeApiError } from '../../../lib/error-handling.js';
import { Modal } from '../../../components/modals/Modal.jsx';
import { FormField } from '../../../components/forms/FormField.jsx';

function ReturnAssetModal({ open, asset, onClose, onSubmit, isSubmitting = false }) {
  const [form, setForm] = useState({
    return_notes: '',
    returned_condition: '',
    target_status: '',
  });
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (open) {
      setForm({ return_notes: '', returned_condition: '', target_status: '' });
      setErrorMessage('');
    }
  }, [open, asset?.asset_id]);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage('');

    try {
      await onSubmit({
        return_notes: form.return_notes.trim() || null,
        returned_condition: form.returned_condition || null,
        target_status: form.target_status || null,
      });
      onClose();
    } catch (error) {
      setErrorMessage(normalizeApiError(error, 'Failed to process the asset return.').message);
    }
  }

  return (
    <Modal
      open={open}
      title={`Process Return - ${asset?.asset_tag || 'Asset'}`}
      onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => document.getElementById('asset-return-submit')?.click()} disabled={isSubmitting}>
            {isSubmitting ? 'Processing...' : 'Process Return'}
          </Button>
        </>
      )}
    >
      <form className="ui-stack-md" onSubmit={handleSubmit}>
        <FormField label="Return Notes" htmlFor="asset-return-notes" error={errorMessage}>
          <textarea
            id="asset-return-notes"
            className="ui-input"
            rows={4}
            value={form.return_notes}
            onChange={(event) => setForm((current) => ({ ...current, return_notes: event.target.value }))}
          />
        </FormField>

        <div className="ui-grid-2">
          <FormField label="Returned Condition" htmlFor="asset-return-condition">
            <select
              id="asset-return-condition"
              className="ui-input"
              value={form.returned_condition}
              onChange={(event) => setForm((current) => ({ ...current, returned_condition: event.target.value }))}
            >
              <option value="">Keep existing condition</option>
              <option value="New">New</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Poor">Poor</option>
            </select>
          </FormField>

          <FormField label="Target Status" htmlFor="asset-return-status">
            <select
              id="asset-return-status"
              className="ui-input"
              value={form.target_status}
              onChange={(event) => setForm((current) => ({ ...current, target_status: event.target.value }))}
            >
              <option value="">Automatic</option>
              <option value="Available">Available</option>
              <option value="Damaged">Damaged</option>
              <option value="Retired">Retired</option>
              <option value="Under Maintenance">Under Maintenance</option>
            </select>
          </FormField>
        </div>

        <button id="asset-return-submit" type="submit" hidden />
      </form>
    </Modal>
  );
}

export function AssetDetailPage() {
  const { assetId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();
  const { showToast } = useToast();
  const detailState = useAssetDetail(assetId);
  const lookupsState = useAssets();
  const [formOpen, setFormOpen] = useState(false);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(location.search.includes('return=1'));

  const canManage = auth.accessProfile?.permissions?.can_manage_assets === true;
  const canDelete = auth.user?.role === 'admin' || auth.accessProfile?.permissions?.can_access_admin_portal === true;

  return (
    <SecureWorkspaceLayout title="ICT Service Desk Workspace" subtitle="Service Desk" activePath="/assets">
      <div className="secure-registry-page">
        <div className="asset-detail-secure-head">
          <Button variant="secondary" size="sm" onClick={() => navigate('/assets')}>Back</Button>
          <div>
            <h2>{detailState.asset?.model || detailState.asset?.asset_tag || 'Asset Detail'}</h2>
            <p>
              Asset tag: <strong>{detailState.asset?.asset_tag || `#${assetId}`}</strong>
              {detailState.asset?.status ? <span className="secure-status-inline">{detailState.asset.status}</span> : null}
            </p>
          </div>
          {canManage && detailState.asset ? (
            <div className="service-desk-secure-actions">
              <Button variant="secondary" size="sm" onClick={() => setFormOpen(true)} disabled={detailState.isMutating}>Edit Asset</Button>
              <Button variant="secondary" size="sm" onClick={() => setAssignmentOpen(true)} disabled={detailState.isMutating}>Reassign / Transfer</Button>
              {detailState.asset.assigned_to ? (
                <Button size="sm" onClick={() => setReturnOpen(true)} disabled={detailState.isMutating}>Return Asset</Button>
              ) : null}
              {canDelete ? (
                <Button variant="danger" size="sm" onClick={async () => {
                  await detailState.remove();
                  showToast({ tone: 'success', title: 'Asset deleted' });
                  navigate('/assets', { replace: true });
                }} disabled={detailState.isMutating}>
                  Delete Asset
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        {detailState.error ? (
          <ErrorState
            variant={String(detailState.error).toLowerCase().includes('not found') ? 'not-found' : 'data'}
            title="Asset detail unavailable"
            description={detailState.error}
            onRetry={detailState.refresh}
          />
        ) : detailState.isLoading ? (
          <LoadingState variant="detail" description="Loading asset detail..." />
        ) : (
          <AssetDetail
            asset={detailState.asset}
            canManage={canManage}
            canDelete={canDelete}
            onEdit={() => setFormOpen(true)}
            onAssign={() => setAssignmentOpen(true)}
            onReturn={() => setReturnOpen(true)}
            onDelete={async () => {
              await detailState.remove();
              showToast({ tone: 'success', title: 'Asset deleted' });
              navigate('/assets', { replace: true });
            }}
            isMutating={detailState.isMutating}
          />
        )}
      </div>

      <AssetFormModal
        open={formOpen}
        asset={detailState.asset}
        lookups={lookupsState.lookups}
        onClose={() => setFormOpen(false)}
        isSubmitting={detailState.isMutating}
        onSubmit={async (payload) => {
          await detailState.update(payload);
          showToast({ tone: 'success', title: 'Asset updated' });
        }}
      />

      <AssetAssignmentModal
        open={assignmentOpen}
        asset={detailState.asset}
        staff={lookupsState.lookups.staff}
        onClose={() => setAssignmentOpen(false)}
        onSubmit={async (payload) => {
          await detailState.assign(payload);
          showToast({ tone: 'success', title: 'Assignment saved' });
        }}
      />

      <ReturnAssetModal
        open={returnOpen}
        asset={detailState.asset}
        onClose={() => setReturnOpen(false)}
        onSubmit={async (payload) => {
          await detailState.returnAsset(payload);
          showToast({ tone: 'success', title: 'Asset returned' });
        }}
        isSubmitting={detailState.isMutating}
      />

    </SecureWorkspaceLayout>
  );
}
