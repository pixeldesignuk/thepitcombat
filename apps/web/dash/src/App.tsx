import { useRef, useState, type FormEvent } from 'react';

type Registration = {
  id: number | string;
  name: string;
  email: string;
  phone: string | null;
  programme: string;
  createdAt: string;
  emailStatus: string;
};

const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');
const dateFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/London' });

function receivedDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : dateFormat.format(date);
}

export default function App() {
  const [accessKey, setAccessKey] = useState('');
  const [registrations, setRegistrations] = useState<Registration[] | null>(null);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  const keyInput = useRef<HTMLInputElement>(null);

  function clearInbox() {
    request.current?.abort();
    request.current = null;
    setAccessKey('');
    setRegistrations(null);
    setFilter('');
    setError('');
    setLoading(false);
    requestAnimationFrame(() => keyInput.current?.focus());
  }

  async function openInbox(event?: FormEvent) {
    event?.preventDefault();
    if (!accessKey.trim() || loading) return;
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError('');
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`${apiUrl}/v1/admin/registrations`, {
        headers: { Authorization: `Bearer ${accessKey.trim()}` },
        cache: 'no-store',
        credentials: 'omit',
        signal: controller.signal,
      });
      if (response.status === 401 || response.status === 403) throw new Error('The access key was not accepted. Check it and try again.');
      if (!response.ok) throw new Error('The inbox is unavailable right now. Please try again.');
      const data = await response.json();
      if (!Array.isArray(data.registrations)) throw new Error('The inbox returned an unexpected response. Please try again.');
      const valid = data.registrations.every((row: Registration) => row && (typeof row.id === 'number' || typeof row.id === 'string') && typeof row.name === 'string' && typeof row.email === 'string' && (row.phone == null || typeof row.phone === 'string') && typeof row.programme === 'string' && typeof row.createdAt === 'string' && typeof row.emailStatus === 'string');
      if (!valid) throw new Error('The inbox returned an unexpected response. Please try again.');
      if (request.current === controller) setRegistrations(data.registrations.slice(0, 200));
    } catch (cause) {
      if (request.current !== controller) return;
      setRegistrations(null);
      setError(controller.signal.aborted ? 'The inbox took too long to respond. Please try again.' : cause instanceof TypeError ? 'Could not connect to the inbox. Check your connection and try again.' : cause instanceof Error ? cause.message : 'Could not open the inbox. Please try again.');
    } finally {
      window.clearTimeout(timeout);
      if (request.current === controller) { setLoading(false); request.current = null; }
    }
  }

  const query = filter.trim().toLocaleLowerCase('en-GB');
  const visible = registrations?.filter(row => [row.name, row.email, row.phone || ''].some(value => value.toLocaleLowerCase('en-GB').includes(query))) || [];

  return <>
    <a className="skip-link" href="#main">Skip to inbox</a>
    <header className="app-header"><img src="/brand/logo.svg" width="180" height="40" alt="The Pit" /><span>Academy admin</span></header>
    <main id="main">
      <div className="page-heading"><div><h1>Registration inbox</h1><p>People interested in training at The Pit.</p></div>
        {(registrations !== null || loading) && <button className="secondary" onClick={clearInbox}>Clear and lock inbox</button>}
      </div>
      {registrations === null && <form className="access-form" onSubmit={openInbox}>
        <label htmlFor="access-key">Access key</label>
        <p id="key-help">Enter your admin access key. It stays in memory and is cleared when you lock or reload this page.</p>
        <div className="access-controls"><input ref={keyInput} id="access-key" name="access-key" type="password" value={accessKey} onChange={event => setAccessKey(event.target.value)} autoComplete="off" spellCheck={false} aria-describedby="key-help" required disabled={loading} /><button type="submit" disabled={loading}>{loading ? 'Opening…' : 'Open inbox'}</button></div>
      </form>}
      <p className="live-status" role="status" aria-live="polite">{loading ? 'Loading registrations…' : registrations !== null ? `${registrations.length} registration${registrations.length === 1 ? '' : 's'} loaded.` : ''}</p>
      {error && <p className="error" role="alert">{error}</p>}
      {registrations !== null && <section aria-label="Registrations" aria-busy={loading}>
        <div className="inbox-toolbar"><div className="search-field"><label htmlFor="filter">Find a registration</label><input id="filter" type="search" placeholder="Name, email or phone" value={filter} onChange={event => setFilter(event.target.value)} /></div><button className="secondary" disabled={loading} onClick={() => openInbox()}>{loading ? 'Refreshing…' : 'Refresh inbox'}</button></div>
        <div className="list-meta"><p>{visible.length} shown · Latest 200 registrations</p><p>Times shown in London time</p></div>
        {registrations.length === 0 ? <div className="empty"><h2>No registrations yet</h2><p>New expressions of interest will appear here after the website form is submitted.</p></div> : visible.length === 0 ? <div className="empty"><h2>No matches</h2><p>Try another name, email address or phone number.</p><button className="secondary" onClick={() => setFilter('')}>Clear filter</button></div> : <div className="table-scroll" role="region" aria-label="Registration details, scroll horizontally on small screens" tabIndex={0}><table><caption className="sr-only">Latest registrations of interest</caption><thead><tr><th scope="col">Name</th><th scope="col">Contact</th><th scope="col">Training group</th><th scope="col">Received</th><th scope="col">Email status</th></tr></thead><tbody>{visible.map(row => <tr key={row.id}><th scope="row">{row.name}</th><td><span>{row.email}</span><span className="phone">{row.phone || 'No phone provided'}</span></td><td>{row.programme}</td><td className="date"><time dateTime={row.createdAt}>{receivedDate(row.createdAt)}</time></td><td>{row.emailStatus.replaceAll('_', ' ')}</td></tr>)}</tbody></table></div>}
      </section>}
    </main>
    <footer>THE PIT COMBAT ACADEMY<span>Registration access only</span></footer>
  </>;
}
