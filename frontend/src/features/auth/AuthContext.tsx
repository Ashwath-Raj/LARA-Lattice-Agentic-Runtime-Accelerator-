import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Principal } from '../../api/types';
import { api } from '../../api/client';
import { SEEDED_PRINCIPALS } from '../../api/mockData';

export type AuthState = 'loading' | 'unauthenticated' | 'authenticated';

interface AuthContextType {
  principal: Principal;
  authState: AuthState;
  isAuthenticated: boolean;
  allPrincipals: Principal[];
  switchIdentity: (principalId: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  versionChangeNonce: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [principal, setPrincipal] = useState<Principal>(api.getCurrentPrincipal());
  const [authState, setAuthState] = useState<AuthState>(api.isMockMode() ? 'authenticated' : 'loading');
  const [isLoading, setIsLoading] = useState(false);
  const [versionChangeNonce, setVersionChangeNonce] = useState(0);

  const switchIdentity = useCallback(async (principalId: string) => {
    setIsLoading(true);
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
      setAuthState('unauthenticated');
      setVersionChangeNonce((prev) => prev + 1);
    } catch (err) {
      console.error('Failed to logout:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (api.isMockMode()) {
      setAuthState('authenticated');
      return;
    }

    setIsLoading(true);
    setAuthState('loading');
    api
      .getMe()
      .then((p) => {
        setPrincipal(p);
        setAuthState('authenticated');
      })
      .catch((err) => {
        console.warn('Session unauthenticated or expired:', err);
        setAuthState('unauthenticated');
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
        isAuthenticated: authState === 'authenticated',
        allPrincipals: SEEDED_PRINCIPALS,
        switchIdentity,
        logout,
        isLoading,
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
