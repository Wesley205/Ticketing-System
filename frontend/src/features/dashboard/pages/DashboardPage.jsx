import { Navigate } from 'react-router-dom';
import { SecureWorkspaceLayout } from '../../../components/layout/SecureWorkspaceLayout.jsx';
import { useAuth } from '../../auth/hooks/useAuth.js';
import { dashboardRole } from '../services/dashboard-api.js';
import { useDashboard } from '../hooks/useDashboard.js';
import { AdminDashboardPage } from './AdminDashboardPage.jsx';
import { IctOfficerDashboardPage } from './IctOfficerDashboardPage.jsx';
import { StaffDashboardPage } from './StaffDashboardPage.jsx';

function secureTitle(role) {
  if (role === 'admin') return 'Admin Dashboard';
  if (role === 'ict_officer') return 'ICT Officer Dashboard';
  if (role === 'technician') return 'Technician Dashboard';
  return 'Staff dashboard';
}

export function DashboardPage() {
  const auth = useAuth();
  const role = dashboardRole(auth.user, auth.accessProfile);
  const canUseGlobalFilters = auth.accessProfile?.permissions?.can_view_reports === true;
  const dashboard = useDashboard({ canUseGlobalFilters, enabled: role !== 'technician' });

  if (role === 'technician') {
    return <Navigate to="/technician/assigned-work" replace />;
  }

  return (
    <SecureWorkspaceLayout
      title={secureTitle(role)}
      subtitle={role === 'staff' ? 'ICT Service Hub' : 'Admin Portal'}
    >
      {role === 'admin' ? (
        <AdminDashboardPage dashboard={dashboard} />
      ) : role === 'ict_officer' ? (
        <IctOfficerDashboardPage dashboard={dashboard} />
      ) : (
        <StaffDashboardPage user={auth.user} />
      )}
    </SecureWorkspaceLayout>
  );
}
