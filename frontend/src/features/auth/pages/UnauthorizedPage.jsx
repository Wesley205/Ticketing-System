import { useLocation, useNavigate } from 'react-router-dom';
import { ErrorState } from '../../../components/feedback/ErrorState.jsx';

export function UnauthorizedPage() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <main className="auth-state-screen">
      <ErrorState
        variant="access"
        title="Access Restricted"
        description="You need an active session to continue. Sign in with an authorized account to return to this workspace."
        actionLabel="Sign In"
        onBack={() => navigate('/login', { state: { from: location.state?.from || '/dashboard' } })}
      />
    </main>
  );
}
