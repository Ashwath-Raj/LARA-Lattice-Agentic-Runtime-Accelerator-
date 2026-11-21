import React, { useState } from 'react';
import { ShieldCheck, Lock, User, ArrowRight, AlertTriangle } from 'lucide-react';
import laraMark from '../../assets/logos/lara-mark.svg';
import laraWordmark from '../../assets/logos/lara-wordmark.svg';
import { useAuth } from './AuthContext';
import { Button } from '../../components/ui';

export function LoginPage() {
  const { login, isLoading, authError } = useAuth();
  const [principalId, setPrincipalId] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const cleanId = principalId.trim();
    if (!cleanId) {
      setLocalError('Principal ID is required.');
      return;
    }
    if (!password) {
      setLocalError('Password is required.');
      return;
    }

    try {
      await login(cleanId, password);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials or connection error.';
      setLocalError(msg);
    }
  };

  const displayedError = localError || authError;

  return (
    <div className="login-container">
      <div className="login-backdrop" aria-hidden="true" />
      <div className="login-card-shell">
        <div className="login-brand-header">
          <img src={laraMark} alt="LARA Mark" className="login-mark" />
          <img src={laraWordmark} alt="LARA Agentic Runtime" className="login-wordmark" />
          <span className="login-env-pill">
            <span className="login-env-dot" /> STAGING RUNTIME · lara-praneeth-stg-2026
          </span>
        </div>

        <div className="login-card">
          <div className="login-card-head">
            <h1>Enterprise Sign In</h1>
            <p>Authenticate with your assigned Principal ID and password to access the operational workbench.</p>
          </div>

          {displayedError && (
            <div className="login-error-alert" role="alert">
              <AlertTriangle size={16} />
              <div>
                <strong>Authentication Failed</strong>
                <p>{displayedError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            <label className="field" htmlFor="login_principal_id">
              <span className="field-label">
                <User size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                Principal ID
              </span>
              <input
                id="login_principal_id"
                name="principal_id"
                type="text"
                autoComplete="username"
                autoFocus
                required
                value={principalId}
                onChange={(e) => setPrincipalId(e.target.value)}
                placeholder="e.g. usr_admin_01"
                disabled={isLoading}
              />
              <small>Assigned runtime identity under tenant demo-enterprise</small>
            </label>

            <label className="field" htmlFor="login_password">
              <span className="field-label">
                <Lock size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                Password
              </span>
              <input
                id="login_password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                disabled={isLoading}
              />
              <small>PBKDF2-HMAC-SHA256 salted credential verification</small>
            </label>

            <Button
              type="submit"
              variant="primary"
              className="login-submit-btn"
              disabled={isLoading || !principalId.trim() || !password}
            >
              {isLoading ? (
                <>
                  <span className="spinner" />
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Runtime</span>
                  <ArrowRight size={16} />
                </>
              )}
            </Button>
          </form>

          <div className="login-security-notice">
            <ShieldCheck size={15} />
            <div>
              <strong>Governed Execution Environment</strong>
              <p>Session tokens are managed via secure, HttpOnly same-origin cookies. Direct actuation is constitutionally disabled.</p>
            </div>
          </div>
        </div>

        <footer className="login-footer">
          <span>© 2026 LARA Runtime Accelerator</span>
          <span>·</span>
          <span>Google Cloud Run Staging</span>
        </footer>
      </div>
    </div>
  );
}
