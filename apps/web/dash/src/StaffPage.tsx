import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ApiError, apiRequest, errorMessage } from './api';
import { formatDate } from './format';
import { Icon } from './icons';
import type { SessionUser, StaffRole, StaffUser } from './types';

export function StaffPage({ currentUser, signal, onSessionExpired }: { currentUser: SessionUser; signal: AbortSignal; onSessionExpired: (message?: string) => void }) {
  const [users, setUsers] = useState<StaffUser[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadUsers = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await apiRequest<{ users: StaffUser[] }>('/auth/staff', { signal });
      setUsers(data.users);
    } catch (cause) {
      if (signal.aborted) return;
      if (cause instanceof ApiError && cause.status === 401) return onSessionExpired(cause.message);
      setError(errorMessage(cause, 'Could not load staff accounts. Try again.'));
    } finally { setLoading(false); }
  }, [onSessionExpired, signal]);

  useEffect(() => { void loadUsers(); }, [loadUsers, refreshKey]);

  function mergeUser(updated: StaffUser) {
    setUsers(current => current?.map(user => user.id === updated.id ? updated : user) ?? null);
  }

  function addUser(created: StaffUser) {
    setUsers(current => current ? [created, ...current] : [created]);
    setSelectedId(created.id);
    setSuccess(`${created.name} can now sign in.`);
  }

  const selected = users?.find(user => user.id === selectedId) ?? null;

  return (
    <div className="page staff-page" data-detail-open={Boolean(selectedId)}>
      <header className="page-head">
        <div><h1>Staff accounts</h1><p>Create staff access, change roles, or deactivate an account.</p></div>
        <button className="button button-secondary" type="button" onClick={() => setRefreshKey(value => value + 1)} disabled={loading}><Icon name="refresh" /> {loading ? 'Refreshing…' : 'Refresh'}</button>
      </header>
      {(error || success) && <p className={`notice page-notice ${error ? 'notice-error' : 'notice-success'}`} role={error ? 'alert' : 'status'}>{error || success}</p>}
      <div className="staff-workspace">
        <section className="staff-list-panel" aria-labelledby="staff-list-heading">
          <div className="panel-head"><h2 id="staff-list-heading">People with access</h2><span>{users?.length ?? '—'} accounts</span></div>
          {loading && !users ? <StaffSkeleton /> : users?.length === 0 ? <div className="state-panel"><strong>No staff accounts</strong><p>Create an account using the form on this page.</p></div> : (
            <ul className="staff-list">
              {users?.map(user => (
                <li key={user.id}>
                  <button className="staff-row" type="button" data-selected={user.id === selectedId} onClick={() => setSelectedId(user.id)} aria-label={`Manage ${user.name}`}>
                    <span className="staff-avatar" aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span>
                    <span className="staff-identity"><strong>{user.name}{user.id === currentUser.id ? ' (you)' : ''}</strong><span>{user.email}</span></span>
                    <span className="role-tag">{user.role}</span>
                    <span className="account-status" data-active={user.active}><i />{user.active ? 'Active' : 'Inactive'}</span>
                    <Icon name="chevron" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="staff-side">
          {selected ? (
            <ManageStaff user={selected} currentUser={currentUser} signal={signal} onClose={() => setSelectedId(null)} onUpdated={mergeUser} onSessionExpired={onSessionExpired} />
          ) : (
            <CreateStaff signal={signal} onCreated={addUser} onSessionExpired={onSessionExpired} />
          )}
        </aside>
      </div>
    </div>
  );
}

function StaffSkeleton() {
  return <div className="skeleton-list" aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <div className="skeleton-row" key={index}><span /><span /><span /></div>)}</div>;
}

function CreateStaff({ signal, onCreated, onSessionExpired }: { signal: AbortSignal; onCreated: (user: StaffUser) => void; onSessionExpired: (message?: string) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<StaffRole>('staff');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true); setError('');
    try {
      const data = await apiRequest<{ user: StaffUser }>('/auth/staff', { method: 'POST', body: { name: name.trim(), email: email.trim(), password, role }, signal });
      setName(''); setEmail(''); setPassword(''); setRole('staff');
      onCreated(data.user);
    } catch (cause) {
      if (signal.aborted) return;
      if (cause instanceof ApiError && cause.status === 401) return onSessionExpired(cause.message);
      setError(errorMessage(cause, 'Could not create this account. Try again.'));
    } finally { setSubmitting(false); }
  }

  return (
    <section className="manage-panel" aria-labelledby="create-staff-heading">
      <div className="panel-head"><div><h2 id="create-staff-heading">Create an account</h2><p>New staff can sign in as soon as the account is created.</p></div></div>
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      <form className="form-stack manage-form" onSubmit={create} aria-busy={submitting}>
        <div className="field"><label htmlFor="new-staff-name">Name</label><input id="new-staff-name" value={name} onChange={event => setName(event.target.value)} minLength={2} maxLength={120} required disabled={submitting} /></div>
        <div className="field"><label htmlFor="new-staff-email">Email</label><input id="new-staff-email" type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="off" maxLength={254} required disabled={submitting} /></div>
        <div className="field"><label htmlFor="new-staff-role">Role</label><select id="new-staff-role" value={role} onChange={event => setRole(event.target.value as StaffRole)} disabled={submitting}><option value="staff">Staff — manage interests</option><option value="admin">Admin — interests and staff</option></select></div>
        <div className="field"><label htmlFor="new-staff-password">Temporary password</label><input id="new-staff-password" type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" minLength={12} maxLength={128} required disabled={submitting} /><span className="field-help">12–128 characters. Share it securely with the staff member.</span></div>
        <button className="button button-primary button-wide" type="submit" disabled={submitting}>{submitting ? 'Creating account…' : 'Create account'}</button>
      </form>
    </section>
  );
}

function ManageStaff({ user, currentUser, signal, onClose, onUpdated, onSessionExpired }: { user: StaffUser; currentUser: SessionUser; signal: AbortSignal; onClose: () => void; onUpdated: (user: StaffUser) => void; onSessionExpired: (message?: string) => void }) {
  const [role, setRole] = useState<StaffRole>(user.role);
  const [active, setActive] = useState(user.active);
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { setRole(user.role); setActive(user.active); setPassword(''); setError(''); setSuccess(''); }, [user]);

  const dirty = role !== user.role || active !== user.active;
  const unsafeSelfChange = user.id === currentUser.id && (role !== 'admin' || !active);

  async function saveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dirty || unsafeSelfChange || saving) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const data = await apiRequest<{ user: StaffUser }>(`/auth/staff/${encodeURIComponent(user.id)}`, { method: 'PATCH', body: { role, active }, signal });
      onUpdated(data.user); setSuccess('Account changes saved.');
    } catch (cause) {
      if (signal.aborted) return;
      if (cause instanceof ApiError && cause.status === 401) return onSessionExpired(cause.message);
      setError(errorMessage(cause, 'Could not update this account. Try again.'));
    } finally { setSaving(false); }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (resetting) return;
    setResetting(true); setError(''); setSuccess('');
    try {
      await apiRequest(`/auth/staff/${encodeURIComponent(user.id)}/reset-password`, { method: 'POST', body: { password }, signal });
      setPassword('');
      if (user.id === currentUser.id) {
        onSessionExpired('Your password was reset. Sign in again with the new password.');
        return;
      }
      setSuccess('Password reset. Share the new password securely.');
    } catch (cause) {
      if (signal.aborted) return;
      if (cause instanceof ApiError && cause.status === 401) return onSessionExpired(cause.message);
      setError(errorMessage(cause, 'Could not reset the password. Try again.'));
    } finally { setResetting(false); }
  }

  return (
    <section className="manage-panel" aria-labelledby="manage-staff-heading">
      <button className="mobile-back" type="button" onClick={onClose}><Icon name="arrow" /> Back to staff</button>
      <div className="panel-head account-panel-head"><div><h2 id="manage-staff-heading">{user.name}</h2><p>{user.email}</p></div><button className="icon-button close-manage" type="button" onClick={onClose} aria-label="Close account details"><Icon name="close" /></button></div>
      {(error || success) && <p className={`notice ${error ? 'notice-error' : 'notice-success'}`} role={error ? 'alert' : 'status'}>{error || success}</p>}
      <form className="form-stack manage-form" onSubmit={saveAccount}>
        <div className="field"><label htmlFor="manage-role">Role</label><select id="manage-role" value={role} onChange={event => { setRole(event.target.value as StaffRole); setSuccess(''); }} disabled={saving}><option value="staff">Staff — manage interests</option><option value="admin">Admin — interests and staff</option></select></div>
        <label className="toggle-row"><span><strong>Account active</strong><small>Inactive accounts cannot sign in.</small></span><input type="checkbox" checked={active} onChange={event => { setActive(event.target.checked); setSuccess(''); }} disabled={saving} /></label>
        {unsafeSelfChange && <p className="inline-warning">You cannot remove your own admin access or deactivate your own account.</p>}
        <button className="button button-primary button-wide" type="submit" disabled={!dirty || unsafeSelfChange || saving}>{saving ? 'Saving…' : 'Save account changes'}</button>
      </form>
      <form className="reset-form" onSubmit={resetPassword}>
        <h3>Reset password</h3><p>Set a temporary password for this person.</p>
        <div className="field"><label htmlFor="reset-password">New password</label><input id="reset-password" type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" minLength={12} maxLength={128} required disabled={resetting} /><span className="field-help">12–128 characters.</span></div>
        <button className="button button-secondary button-wide" type="submit" disabled={resetting || password.length < 12}>{resetting ? 'Resetting…' : 'Reset password'}</button>
      </form>
      <p className="manage-meta">Created {formatDate(user.createdAt)} · Updated {formatDate(user.updatedAt)}</p>
    </section>
  );
}
