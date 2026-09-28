import { useState } from 'react';
import { Button } from '../../../components/forms/Button.jsx';
import { ErrorState } from '../../../components/feedback/ErrorState.jsx';
import { LoadingState } from '../../../components/feedback/LoadingState.jsx';
import { SecureWorkspaceLayout } from '../../../components/layout/SecureWorkspaceLayout.jsx';
import { hasPermission } from '../../../permissions/access.js';
import { useAuth } from '../../auth/hooks/useAuth.js';
import { AuditLogFilters } from '../components/AuditLogFilters.jsx';
import { AuditLogTable } from '../components/AuditLogTable.jsx';
import { useAuditLogs } from '../hooks/useAuditLogs.js';
import { downloadAuditLogCsv } from '../services/audit-logs-api.js';

export function AuditLogsPage() {
  const auth = useAuth();
  const canViewAuditLogs = hasPermission(auth.accessProfile, 'can_view_audit_logs');
  const auditLogs = useAuditLogs({ enabled: auth.isReady && canViewAuditLogs });
  const [filtersOpen, setFiltersOpen] = useState(false);

  function handleExport() {
    downloadAuditLogCsv(auditLogs.rows);
  }

  if (!canViewAuditLogs) {
    return (
      <ErrorState
        title="Audit logs unavailable"
        description="Your account does not have permission to view system audit records."
      />
    );
  }

  return (
    <SecureWorkspaceLayout title="Audit Trail" subtitle="ICT Service Hub">
      <div className="audit-secure-page secure-registry-page">
        <div className="service-desk-secure-head">
          <div>
            <h2>System Audit Trail</h2>
            <p>Track system changes, exports, and user actions across the ICT service hub.</p>
          </div>
          <div className="service-desk-secure-actions">
            <Button variant="secondary" className="ui-button-with-icon" onClick={() => auditLogs.loadAuditLogs(auditLogs.filters)} disabled={auditLogs.isLoading}>
              <span className="nsc-action-icon nsc-action-icon-refresh" aria-hidden="true" />
              Refresh
            </Button>
            <Button className="ui-button-with-icon" onClick={handleExport} disabled={!auditLogs.rows.length}>
              <span className="nsc-action-icon nsc-action-icon-download" aria-hidden="true" />
              Export Audit Report
            </Button>
          </div>
        </div>

        <div className={`secure-filter-bar audit-filter-shell${filtersOpen ? ' open' : ''}`}>
          <button
            type="button"
            className="audit-filter-toggle"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <span className="nsc-action-icon nsc-action-icon-filter" aria-hidden="true" />
            Filters
          </button>
          <div className="audit-filter-panel">
            <AuditLogFilters
              filters={auditLogs.filters}
              isLoading={auditLogs.isLoading}
              onChange={auditLogs.updateFilter}
              onReset={auditLogs.resetFilters}
              onApply={() => {
                auditLogs.loadAuditLogs(auditLogs.filters);
                setFiltersOpen(false);
              }}
            />
          </div>
          <div className="secure-filter-meta">
            <span>{auditLogs.rows.length} audit entries loaded</span>
            <small>Read-only system record</small>
          </div>
        </div>

        {auditLogs.error ? (
          <ErrorState
            title="Audit records unavailable"
            description={auditLogs.error}
            onRetry={() => auditLogs.loadAuditLogs(auditLogs.filters)}
          />
        ) : null}

        <section className="secure-data-panel audit-secure-table">
          {auditLogs.isLoading ? (
            <LoadingState variant="table" description="Loading read-only audit records..." />
          ) : (
            <AuditLogTable rows={auditLogs.rows} />
          )}
        </section>
      </div>
    </SecureWorkspaceLayout>
  );
}
