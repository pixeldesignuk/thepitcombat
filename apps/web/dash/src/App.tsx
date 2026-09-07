import { useEffect, useRef, useState } from 'react';
import { apiRequest, errorMessage } from './api';
import { InterestsPage } from './InterestsPage';
import { Icon } from './icons';
import { getSession, LoadingScreen, LoginScreen } from './Login';
import { StaffPage } from './StaffPage';
import type { SessionUser } from './types';

type ConsoleView = 'interests' | 'staff';

function ConsoleShell({ user, signal, onSignedOut, onSessionExpired }: { user: SessionUser; signal: AbortSignal; onSignedOut: () => void; onSessionExpired: (message?: string) => void }) {
  const [view, setView] = useState<ConsoleView>('interests');
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError('');
    try {
      await apiRequest('/auth/sign-out', { method: 'POST', body: {} });
      onSignedOut();
    } catch (cause) {
      setSignOutError(errorMessage(cause, 'Could not sign out. Try again.'));
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="shell">
      <a className="skip-link" href="#main">Skip to main content</a>
      <aside className="sidebar">
        <div className="brand-block">
          <img src="/brand/logo.svg" width="164" height="36" alt="The Pit" />
          <span>Staff console</span>
        </div>
        <nav className="primary-nav" aria-label="Console">
          <button type="button" className="nav-item" data-active={view === 'interests'} aria-label="Interests" aria-current={view === 'interests' ? 'page' : undefined} onClick={() => setView('interests')}>
            <Icon name="interests" /><span>Interests</span>
          </button>
          {user.role === 'admin' && (
            <button type="button" className="nav-item" data-active={view === 'staff'} aria-label="Staff accounts" aria-current={view === 'staff' ? 'page' : undefined} onClick={() => setView('staff')}>
              <Icon name="users" /><span>Staff accounts</span>
            </button>
          )}
        </nav>
        <div className="account-block">
          <span className="account-name">{user.name}</span>
          <span className="account-meta">{user.role} · {user.email}</span>
          <button className="sign-out" type="button" aria-label={signingOut ? 'Signing out' : 'Sign out'} onClick={signOut} disabled={signingOut}>
            <Icon name="logout" /><span>{signingOut ? 'Signing out…' : 'Sign out'}</span>
          </button>
        </div>
      </aside>
      <main className="main" id="main">
        {signOutError && <p className="notice notice-error shell-notice" role="alert">{signOutError}</p>}
        {view === 'interests'
          ? <InterestsPage signal={signal} onSessionExpired={onSessionExpired} />
          : <StaffPage currentUser={user} signal={signal} onSessionExpired={onSessionExpired} />}
      </main>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  const [notice, setNotice] = useState('');
  const dataRequests = useRef(new AbortController());

  useEffect(() => {
    const controller = new AbortController();
    void getSession(controller.signal)
      .then(sessionUser => setUser(sessionUser))
      .catch(cause => {
        if (!controller.signal.aborted) {
          setNotice(errorMessage(cause, 'Could not verify your session. Try signing in.'));
          setUser(null);
        }
      });
    return () => controller.abort();
  }, []);

  function startConsole(sessionUser: SessionUser) {
    dataRequests.current.abort();
    dataRequests.current = new AbortController();
    setNotice('');
    setUser(sessionUser);
  }

  function clearConsole(message = '') {
    dataRequests.current.abort();
    dataRequests.current = new AbortController();
    setUser(null);
    setNotice(message);
  }

  if (user === undefined) return <LoadingScreen />;
  if (user === null) return <LoginScreen notice={notice} onAuthenticated={startConsole} />;
  return <ConsoleShell user={user} signal={dataRequests.current.signal} onSignedOut={() => clearConsole()} onSessionExpired={message => clearConsole(message)} />;
}
