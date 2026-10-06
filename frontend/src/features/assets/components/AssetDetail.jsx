import { DetailPanel } from '../../../components/status/DetailPanel.jsx';
import { StatusBadge } from '../../../components/status/StatusBadge.jsx';
import { formatDate, formatDateTime } from '../../../lib/formatting.js';
import { AssetHistoryTimeline } from './AssetHistoryTimeline.jsx';

export function AssetDetail({
  asset,
  canManage = false,
  canDelete = false,
  onEdit,
  onAssign,
  onReturn,
  onDelete,
  isMutating = false,
}) {
  if (!asset) {
    return (
      <DetailPanel title="Asset Detail">
        <p className="react-copy">Select an asset to inspect lifecycle history, linked tickets, and maintenance context.</p>
      </DetailPanel>
    );
  }

  return (
    <div className="secure-detail-grid">
      <section className="secure-detail-column">
        <DetailPanel title="Asset details">
          <div className="secure-definition-grid">
            <div><span>Asset / Model</span><strong>{asset.brand} {asset.model || asset.asset_type}</strong></div>
            <div><span>Serial number</span><strong>{asset.serial_number || '-'}</strong></div>
            <div><span>Purchase date</span><strong>{formatDate(asset.purchase_date)}</strong></div>
            <div><span>Location</span><strong>{asset.location || '-'}</strong></div>
            <div><span>Floor</span><strong>{asset.floor_label || '-'}</strong></div>
          </div>
          <p className="react-copy">{asset.description || 'No asset description recorded.'}</p>
        </DetailPanel>

        <DetailPanel title="Assignment">
          <div className="secure-definition-grid">
            <div><span>Assigned to</span><strong>{asset.assigned_staff_name || 'Unassigned'}</strong></div>
            <div><span>Department</span><strong>{asset.department_name || '-'}</strong></div>
            <div><span>Condition</span><strong>{asset.condition || '-'}</strong></div>
            <div><span>Return due</span><strong>{formatDate(asset.expected_return_at)}</strong></div>
          </div>
        </DetailPanel>

        <DetailPanel title="Related tickets">
          <div className="ui-stack-sm">
            {(asset.linked_tickets || []).length ? (asset.linked_tickets || []).map((ticket) => (
              <article key={ticket.request_id} className="secure-related-row">
                <div>
                  <strong>{ticket.ticket_number || `Ticket #${ticket.request_id}`}</strong>
                  <span>{ticket.subject}</span>
                </div>
                <StatusBadge value={ticket.status} />
              </article>
            )) : <p className="react-copy">No service requests are currently linked to this asset.</p>}
          </div>
        </DetailPanel>
      </section>

      <section className="secure-detail-column">
        <DetailPanel title="Maintenance history">
          <div className="ui-stack-sm">
            {(asset.maintenance_history || []).length ? (asset.maintenance_history || []).map((entry) => (
              <article key={entry.maintenance_id} className="secure-history-row">
                <div>
                  <strong>{entry.maintenance_type || 'Maintenance'}</strong>
                  <span>{entry.problem || 'No maintenance issue recorded.'}</span>
                </div>
                <small>{formatDateTime(entry.maintenance_date)}</small>
              </article>
            )) : <p className="react-copy">No maintenance records found for this asset.</p>}
          </div>
        </DetailPanel>

        <DetailPanel title="Assignment history">
          <AssetHistoryTimeline
            assignmentHistory={asset.assignment_history || []}
            statusHistory={asset.status_history || []}
          />
        </DetailPanel>

        {canManage ? (
          <DetailPanel title={canDelete ? 'Admin controls' : 'Lifecycle controls'}>
            <div className="secure-admin-actions">
              <button type="button" onClick={() => onEdit(asset)} disabled={isMutating}>Edit Asset</button>
              <button type="button" onClick={() => onAssign(asset)} disabled={isMutating}>Reassign / Transfer</button>
              {asset.assigned_to ? <button type="button" onClick={() => onReturn(asset)} disabled={isMutating}>Return Asset</button> : null}
              {canDelete ? <button type="button" className="danger" onClick={() => onDelete(asset)} disabled={isMutating}>Delete Asset</button> : null}
            </div>
          </DetailPanel>
        ) : null}
      </section>
    </div>
  );
}
