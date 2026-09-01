import { ErrorState } from '../../../components/feedback/ErrorState.jsx';
import { LoadingState } from '../../../components/feedback/LoadingState.jsx';
import { PageHero } from '../../../components/layout/PageHero.jsx';
import { Panel } from '../../../components/layout/Panel.jsx';
import { useAuth } from '../../auth/hooks/useAuth.js';
import { DashboardChart } from '../components/DashboardChart.jsx';
import { DashboardFilters } from '../components/DashboardFilters.jsx';
import { DashboardMetricCards } from '../components/DashboardMetricCards.jsx';
import { TechnicianWorkloadTable } from '../components/TechnicianWorkloadTable.jsx';
import { getDashboardHeading, getDashboardScope } from '../services/dashboard-api.js';
import { useDashboard } from '../hooks/useDashboard.js';

export function DashboardPage() {
  const auth = useAuth();
  const canUseGlobalFilters = auth.accessProfile?.permissions?.can_view_reports === true;
  const dashboard = useDashboard({ canUseGlobalFilters });
  const scopeLabel = getDashboardScope(auth.accessProfile);

  return (
    <div className="ui-stack-lg">
      <PageHero
        eyebrow="Phase 9"
        title={getDashboardHeading(auth.accessProfile)}
        description="Role-aware operational metrics are calculated by the existing backend dashboard endpoint and scoped by server authorization policy."
        meta={[
          auth.accessProfile?.role_label || 'User',
          scopeLabel,
          auth.user?.user_type || 'internal user',
        ]}
      />

      <Panel
        title="Dashboard Filters"
        actions={dashboard.isFilterLoading ? <span className="ui-chip">Loading filter options</span> : null}
      >
        <DashboardFilters
          filters={dashboard.draftFilters}
          filterOptions={dashboard.filterOptions}
          canUseGlobalFilters={canUseGlobalFilters}
          isLoading={dashboard.isLoading}
          onChange={dashboard.updateDraftFilter}
          onApply={dashboard.applyFilters}
          onReset={dashboard.resetFilters}
        />
      </Panel>

      {dashboard.error ? (
        <ErrorState
          title="Dashboard unavailable"
          description={dashboard.error}
          onRetry={() => dashboard.loadDashboard(dashboard.filters)}
        />
      ) : null}

      {dashboard.isLoading ? (
        <LoadingState description="Loading scoped dashboard metrics..." />
      ) : (
        <>
          <DashboardMetricCards stats={dashboard.stats} />

          <div className="dashboard-chart-grid">
            <DashboardChart
              title="Tickets by Status"
              rows={dashboard.stats?.tickets_by_status || []}
              labelKey="status"
            />
            <DashboardChart
              title="Tickets by Priority"
              rows={dashboard.stats?.tickets_by_priority || []}
              labelKey="priority"
            />
            <DashboardChart
              title="Assets by Status"
              rows={dashboard.stats?.assets_by_status || []}
              labelKey="status"
            />
            <section className="react-panel dashboard-chart-panel">
              <div className="ui-panel-head">
                <h3>Technician Workload</h3>
                <span className="ui-chip">{canUseGlobalFilters ? 'Visible' : 'Scoped out'}</span>
              </div>
              <TechnicianWorkloadTable rows={dashboard.stats?.technician_workload || []} />
            </section>
          </div>
        </>
      )}
    </div>
  );
}
