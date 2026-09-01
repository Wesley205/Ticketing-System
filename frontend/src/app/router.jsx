import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell.jsx';
import { LoadingState } from '../components/feedback/LoadingState.jsx';
import { FoundationShowcase } from '../components/layout/FoundationShowcase.jsx';
import { GuestRoute, ProtectedRoute } from '../features/auth/components/AuthGate.jsx';
import { ActivationPage } from '../features/auth/pages/ActivationPage.jsx';
import { AboutPage } from '../features/info/pages/AboutPage.jsx';
import { AuditLogsPage } from '../features/audit-logs/pages/AuditLogsPage.jsx';
import { ForbiddenPage } from '../features/auth/pages/ForbiddenPage.jsx';
import { LoginPage } from '../features/auth/pages/LoginPage.jsx';
import { UnauthorizedPage } from '../features/auth/pages/UnauthorizedPage.jsx';
import { AssetDetailPage } from '../features/assets/pages/AssetDetailPage.jsx';
import { AssetsPage } from '../features/assets/pages/AssetsPage.jsx';
import { useAuth } from '../features/auth/hooks/useAuth.js';
import { DashboardPage } from '../features/dashboard/pages/DashboardPage.jsx';
import { DepartmentsPage } from '../features/departments/pages/DepartmentsPage.jsx';
import { ReportsPage } from '../features/reports/pages/ReportsPage.jsx';
import { MaintenancePage } from '../features/maintenance/pages/MaintenancePage.jsx';
import { KnowledgeBasePage } from '../features/knowledge-base/pages/KnowledgeBasePage.jsx';
import { ServiceRequestsPage } from '../features/service-requests/pages/ServiceRequestsPage.jsx';
import { StaffPage } from '../features/staff/pages/StaffPage.jsx';
import { TicketDetailPage } from '../features/service-requests/pages/TicketDetailPage.jsx';
import { TechnicianDashboardPage } from '../features/technician/pages/TechnicianDashboardPage.jsx';
import { TechnicianWorkItemPage } from '../features/technician/pages/TechnicianWorkItemPage.jsx';

const protectedRoutes = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    description: 'Operational overview shell placeholder.',
    permissionKey: 'can_access_dashboard',
  },
  {
    path: '/foundation',
    label: 'Shared Foundation',
    description: 'Reusable components, utilities, and presentation primitives for the React migration.',
  },
  {
    path: '/service-requests',
    label: 'Service Desk',
    description: 'Ticket workflow shell placeholder.',
    permissionKey: 'can_access_service_desk',
  },
  {
    path: '/technician',
    label: 'Technician Portal',
    description: 'Assigned-work shell placeholder.',
    permissionKey: 'can_access_technician_portal',
  },
  {
    path: '/assets',
    label: 'Assets',
    description: 'Asset management shell placeholder.',
    permissionKey: 'can_access_assets',
  },
  {
    path: '/maintenance',
    label: 'Maintenance',
    description: 'Maintenance workspace shell placeholder.',
    permissionKey: 'can_manage_maintenance',
  },
  {
    path: '/staff',
    label: 'Staff',
    description: 'Staff administration shell placeholder.',
    permissionKey: 'can_access_staff_portal',
  },
  {
    path: '/departments',
    label: 'Departments',
    description: 'Department management shell placeholder.',
    permissionKey: 'can_access_departments',
  },
  {
    path: '/knowledge-base',
    label: 'Knowledge Base',
    description: 'Knowledge-base shell placeholder.',
    permissionKey: 'can_access_knowledge_base',
  },
  {
    path: '/reports',
    label: 'Reports',
    description: 'Reporting shell placeholder.',
    permissionKey: 'can_view_reports',
  },
  {
    path: '/audit-logs',
    label: 'Audit Logs',
    description: 'Audit oversight shell placeholder.',
    permissionKey: 'can_view_audit_logs',
  },
  {
    path: '/about',
    label: 'About',
    description: 'System information shell placeholder.',
  },
];

function AuthenticatedLanding() {
  const auth = useAuth();

  if (!auth.isReady) {
    return <LoadingState title="Loading session..." description="Checking for an active authenticated session." />;
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

function RoutePlaceholder({ label, description }) {
  return (
    <AppShell title={label} subtitle={description} eyebrow="Phase 3">
      <div className="react-panel">
        <p className="react-copy">
          React route placeholder only. Legacy behavior still lives in the static
          HTML pages while the migration proceeds module by module.
        </p>
      </div>
    </AppShell>
  );
}

function FoundationRoute() {
  return (
    <AppShell
      title="Shared Foundation"
      subtitle="Reusable components, utilities, and presentation primitives for the React migration."
      eyebrow="Phase 2"
    >
      <FoundationShowcase />
    </AppShell>
  );
}

function ProtectedAppRoute({ route }) {
  let content = <RoutePlaceholder label={route.label} description={route.description} />;
  if (route.path === '/foundation') {
    content = <FoundationRoute />;
  }
  if (route.path === '/dashboard') {
    content = (
      <AppShell
        title="Dashboard"
        subtitle="Role-aware operational metrics and scoped dashboard filters."
        eyebrow="Phase 9"
      >
        <DashboardPage />
      </AppShell>
    );
  }
  if (route.path === '/reports') {
    content = (
      <AppShell
        title="Reports"
        subtitle="Permission-aware metrics, filters, paginated detail rows, and CSV exports."
        eyebrow="Phase 9"
      >
        <ReportsPage />
      </AppShell>
    );
  }
  if (route.path === '/service-requests') {
    content = (
      <AppShell
        title="Service Desk"
        subtitle="Ticket workflows, assignment, comments, attachments, and history."
        eyebrow="Phase 4"
      >
        <ServiceRequestsPage />
      </AppShell>
    );
  }
  if (route.path === '/technician') {
    content = (
      <AppShell
        title="Technician Workspace"
        subtitle="Assigned ticket execution, resolution logging, and maintenance work."
        eyebrow="Phase 5"
      >
        <TechnicianDashboardPage />
      </AppShell>
    );
  }
  if (route.path === '/assets') {
    content = (
      <AppShell
        title="Assets"
        subtitle="Asset registry, assignment workflow, return processing, and lifecycle visibility."
        eyebrow="Phase 6"
      >
        <AssetsPage />
      </AppShell>
    );
  }
  if (route.path === '/maintenance') {
    content = (
      <AppShell
        title="Maintenance"
        subtitle="Maintenance records, preventive schedules, checklist tracking, and technician assignment."
        eyebrow="Phase 7"
      >
        <MaintenancePage />
      </AppShell>
    );
  }
  if (route.path === '/departments') {
    content = (
      <AppShell
        title="Departments"
        subtitle="Department records, membership, linked assets, and operational context."
        eyebrow="Phase 8"
      >
        <DepartmentsPage />
      </AppShell>
    );
  }
  if (route.path === '/staff') {
    content = (
      <AppShell
        title="Staff Management"
        subtitle="Account lifecycle, directory access, and administrator-issued invitations."
        eyebrow="Phase 7"
      >
        <StaffPage />
      </AppShell>
    );
  }
  if (route.path === '/knowledge-base') {
    content = (
      <AppShell
        title="Knowledge Base"
        subtitle="Searchable ICT guidance, article feedback, and permission-aware article management."
        eyebrow="Phase 8"
      >
        <KnowledgeBasePage />
      </AppShell>
    );
  }
  if (route.path === '/audit-logs') {
    content = (
      <AppShell
        title="Audit Logs"
        subtitle="Read-only oversight trail for authorized system activity."
        eyebrow="Phase 10"
      >
        <AuditLogsPage />
      </AppShell>
    );
  }
  if (route.path === '/about') {
    content = (
      <AppShell
        title="About the System"
        subtitle="System purpose, scope, technology stack, and operational limitations."
        eyebrow="Phase 10"
      >
        <AboutPage />
      </AppShell>
    );
  }

  return (
    <ProtectedRoute permissionKey={route.permissionKey}>
      {content}
    </ProtectedRoute>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuthenticatedLanding />} />
        <Route
          path="/login"
          element={(
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
          )}
        />
        <Route
          path="/activate"
          element={(
            <GuestRoute>
              <ActivationPage />
            </GuestRoute>
          )}
        />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />
        {protectedRoutes.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={<ProtectedAppRoute route={route} />}
          />
        ))}
        <Route
          path="/service-requests/:ticketId"
          element={(
            <ProtectedRoute permissionKey="can_access_service_desk">
              <AppShell
                title="Service Desk"
                subtitle="Ticket workflows, assignment, comments, attachments, and history."
                eyebrow="Phase 4"
              >
                <TicketDetailPage />
              </AppShell>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/technician/work/:itemType/:itemId"
          element={(
            <ProtectedRoute permissionKey="can_access_technician_portal">
              <AppShell
                title="Technician Workspace"
                subtitle="Focused execution workspace for assigned tickets and maintenance."
                eyebrow="Phase 5"
              >
                <TechnicianWorkItemPage />
              </AppShell>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/assets/:assetId"
          element={(
            <ProtectedRoute permissionKey="can_access_assets">
              <AppShell
                title="Assets"
                subtitle="Asset registry, assignment workflow, return processing, and lifecycle visibility."
                eyebrow="Phase 6"
              >
                <AssetDetailPage />
              </AppShell>
            </ProtectedRoute>
          )}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
