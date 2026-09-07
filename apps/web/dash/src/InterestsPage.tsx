import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError, apiRequest, errorMessage } from './api';
import { formatDate, humanise, statusLabels } from './format';
import { Icon } from './icons';
import { INTEREST_STATUSES, PROGRAMMES, type Interest, type InterestDraft, type InterestStatus, type Programme } from './types';

type InterestListResponse = { interests: Interest[]; total: number; page: number; pageSize: number };

export function InterestsPage({ signal, onSessionExpired }: { signal: AbortSignal; onSessionExpired: (message?: string) => void }) {
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [programme, setProgramme] = useState<Programme | ''>('');
  const [status, setStatus] = useState<InterestStatus | ''>('');
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [result, setResult] = useState<InterestListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(queryInput.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [queryInput]);

  const loadInterests = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ page: String(page), pageSize: '25' });
    if (query) params.set('q', query);
    if (programme) params.set('programme', programme);
    if (status) params.set('status', status);
    try {
      const data = await apiRequest<InterestListResponse>(`/api/interests?${params}`, { signal });
      if (id === requestId.current) setResult(data);
    } catch (cause) {
      if (id !== requestId.current || signal.aborted) return;
      if (cause instanceof ApiError && cause.status === 401) return onSessionExpired(cause.message);
      setError(errorMessage(cause, 'Could not load interests. Try again.'));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [onSessionExpired, page, programme, query, signal, status]);

  useEffect(() => { void loadInterests(); }, [loadInterests, refreshKey]);

  function updateInterest(updated: Interest) {
    setResult(current => current ? {
      ...current,
      interests: current.interests.map(item => item.id === updated.id ? updated : item),
    } : current);
    setRefreshKey(value => value + 1);
  }

  const totalPages = Math.max(1, Math.ceil((result?.total ?? 0) / (result?.pageSize ?? 25)));
  const hasFilters = Boolean(queryInput || programme || status);

  return (
    <div className="page interest-page" data-detail-open={Boolean(selectedId)}>
      <header className="page-head interest-page-head">
        <div><h1>Expressions of interest</h1><p>Review new enquiries, record follow-up, and keep contact details current.</p></div>
        <button className="button button-secondary refresh-button" type="button" aria-label="Refresh interests" onClick={() => setRefreshKey(value => value + 1)} disabled={loading}>
          <Icon name="refresh" /><span>{loading ? 'Refreshing…' : 'Refresh'}</span>
        </button>
      </header>

      <div className="workspace">
        <section className="list-panel" aria-labelledby="interest-list-heading">
          <h2 className="sr-only" id="interest-list-heading">Interest list</h2>
          <div className="list-toolbar">
            <div className="search-control">
              <Icon name="search" />
              <label className="sr-only" htmlFor="interest-search">Search interests</label>
              <input id="interest-search" type="search" placeholder="Search name, email or phone" value={queryInput} onChange={event => setQueryInput(event.target.value)} />
            </div>
            <label className="select-label">
              <span className="sr-only">Filter by programme</span>
              <select aria-label="Filter by programme" value={programme} onChange={event => { setProgramme(event.target.value as Programme | ''); setPage(1); }}>
                <option value="">All programmes</option>
                {PROGRAMMES.map(item => <option key={item} value={item}>{item === 'More than one / not sure yet' ? 'Not sure yet' : item}</option>)}
              </select>
            </label>
            <label className="select-label">
              <span className="sr-only">Filter by status</span>
              <select aria-label="Filter by status" value={status} onChange={event => { setStatus(event.target.value as InterestStatus | ''); setPage(1); }}>
                <option value="">All statuses</option>
                {INTEREST_STATUSES.map(item => <option key={item} value={item}>{statusLabels[item]}</option>)}
              </select>
            </label>
          </div>

          <div className="list-summary" aria-live="polite">
            <span>{result ? `${result.total} ${result.total === 1 ? 'person' : 'people'}` : 'Loading interests'}</span>
            <span>London time</span>
          </div>

          {error && result && <p className="notice notice-error list-inline-error" role="alert">{error} The existing list is still shown.</p>}

          {error && !result ? (
            <div className="state-panel" role="alert"><strong>Interests could not be loaded</strong><p>{error}</p><button className="text-button" type="button" onClick={() => void loadInterests()}>Try again</button></div>
          ) : loading && !result ? (
            <ListSkeleton />
          ) : result?.interests.length === 0 ? (
            <div className="state-panel">
              <strong>{hasFilters ? 'No matching interests' : 'No expressions of interest yet'}</strong>
              <p>{hasFilters ? 'Change or clear the filters to widen the list.' : 'New submissions from the website will appear here.'}</p>
              {hasFilters && <button className="text-button" type="button" onClick={() => { setQueryInput(''); setQuery(''); setProgramme(''); setStatus(''); setPage(1); }}>Clear filters</button>}
            </div>
          ) : (
            <ul className="interest-list" aria-busy={loading}>
              {result?.interests.map(interest => (
                <li key={interest.id}>
                  <button className="interest-row" data-selected={selectedId === interest.id} type="button" onClick={() => setSelectedId(interest.id)} aria-label={`Open ${interest.name}`}>
                    <span className="interest-person"><strong>{interest.name}</strong><span>{interest.email}</span></span>
                    <span className="interest-programme">{(interest.programmes ?? [interest.programme]).map(item => item === 'More than one / not sure yet' ? 'Not sure yet' : item).join(', ')}</span>
                    <span className="status-tag" data-status={interest.status}>{statusLabels[interest.status]}</span>
                    <time className="interest-date" dateTime={interest.createdAt}>{formatDate(interest.createdAt, true)}</time>
                    <Icon name="chevron" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {result && result.total > result.pageSize && (
            <div className="pagination">
              <button className="button button-secondary" type="button" onClick={() => setPage(value => Math.max(1, value - 1))} disabled={loading || page <= 1}>Previous</button>
              <span>Page {page} of {totalPages}</span>
              <button className="button button-secondary" type="button" onClick={() => setPage(value => Math.min(totalPages, value + 1))} disabled={loading || page >= totalPages}>Next</button>
            </div>
          )}
        </section>

        <InterestDetail id={selectedId} signal={signal} onClose={() => setSelectedId(null)} onUpdated={updateInterest} onSessionExpired={onSessionExpired} />
      </div>
    </div>
  );
}

function ListSkeleton() {
  return <div className="skeleton-list" aria-hidden="true">{Array.from({ length: 7 }, (_, index) => <div className="skeleton-row" key={index}><span /><span /><span /></div>)}</div>;
}

function InterestDetail({ id, signal, onClose, onUpdated, onSessionExpired }: { id: string | null; signal: AbortSignal; onClose: () => void; onUpdated: (interest: Interest) => void; onSessionExpired: (message?: string) => void }) {
  const [interest, setInterest] = useState<Interest | null>(null);
  const [draft, setDraft] = useState<InterestDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const selectedIdRef = useRef<string | null>(id);

  useEffect(() => {
    selectedIdRef.current = id;
    setInterest(null); setDraft(null); setError(''); setSuccess('');
    if (!id) {
      return;
    }
    let current = true;
    setLoading(true); setError(''); setSuccess('');
    void apiRequest<{ interest: Interest }>(`/api/interests/${encodeURIComponent(id)}`, { signal })
      .then(data => {
        if (!current) return;
        setInterest(data.interest);
        setDraft({ name: data.interest.name, email: data.interest.email, phone: data.interest.phone, programmes: data.interest.programmes ?? [data.interest.programme], status: data.interest.status, staffNote: data.interest.staffNote || '' });
        window.requestAnimationFrame(() => headingRef.current?.focus());
      })
      .catch(cause => {
        if (!current || signal.aborted) return;
        if (cause instanceof ApiError && cause.status === 401) return onSessionExpired(cause.message);
        setError(errorMessage(cause, 'Could not load this interest. Try again.'));
      })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [id, onSessionExpired, signal]);

  const dirty = Boolean(interest && draft && (
    interest.name !== draft.name || interest.email !== draft.email || interest.phone !== draft.phone
    || JSON.stringify(interest.programmes) !== JSON.stringify(draft.programmes) || interest.status !== draft.status
    || (interest.staffNote || '') !== draft.staffNote
  ));

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id || !draft || saving || !dirty) return;
    if (draft.programmes.length === 0) { setError('Choose at least one training group.'); return; }
    setSaving(true); setError(''); setSuccess('');
    const saveId = id;
    try {
      const data = await apiRequest<{ interest: Interest }>(`/api/interests/${encodeURIComponent(id)}`, { method: 'PATCH', body: draft, signal });
      if (selectedIdRef.current !== saveId) return;
      setInterest(data.interest);
      setDraft({ name: data.interest.name, email: data.interest.email, phone: data.interest.phone, programmes: data.interest.programmes ?? [data.interest.programme], status: data.interest.status, staffNote: data.interest.staffNote || '' });
      onUpdated(data.interest);
      setSuccess('Changes saved.');
    } catch (cause) {
      if (signal.aborted) return;
      if (cause instanceof ApiError && cause.status === 401) return onSessionExpired(cause.message);
      setError(errorMessage(cause, 'Could not save changes. Try again.'));
    } finally { setSaving(false); }
  }

  if (!id) {
    return <aside className="detail-panel detail-empty"><span className="detail-empty-mark"><Icon name="interests" size={22} /></span><strong>Select an interest</strong><p>Choose a person from the list to view their details, update follow-up, or contact them.</p></aside>;
  }

  return (
    <aside className="detail-panel" aria-busy={loading}>
      <button className="mobile-back" type="button" onClick={onClose}><Icon name="arrow" /> Back to interests</button>
      {loading ? <DetailSkeleton /> : error && !draft ? (
        <div className="state-panel" role="alert"><strong>Record unavailable</strong><p>{error}</p></div>
      ) : draft && interest ? (
        <form className="detail-form" onSubmit={save}>
          <header className="detail-head">
            <div><h2 ref={headingRef} tabIndex={-1}>{interest.name}</h2><p>Received {formatDate(interest.createdAt)}</p></div>
            <button className="button button-primary" type="submit" disabled={!dirty || saving}>{saving ? 'Saving…' : 'Save changes'}</button>
          </header>
          <div className="contact-actions" aria-label="Contact actions">
            <a className="contact-action" href={`mailto:${interest.email}`}><Icon name="mail" /><span><strong>Email</strong><small>{interest.email}</small></span></a>
            <a className="contact-action" href={`tel:${interest.phone}`}><Icon name="phone" /><span><strong>Call</strong><small>{interest.phone}</small></span></a>
          </div>
          {(error || success) && <p className={`notice ${error ? 'notice-error' : 'notice-success'}`} role={error ? 'alert' : 'status'}>{error || success}</p>}
          {interest.comment && <section className="detail-section" aria-labelledby="visitor-comment-heading"><h3 id="visitor-comment-heading">Their comment</h3><p className="visitor-comment">{interest.comment}</p></section>}
          <section className="detail-section" aria-labelledby="follow-up-heading">
            <h3 id="follow-up-heading">Follow-up</h3>
            <div className="field-grid">
              <div className="field"><label htmlFor="interest-status">Status</label><select id="interest-status" value={draft.status} onChange={event => { setDraft({ ...draft, status: event.target.value as InterestStatus }); setSuccess(''); }} disabled={saving}>{INTEREST_STATUSES.map(item => <option value={item} key={item}>{statusLabels[item]}</option>)}</select></div>
              <div className="record-meta"><span>Confirmation email</span><strong>{humanise(interest.emailStatus)}</strong></div>
            </div>
            <div className="field"><div className="label-row"><label htmlFor="staff-note">Staff note</label><span>{draft.staffNote.length} / 5000</span></div><textarea id="staff-note" value={draft.staffNote} onChange={event => { setDraft({ ...draft, staffNote: event.target.value }); setSuccess(''); }} maxLength={5000} rows={7} placeholder="Add useful context for the next person who follows up." disabled={saving} /></div>
          </section>
          <section className="detail-section" aria-labelledby="contact-heading">
            <h3 id="contact-heading">Contact details</h3>
            <div className="field-grid">
              <div className="field"><label htmlFor="interest-name">Name</label><input id="interest-name" value={draft.name} onChange={event => { setDraft({ ...draft, name: event.target.value }); setSuccess(''); }} minLength={2} maxLength={120} required disabled={saving} /></div>
              <div className="field"><label htmlFor="interest-email">Email</label><input id="interest-email" type="email" value={draft.email} onChange={event => { setDraft({ ...draft, email: event.target.value }); setSuccess(''); }} maxLength={254} required disabled={saving} /></div>
              <div className="field"><label htmlFor="interest-phone">Phone</label><input id="interest-phone" type="tel" value={draft.phone} onChange={event => { setDraft({ ...draft, phone: event.target.value }); setSuccess(''); }} required disabled={saving} /></div>
              <fieldset className="field interest-groups"><legend>Training groups</legend>{PROGRAMMES.map(item => <label key={item}><input type="checkbox" checked={draft.programmes.includes(item)} disabled={saving} onChange={event => {
                const unsure = 'More than one / not sure yet';
                const programmes = event.target.checked ? (item === unsure ? [item] : [...draft.programmes.filter(value => value !== unsure), item]) : draft.programmes.filter(value => value !== item);
                setDraft({ ...draft, programmes }); setSuccess('');
              }} /><span>{item === 'More than one / not sure yet' ? 'Not sure yet' : item}</span></label>)}</fieldset>
            </div>
          </section>
          <footer className="detail-footer">
            <span>Last updated {formatDate(interest.updatedAt)}</span>
            <button className="text-button" type="button" onClick={() => { setDraft({ name: interest.name, email: interest.email, phone: interest.phone, programmes: interest.programmes ?? [interest.programme], status: interest.status, staffNote: interest.staffNote || '' }); setError(''); setSuccess(''); }} disabled={!dirty || saving}>Discard changes</button>
          </footer>
        </form>
      ) : null}
    </aside>
  );
}

function DetailSkeleton() {
  return <div className="detail-skeleton" aria-hidden="true"><span /><span /><div><span /><span /></div><span /><span /><span /></div>;
}
