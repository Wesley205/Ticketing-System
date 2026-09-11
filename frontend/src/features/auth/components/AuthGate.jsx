import { Navigate, useLocation } from 'react-router-dom';
import { LoadingState } from '../../../components/feedback/LoadingState.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { resolveGuestRoute, resolveProtectedRoute } from '../services/auth-service.js';

export function ProtectedRoute({ children, permissionKey = null }) {
  const location = useLocation();
  const auth = useAuth();
  const decision = resolveProtectedRoute({
    isReady: auth.isReady,
    isAuthenticated: auth.isAuthenticated,
    accessProfile: auth.accessProfile,
    permissionKey,
    returnTo: `${location.pathname}${location.search}${location.hash}`,
  });

  if (decision.reason === 'loading') {
    return <LoadingState variant="overlay" title="Loading session..." description="Validating your account access." />;
  }

  if (!decision.allowed) {
    return (
      <Navigate
        to={decision.redirectTo}
        replace
        state={{ from: decision.returnTo, reason: decision.reason }}
      />
    );
  }

  return children;
}

export function GuestRoute({ children }) {
  const auth = useAuth();
  const decision = resolveGuestRoute({
    isReady: auth.isReady,
    isAuthenticated: auth.isAuthenticated,
    accessProfile: auth.accessProfile,
  });

  if (!auth.isReady) {
    return <LoadingState variant="overlay" title="Loading session..." description="Checking whether you already have an active session." />;
  }

  if (decision.redirectTo) {
    return <Navigate to={decision.redirectTo} replace />;
  }

  return children;
}
