import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Principal } from '../../api/types';
import { api } from '../../api/client';
import { SEEDED_PRINCIPALS } from '../../api/mockData';

export type AuthState = 'loading' | 'unauthenticated' | 'authenticated';

interface AuthContextType {
  principal: Principal | null;
  authState: AuthState;
  isAuthenticated: boolean;
  allPrincipals: Principal[];
  login: (principalId: string, password: string) => Promise<void>;
  switchIdentity: (principalId: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  authError: string | null;
  versionChangeNonce: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [principal, setPrincipal] = useState<Principal | null>(api.getCurrentPrincipal());
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [versionChangeNonce, setVersionChangeNonce] = useState(0);

  const login = useCallback(async (principalId: string, password: string) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const nextPrincipal = await api.login(principalId, password);
      setPrincipal(nextPrincipal);
      setAuthState('authenticated');
      setVersionChangeNonce((prev) => prev + 1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setAuthError(msg);
      setAuthState('unauthenticated');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const switchIdentity = useCallback(async (principalId: string) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const nextPrincipal = await api.demoLogin(principalId);
      setPrincipal(nextPrincipal);
      setAuthState('authenticated');
      setVersionChangeNonce((prev) => prev + 1);
    } catch (err) {
      console.error('Failed to switch demo identity:', err);
      if (!api.isMockMode()) {
        setAuthState('unauthenticated');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await api.logout();
      setPrincipal(null);
      setAuthState('unauthenticated');
      setVersionChangeNonce((prev) => prev + 1);
    } catch (err) {
      console.error('Failed to logout:', err);
      setPrincipal(null);
      setAuthState('unauthenticated');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setAuthState('loading');
    api
      .getMe()
      .then((p) => {
        setPrincipal(p);
        setAuthState('authenticated');
      })
      .catch(() => {
        if (api.isMockMode()) {
          const mockPrincipal = api.getCurrentPrincipal();
          setPrincipal(mockPrincipal);
          setAuthState('authenticated');
        } else {
          setPrincipal(null);
          setAuthState('unauthenticated');
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        principal,
        authState,
        isAuthenticated: authState === 'authenticated' && principal !== null,
        allPrincipals: SEEDED_PRINCIPALS,
        login,
        switchIdentity,
        logout,
        isLoading,
        authError,
        versionChangeNonce,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
