import { Link } from 'react-router-dom';
import { Button } from '../../../components/forms/Button.jsx';
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
    <div className="ui-stack-lg">
      <DetailPanel
        title={`${asset.asset_tag} - ${asset.asset_type}`}
        aside={(
          <div className="ui-inline-actions">
            <StatusBadge value={asset.status} />
            <span className="ui-chip">{asset.condition || 'Unknown condition'}</span>
          </div>
        )}
      >
        <div className="ticket-kpi-grid">
          <div className="ticket-kpi-card"><span>Department</span><strong>{asset.department_name || '-'}</strong></div>
          <div className="ticket-kpi-card"><span>Assigned To</span><strong>{asset.assigned_staff_name || 'Unassigned'}</strong></div>
          <div className="ticket-kpi-card"><span>Serial Number</span><strong>{asset.serial_number || '-'}</strong></div>
          <div className="ticket-kpi-card"><span>Purchase Date</span><strong>{formatDate(asset.purchase_date)}</strong></div>
        </div>

        <div className="ticket-meta-grid">
          <div><strong>Brand</strong><span>{asset.brand || '-'}</span></div>
          <div><strong>Model</strong><span>{asset.model || '-'}</span></div>
          <div><strong>Location</strong><span>{asset.location || '-'}</span></div>
          <div><strong>Status</strong><span>{asset.status || '-'}</span></div>
          <div><strong>Condition</strong><span>{asset.condition || '-'}</span></div>
          <div><strong>Asset ID</strong><span>{asset.asset_id}</span></div>
        </div>

        <section className="ticket-block">
          <strong>Description</strong>
          <p className="react-copy">{asset.description || 'No asset description recorded.'}</p>
        </section>

        {canManage ? (
          <section className="ticket-block">
            <div className="ui-inline-actions">
              <Button variant="secondary" onClick={() => onEdit(asset)} disabled={isMutating}>Edit Asset</Button>
              <Button onClick={() => onAssign(asset)} disabled={isMutating}>
                {asset.assigned_to ? 'Reassign Asset' : 'Assign Asset'}
              </Button>
              {asset.assigned_to ? (
                <Button variant="secondary" onClick={() => onReturn(asset)} disabled={isMutating}>Process Return</Button>
              ) : null}
              {canDelete ? (
                <Button variant="danger" onClick={() => onDelete(asset)} disabled={isMutating}>Delete Asset</Button>
              ) : null}
            </div>
          </section>
        ) : null}

        <section className="ticket-block">
          <strong>Linked Tickets</strong>
          <div className="ui-stack-md">
            {(asset.linked_tickets || []).length ? (asset.linked_tickets || []).map((ticket) => (
              <article key={ticket.request_id} className="ticket-related-item">
                <div>
                  <strong>{ticket.ticket_number || `#${ticket.request_id}`}</strong>
                  <p className="react-copy">{ticket.subject}</p>
                </div>
                <div className="ui-inline-actions">
                  <StatusBadge value={ticket.status} />
                  <Link to={`/service-requests/${ticket.request_id}`}>Open ticket</Link>
                </div>
              </article>
            )) : <p className="react-copy">No service requests are currently linked to this asset.</p>}
          </div>
        </section>

        <section className="ticket-block">
          <strong>Maintenance History</strong>
          <div className="ui-stack-md">
            {(asset.maintenance_history || []).length ? (asset.maintenance_history || []).map((entry) => (
              <article key={entry.maintenance_id} className="ticket-related-item">
                <div>
                  <strong>{entry.maintenance_type || 'Maintenance'} #{entry.maintenance_id}</strong>
                  <p className="react-copy">{entry.problem || 'No maintenance issue recorded.'}</p>
                </div>
                <div className="ui-inline-actions">
                  <StatusBadge value={entry.status} />
                  <span className="ticket-muted-note">{formatDateTime(entry.maintenance_date)}</span>
                </div>
              </article>
            )) : <p className="react-copy">No maintenance records found for this asset.</p>}
          </div>
        </section>

        <section className="ticket-block">
          <strong>Lifecycle History</strong>
          <AssetHistoryTimeline
            assignmentHistory={asset.assignment_history || []}
            statusHistory={asset.status_history || []}
          />
        </section>
      </DetailPanel>
    </div>
  );
}
