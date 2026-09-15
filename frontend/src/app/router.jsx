import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell.jsx';
import { FoundationShowcase } from '../components/layout/FoundationShowcase.jsx';
import { GuestRoute, ProtectedRoute } from '../features/auth/components/AuthGate.jsx';
import { AccountHelpPage } from '../features/auth/pages/AccountHelpPage.jsx';
import { ActivationPage } from '../features/auth/pages/ActivationPage.jsx';
import { AboutPage } from '../features/info/pages/AboutPage.jsx';
import { AuditLogsPage } from '../features/audit-logs/pages/AuditLogsPage.jsx';
import { ForbiddenPage } from '../features/auth/pages/ForbiddenPage.jsx';
import { LoginPage } from '../features/auth/pages/LoginPage.jsx';
import { NotFoundPage } from '../features/auth/pages/NotFoundPage.jsx';
import { UnauthorizedPage } from '../features/auth/pages/UnauthorizedPage.jsx';
import { AssetDetailPage } from '../features/assets/pages/AssetDetailPage.jsx';
import { AssetsPage } from '../features/assets/pages/AssetsPage.jsx';
import { DashboardPage } from '../features/dashboard/pages/DashboardPage.jsx';
import { DepartmentsPage } from '../features/departments/pages/DepartmentsPage.jsx';
import { ReportsPage } from '../features/reports/pages/ReportsPage.jsx';
import { MaintenancePage } from '../features/maintenance/pages/MaintenancePage.jsx';
import { KnowledgeBasePage } from '../features/knowledge-base/pages/KnowledgeBasePage.jsx';
import { NotificationInboxPage } from '../features/notifications/pages/NotificationInboxPage.jsx';
import { ServiceRequestsPage } from '../features/service-requests/pages/ServiceRequestsPage.jsx';
import { StaffPage } from '../features/staff/pages/StaffPage.jsx';
import { TicketDetailPage } from '../features/service-requests/pages/TicketDetailPage.jsx';
import { TechnicianDashboardPage } from '../features/technician/pages/TechnicianDashboardPage.jsx';
import { TechnicianAssignedWorkPage } from '../features/technician/pages/TechnicianAssignedWorkPage.jsx';
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
      <DashboardPage />
    );
  }
  if (route.path === '/reports') {
    content = (
      <ReportsPage />
    );
  }
  if (route.path === '/service-requests') {
    content = (
      <ServiceRequestsPage />
    );
  }
  if (route.path === '/technician') {
    content = (
      <TechnicianDashboardPage />
    );
  }
  if (route.path === '/assets') {
    content = (
      <AssetsPage />
    );
  }
  if (route.path === '/maintenance') {
    content = (
      <MaintenancePage />
    );
  }
  if (route.path === '/departments') {
    content = (
      <DepartmentsPage />
    );
  }
  if (route.path === '/staff') {
    content = (
      <StaffPage />
    );
  }
  if (route.path === '/knowledge-base') {
    content = (
      <KnowledgeBasePage />
    );
  }
  if (route.path === '/audit-logs') {
    content = (
      <AuditLogsPage />
    );
  }
  if (route.path === '/about') {
    content = (
      <AboutPage />
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
        <Route path="/" element={<Navigate to="/login" replace />} />
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
        <Route path="/help" element={<AccountHelpPage />} />
        <Route
          path="/notifications"
          element={(
            <ProtectedRoute permissionKey="can_access_notifications">
              <NotificationInboxPage />
            </ProtectedRoute>
          )}
        />
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
              <TicketDetailPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/technician/assigned-work"
          element={(
            <ProtectedRoute permissionKey="can_access_technician_portal">
              <TechnicianAssignedWorkPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/technician/work/:itemType/:itemId"
          element={(
            <ProtectedRoute permissionKey="can_access_technician_portal">
              <TechnicianWorkItemPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/assets/:assetId"
          element={(
            <ProtectedRoute permissionKey="can_access_assets">
              <AssetDetailPage />
            </ProtectedRoute>
          )}
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
