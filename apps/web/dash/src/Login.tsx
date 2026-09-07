import { useState, type FormEvent } from 'react';
import { ApiError, apiRequest, errorMessage } from './api';
import { Icon } from './icons';
import type { SessionUser } from './types';

function isSessionUser(value: unknown): value is SessionUser {
  if (!value || typeof value !== 'object') return false;
  const user = value as Partial<SessionUser>;
  return typeof user.id === 'string'
    && typeof user.name === 'string'
    && typeof user.email === 'string'
    && (user.role === 'admin' || user.role === 'staff')
    && typeof user.active === 'boolean';
}

export async function getSession(signal?: AbortSignal) {
  const result = await apiRequest<{ session: unknown; user: unknown } | null>('/auth/get-session', { signal });
  return result && isSessionUser(result.user) && result.user.active ? result.user : null;
}

export function LoadingScreen() {
  return (
    <main className="session-loading" aria-label="Checking session" aria-busy="true">
      <img src="/brand/logo.svg" width="170" height="38" alt="The Pit" />
      <span className="session-loading-line" aria-hidden="true" />
      <p>Checking staff access…</p>
    </main>
  );
}

export function LoginScreen({ notice, onAuthenticated }: { notice: string; onAuthenticated: (user: SessionUser) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(notice);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await apiRequest('/auth/sign-in/email', { method: 'POST', body: { email: email.trim(), password } });
      const user = await getSession();
      if (!user) throw new ApiError('We could not start a staff session. Check your details and try again.', 401);
      setPassword('');
      onAuthenticated(user);
    } catch (cause) {
      setError(errorMessage(cause, 'Could not sign in. Check your details and try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page" id="main">
      <section className="login-panel" aria-labelledby="login-heading">
        <img className="login-logo" src="/brand/logo.svg" width="188" height="42" alt="The Pit" />
        <div className="login-copy">
          <h1 id="login-heading">Staff console</h1>
          <p>Sign in to manage expressions of interest and follow-up.</p>
        </div>
        {error && <p className="notice notice-error" role="alert">{error}</p>}
        <form className="form-stack" onSubmit={signIn} aria-busy={submitting}>
          <div className="field">
            <label htmlFor="login-email">Email address</label>
            <input id="login-email" name="email" type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="username" inputMode="email" required autoFocus disabled={submitting} />
          </div>
          <div className="field">
            <label htmlFor="login-password">Password</label>
            <input id="login-password" name="password" type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required disabled={submitting} />
          </div>
          <button className="button button-primary button-wide" type="submit" disabled={submitting}>
            <span>{submitting ? 'Signing in…' : 'Sign in'}</span>{!submitting && <Icon name="arrow" />}
          </button>
        </form>
        <p className="login-footnote">Authorised staff only.</p>
      </section>
    </main>
  );
}
