import { createContext, createElement, useContext, useEffect, useMemo, useState } from 'react';
import {
  acceptInvitation,
  fetchCurrentUser,
  hydrateStoredSession,
  loginWithPassword,
  logoutSession,
} from '../services/auth-service.js';

export const AuthContext = createContext({
  isReady: false,
  isAuthenticated: false,
  status: 'loading',
  user: null,
  accessProfile: null,
  login: async () => {},
  activate: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState({
    isReady: false,
    isAuthenticated: false,
    status: 'loading',
    user: null,
    accessProfile: null,
  });

  useEffect(() => {
    let isMounted = true;
    const existingSession = hydrateStoredSession();

    async function initialize() {
      if (!existingSession.token) {
        if (!isMounted) return;
        setAuthState({
          isReady: true,
          isAuthenticated: false,
          status: 'unauthenticated',
          user: null,
          accessProfile: null,
        });
        return;
      }

      try {
        const user = await fetchCurrentUser();
        if (!isMounted) return;
        setAuthState({
          isReady: true,
          isAuthenticated: true,
          status: 'authenticated',
          user,
          accessProfile: user.access_profile || null,
        });
      } catch {
        if (!isMounted) return;
        setAuthState({
          isReady: true,
          isAuthenticated: false,
          status: 'unauthenticated',
          user: null,
          accessProfile: null,
        });
      }
    }

    initialize();

    function handleUnauthorized() {
      if (!isMounted) return;
      setAuthState({
        isReady: true,
        isAuthenticated: false,
        status: 'unauthenticated',
        user: null,
        accessProfile: null,
      });
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('nsc:auth:unauthorized', handleUnauthorized);
    }

    return () => {
      isMounted = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('nsc:auth:unauthorized', handleUnauthorized);
      }
    };
  }, []);

  async function refreshUser() {
    const user = await fetchCurrentUser();
    setAuthState({
      isReady: true,
      isAuthenticated: true,
      status: 'authenticated',
      user,
      accessProfile: user.access_profile || null,
    });
    return user;
  }

  async function login(credentials) {
    const session = await loginWithPassword(credentials);
    setAuthState({
      isReady: true,
      isAuthenticated: true,
      status: 'authenticated',
      user: session.user,
      accessProfile: session.user?.access_profile || null,
    });
    return session;
  }

  async function activate(payload) {
    const session = await acceptInvitation(payload);
    setAuthState({
      isReady: true,
      isAuthenticated: true,
      status: 'authenticated',
      user: session.user,
      accessProfile: session.user?.access_profile || null,
    });
    return session;
  }

  async function logout() {
    await logoutSession();
    setAuthState({
      isReady: true,
      isAuthenticated: false,
      status: 'unauthenticated',
      user: null,
      accessProfile: null,
    });
  }

  const value = useMemo(
    () => ({
      ...authState,
      login,
      activate,
      logout,
      refreshUser,
    }),
    [authState]
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  return useContext(AuthContext);
}
