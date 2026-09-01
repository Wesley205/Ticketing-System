import { createContext, useContext } from 'react';
import { ToastProvider } from '../components/feedback/ToastProvider.jsx';
import { AuthProvider } from '../features/auth/hooks/useAuth.js';

const AppEnvironmentContext = createContext({
  apiBaseUrl: '/api',
  appName: 'NSC ICT Service Desk',
});

export function AppProviders({ children }) {
  const value = {
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
    appName: 'NSC ICT Service Desk',
  };

  return (
    <AppEnvironmentContext.Provider value={value}>
      <AuthProvider>
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </AppEnvironmentContext.Provider>
  );
}

export function useAppEnvironment() {
  return useContext(AppEnvironmentContext);
}
