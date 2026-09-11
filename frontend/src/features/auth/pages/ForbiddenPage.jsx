import { useNavigate } from 'react-router-dom';
import { ErrorState } from '../../../components/feedback/ErrorState.jsx';

export function ForbiddenPage() {
  const navigate = useNavigate();

  return (
    <main className="auth-state-screen">
      <ErrorState
        variant="access"
        title="Access Restricted"
        description="You don't have permission to view this content. Contact your NSC ICT administrator if you require authorization."
        actionLabel="Go Back"
        onBack={() => navigate('/dashboard')}
      />
    </main>
  );
}
