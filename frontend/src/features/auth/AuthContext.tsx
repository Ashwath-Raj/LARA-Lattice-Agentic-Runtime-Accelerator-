import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Principal } from '../../api/types';
import { api } from '../../api/client';
import { SEEDED_PRINCIPALS } from '../../api/mockData';

interface AuthContextType {
  principal: Principal;
  allPrincipals: Principal[];
  switchIdentity: (principalId: string) => Promise<void>;
  isLoading: boolean;
  versionChangeNonce: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [principal, setPrincipal] = useState<Principal>(api.getCurrentPrincipal());
  const [isLoading, setIsLoading] = useState(false);
  const [versionChangeNonce, setVersionChangeNonce] = useState(0);

  const switchIdentity = useCallback(async (principalId: string) => {
    setIsLoading(true);
    try {
      const nextPrincipal = await api.demoLogin(principalId);
      setPrincipal(nextPrincipal);
      // Increment nonce to signal components that need to re-fetch on identity switch
      setVersionChangeNonce((prev) => prev + 1);
    } catch (err) {
      console.error('Failed to switch demo identity:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check initial session
    api.getMe().then((p) => {
      setPrincipal(p);
    }).catch(() => {
      // ignore
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        principal,
        allPrincipals: SEEDED_PRINCIPALS,
        switchIdentity,
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
