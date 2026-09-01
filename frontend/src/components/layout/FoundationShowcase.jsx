import { useState } from 'react';
import { useToast } from '../../hooks/useToast.js';
import { formatCurrency, formatDate, formatDateTime } from '../../lib/formatting.js';
import { buildQueryParams } from '../../lib/query-params.js';
import { buildAccessProfile } from '../../permissions/access.js';
import { Button } from '../forms/Button.jsx';
import { FormField } from '../forms/FormField.jsx';
import { FormSection } from '../forms/FormSection.jsx';
import { DataTable } from '../tables/DataTable.jsx';
import { Pagination } from '../tables/Pagination.jsx';
import { Modal } from '../modals/Modal.jsx';
import { ConfirmDialog } from '../modals/ConfirmDialog.jsx';
import { LoadingState } from '../feedback/LoadingState.jsx';
import { EmptyState } from '../feedback/EmptyState.jsx';
import { ErrorState } from '../feedback/ErrorState.jsx';
import { SuccessState } from '../feedback/SuccessState.jsx';
import { StatusBadge } from '../status/StatusBadge.jsx';
import { PriorityBadge } from '../status/PriorityBadge.jsx';
import { DetailPanel } from '../status/DetailPanel.jsx';
import { TimelineList } from '../status/TimelineList.jsx';
import { CommentThread } from '../status/CommentThread.jsx';
import { AttachmentList } from '../status/AttachmentList.jsx';
import { PageHero } from './PageHero.jsx';
import { Panel } from './Panel.jsx';

const sampleRows = [
  {
    key: 'TCK-2026-001',
    ticket: 'NSC-2026-001',
    requester: 'Mariam Yusuf',
    status: 'In Progress',
    priority: 'High',
  },
  {
    key: 'TCK-2026-002',
    ticket: 'NSC-2026-002',
    requester: 'James Edet',
    status: 'Resolved',
    priority: 'Medium',
  },
];

const sampleTimeline = [
  { id: 1, title: 'Ticket created', description: 'Submitted by requester through the service desk.', timestamp: '2026-08-31T08:15:00Z' },
  { id: 2, title: 'Assigned', description: 'Assigned to technician work queue.', timestamp: '2026-08-31T09:10:00Z' },
];

const sampleComments = [
  { id: 1, author: 'ICT Officer', body: 'Awaiting confirmation from the requester.', timestamp: '2026-08-31T10:00:00Z' },
  { id: 2, author: 'Technician', body: 'Adapter replaced and diagnostics completed.', timestamp: '2026-08-31T11:45:00Z' },
];

const sampleAttachments = [
  { id: 1, fileName: 'diagnostic-report.pdf', sizeLabel: '245 KB', timestamp: '2026-08-31T11:20:00Z' },
  { id: 2, fileName: 'before-repair.jpg', sizeLabel: '1.2 MB', timestamp: '2026-08-31T09:25:00Z' },
];

export function FoundationShowcase() {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { showToast, dismissToast } = useToast();
  const accessProfile = buildAccessProfile({ user_id: 1, role: 'ict_officer', department_id: 2 });
  const sampleQuery = buildQueryParams({ status: 'Assigned', page: 2, category: 'Network' }).toString();

  return (
    <div className="ui-stack-lg">
      <PageHero
        eyebrow="Phase 2 Foundation"
        title="Shared React Component Library"
        description="These primitives are presentation-only and decoupled from the static feature pages and backend workflows."
        meta={[accessProfile.roleLabel, formatDate('2026-08-31'), sampleQuery]}
      />

      <Panel
        title="Buttons, badges, and toasts"
        actions={
          <div className="ui-inline-actions">
            <Button onClick={() => showToast({ tone: 'success', title: 'Foundation ready', message: 'Shared components mounted successfully.' })}>
              Show success toast
            </Button>
            <Button variant="secondary" onClick={() => showToast({ tone: 'info', title: 'Proxy target', message: 'API base defaults to /api.' })}>
              Show info toast
            </Button>
          </div>
        }
      >
        <div className="ui-inline-actions">
          <StatusBadge value="In Progress" />
          <StatusBadge value="Completed" />
          <StatusBadge value="Cancelled" />
          <PriorityBadge value="Low" />
          <PriorityBadge value="High" />
          <PriorityBadge value="Critical" />
        </div>
      </Panel>

      <div className="ui-grid-2">
        <Panel title="Form primitives">
          <FormSection
            title="Reusable field wrappers"
            description="This section demonstrates neutral form primitives without domain coupling."
          >
            <FormField label="Display label" htmlFor="showcase-input" hint="Hints and validation copy are supported.">
              <input id="showcase-input" className="ui-input" placeholder="Placeholder input" />
            </FormField>
            <FormField label="Validation state" htmlFor="showcase-select" error="Example validation copy.">
              <select id="showcase-select" className="ui-input">
                <option>Draft</option>
                <option>Published</option>
              </select>
            </FormField>
          </FormSection>
        </Panel>

        <Panel title="Feedback states">
          <div className="ui-stack-md">
            <LoadingState description="Reusable loading state for async views." />
            <SuccessState description={`Maintenance estimate: ${formatCurrency(125000)}`} />
            <EmptyState description="Use this when filtered results return no rows." />
            <ErrorState description="Use this for retryable network and rendering failures." />
          </div>
        </Panel>
      </div>

      <Panel title="Tables and pagination">
        <div className="ui-stack-md">
          <DataTable
            columns={[
              { key: 'ticket', label: 'Ticket' },
              { key: 'requester', label: 'Requester' },
              { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> },
              { key: 'priority', label: 'Priority', render: (row) => <PriorityBadge value={row.priority} /> },
            ]}
            rows={sampleRows}
            emptyState={<EmptyState title="No sample rows" description="The table empty state renders here when needed." />}
          />
          <Pagination page={2} totalPages={5} onPrevious={() => {}} onNext={() => {}} />
        </div>
      </Panel>

      <div className="ui-grid-2">
        <DetailPanel
          title="Detail panel, timeline, comments, and attachments"
          aside={<StatusBadge value="Active" />}
        >
          <div className="ui-stack-md">
            <p className="react-copy">
              Date helpers: {formatDateTime('2026-08-31T14:30:00Z')} and {formatDate('2026-08-31')}.
            </p>
            <TimelineList items={sampleTimeline} />
            <CommentThread comments={sampleComments} />
            <AttachmentList attachments={sampleAttachments} />
          </div>
        </DetailPanel>

        <Panel title="Modal primitives">
          <div className="ui-inline-actions">
            <Button onClick={() => setModalOpen(true)}>Open modal</Button>
            <Button variant="danger" onClick={() => setConfirmOpen(true)}>
              Open confirmation
            </Button>
          </div>
        </Panel>
      </div>

      <Modal
        open={modalOpen}
        title="Shared modal"
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                showToast({ tone: 'success', title: 'Modal confirmed', message: 'Dialog actions are reusable across features.' });
                setModalOpen(false);
              }}
            >
              Confirm
            </Button>
          </>
        }
      >
        <p className="react-copy">This modal is intentionally generic and feature-agnostic.</p>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirmation dialog"
        description="This dialog is suitable for destructive or irreversible flows."
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          const toastId = showToast({ tone: 'danger', title: 'Confirmed action', message: 'The reusable confirmation dialog handled the action.' });
          setConfirmOpen(false);
          setTimeout(() => dismissToast(toastId), 2200);
        }}
      />
    </div>
  );
}
