import { useNavigate } from 'react-router-dom';
import { ErrorState } from '../../../components/feedback/ErrorState.jsx';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <main className="auth-state-screen">
      <ErrorState
        variant="not-found"
        title="Page not found"
        description="The page you're looking for doesn't exist or may have been moved."
        actionLabel="Go Back"
        onRetry={() => navigate(-1)}
      />
    </main>
  );
}
