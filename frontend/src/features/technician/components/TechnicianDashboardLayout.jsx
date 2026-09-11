import { SecureWorkspaceLayout } from '../../../components/layout/SecureWorkspaceLayout.jsx';

export function TechnicianDashboardLayout({ children }) {
  return (
    <SecureWorkspaceLayout
      title="Technician Dashboard"
      subtitle="ICT Secure Operations"
    >
      {children}
    </SecureWorkspaceLayout>
  );
}
