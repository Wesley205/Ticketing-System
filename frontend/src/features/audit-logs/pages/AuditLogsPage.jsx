import { Button } from '../../../components/forms/Button.jsx';
import { ErrorState } from '../../../components/feedback/ErrorState.jsx';
import { LoadingState } from '../../../components/feedback/LoadingState.jsx';
import { PageHero } from '../../../components/layout/PageHero.jsx';
import { Panel } from '../../../components/layout/Panel.jsx';
import { hasPermission } from '../../../permissions/access.js';
import { useAuth } from '../../auth/hooks/useAuth.js';
import { AuditLogFilters } from '../components/AuditLogFilters.jsx';
import { AuditLogTable } from '../components/AuditLogTable.jsx';
import { useAuditLogs } from '../hooks/useAuditLogs.js';

export function AuditLogsPage() {
  const auth = useAuth();
  const canViewAuditLogs = hasPermission(auth.accessProfile, 'can_view_audit_logs');
  const auditLogs = useAuditLogs({ enabled: auth.isReady && canViewAuditLogs });

  if (!canViewAuditLogs) {
    return (
      <ErrorState
        title="Audit logs unavailable"
        description="Your account does not have permission to view system audit records."
      />
    );
  }

  return (
    <div className="ui-stack-lg">
      <PageHero
        eyebrow="Phase 10"
        title="Audit Logs"
        description="Read-only audit visibility for authorized oversight users. Record access and scope remain enforced by the backend."
        meta={[
          auth.accessProfile?.role_label || 'User',
          `${auditLogs.rows.length} records loaded`,
          'Read-only',
        ]}
      />

      <Panel
        title="Audit Filters"
        actions={(
          <div className="ui-inline-actions">
            <Button variant="secondary" onClick={() => auditLogs.loadAuditLogs(auditLogs.filters)} disabled={auditLogs.isLoading}>
              Refresh
            </Button>
            <a href="/audit-logs">
              <Button variant="secondary">Refresh Audit Logs</Button>
            </a>
          </div>
        )}
      >
        <AuditLogFilters
          filters={auditLogs.filters}
          isLoading={auditLogs.isLoading}
          onChange={auditLogs.updateFilter}
          onReset={auditLogs.resetFilters}
        />
      </Panel>

      {auditLogs.error ? (
        <ErrorState
          title="Audit records unavailable"
          description={auditLogs.error}
          onRetry={() => auditLogs.loadAuditLogs(auditLogs.filters)}
        />
      ) : null}

      <Panel title="Audit Records">
        {auditLogs.isLoading ? (
          <LoadingState description="Loading read-only audit records..." />
        ) : (
          <AuditLogTable rows={auditLogs.rows} />
        )}
      </Panel>
    </div>
  );
}
