import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AuthServiceUnavailableError, createApp, createInternalAuthenticator, type Authenticate } from './app.js';
import type { InterestListQuery, InterestRecord, InterestUpdate } from './interest.js';
import type { Registration, RegistrationStore } from './registration.js';

const valid = { submissionId: '9771ac51-4b08-42a4-b2d8-de686b7fc22c', name: 'Alex Example', email: 'ALEX@example.com', phone: '+44 (7700) 900-123', programme: 'Adults', consent: 'opening-updates-email-phone', website: '' };
const secondId = '7181ac51-4b08-42a4-b2d8-de686b7fc22c';

function fixture() {
  const records = new Map<string, Registration>();
  const interests = new Map<string, InterestRecord>();
  let unavailable = false;
  const authenticate: Authenticate = async cookie => {
    if (cookie === 'session=staff') return { id: 'staff-1', email: 'staff@example.com', role: 'staff', active: true };
    return null;
  };
  const store: RegistrationStore = {
    async save(value) {
      if (unavailable) throw new Error('database unavailable');
      const previous = records.get(value.submissionId);
      if (previous) return JSON.stringify(previous) === JSON.stringify(value) ? 'existing' : 'conflict';
      records.set(value.submissionId, value);
      interests.set(value.submissionId, { id: value.submissionId, name: value.name, email: value.email, phone: value.phone, programme: value.programme, createdAt: '2026-09-07T10:00:00.000Z', updatedAt: '2026-09-07T10:00:00.000Z', emailStatus: 'pending', status: 'new', staffNote: '' });
      return 'created';
    },
    async healthy() { if (unavailable) throw new Error('database unavailable'); },
    async listInterest(query: InterestListQuery) {
      const found = [...interests.values()].filter(row => (!query.q || [row.name, row.email, row.phone].some(value => value.toLowerCase().includes(query.q.toLowerCase()))) && (!query.programme || row.programme === query.programme) && (!query.status || row.status === query.status));
      return { items: found.slice((query.page - 1) * query.pageSize, query.page * query.pageSize), total: found.length };
    },
    async getInterest(id: string) { return interests.get(id); },
    async updateInterest(id: string, update: InterestUpdate) {
      const interest = interests.get(id);
      if (!interest) return undefined;
      const next = { ...interest, ...update, updatedAt: '2026-09-07T11:00:00.000Z' };
      interests.set(id, next);
      return next;
    },
  };
  return { store, records, interests, failDatabase: () => { unavailable = true; }, app: createApp({ store, origins: ['http://localhost:4321'], consoleOrigins: ['http://localhost:5173', 'http://127.0.0.1:5173'], authenticate }) };
}

test('JSON registration normalises contact data, retries safely, and rejects changed UUID reuse', async t => {
  const { app, records } = fixture(); t.after(() => app.close());
  const first = await app.inject({ method: 'POST', url: '/v1/registrations', payload: valid });
  assert.equal(first.statusCode, 201);
  assert.equal(records.get(valid.submissionId)?.email, 'alex@example.com');
  assert.equal(records.get(valid.submissionId)?.phone, '+447700900123');
  assert.equal((await app.inject({ method: 'POST', url: '/v1/registrations', payload: valid })).statusCode, 200);
  assert.equal((await app.inject({ method: 'POST', url: '/v1/registrations', payload: { ...valid, phone: '07700900124' } })).statusCode, 409);
  assert.equal(records.size, 1);
});

test('accepts form submissions and rejects missing email, phone, consent, bot and oversized data', async t => {
  const { app } = fixture(); t.after(() => app.close());
  const form = await app.inject({ method: 'POST', url: '/v1/registrations', headers: { 'content-type': 'application/x-www-form-urlencoded' }, payload: new URLSearchParams(valid).toString() });
  assert.equal(form.statusCode, 201);
  for (const patch of [{ email: '' }, { phone: 'nonsense' }, { consent: '' }, { website: 'bot' }, { name: '' }]) {
    assert.equal((await app.inject({ method: 'POST', url: '/v1/registrations', payload: { ...valid, ...patch } })).statusCode, 400);
  }
  assert.equal((await app.inject({ method: 'POST', url: '/v1/registrations', payload: { ...valid, name: 'x'.repeat(9000) } })).statusCode, 413);
});

test('does not report success on DB failure; health detects an unavailable DB', async t => {
  const { app, failDatabase } = fixture(); t.after(() => app.close());
  failDatabase();
  assert.equal((await app.inject({ method: 'POST', url: '/v1/registrations', payload: valid })).statusCode, 500);
  assert.equal((await app.inject('/healthz')).statusCode, 503);
});

test('requires an active staff session and never accepts an API bearer token', async t => {
  const { app } = fixture(); t.after(() => app.close());
  for (const headers of [{}, { authorization: 'Bearer old-token' }, { cookie: 'session=expired' }]) {
    const response = await app.inject({ url: '/v1/interests', headers });
    assert.equal(response.statusCode, 401);
    assert.equal(response.headers['cache-control'], 'no-store');
  }
  const authorised = await app.inject({ url: '/v1/interests', headers: { cookie: 'session=staff' } });
  assert.equal(authorised.statusCode, 200);
  assert.deepEqual(authorised.json(), { interests: [], total: 0, page: 1, pageSize: 25 });
});

test('internal auth forwards only the session cookie and rejects inactive or non-staff roles', async () => {
  const calls: { url: string; cookie: string | null; origin: string | null }[] = [];
  const auth = createInternalAuthenticator('http://auth.internal:3002', (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), cookie: new Headers(init?.headers).get('cookie'), origin: new Headers(init?.headers).get('origin') });
    return new Response(JSON.stringify({ session: { id: 'session-1' }, user: { id: 'u1', email: 'a@example.com', role: 'staff', active: true } }));
  }) as typeof fetch);
  assert.deepEqual(await auth('session=valid'), { id: 'u1', email: 'a@example.com', role: 'staff', active: true });
  assert.deepEqual(calls, [{ url: 'http://auth.internal:3002/auth/get-session', cookie: 'session=valid', origin: null }]);
  for (const user of [{ id: 'u1', email: 'a@example.com', role: 'staff', active: false }, { id: 'u1', email: 'a@example.com', role: 'member', active: true }]) {
    const rejected = createInternalAuthenticator('http://auth.internal:3002', (async () => new Response(JSON.stringify({ session: { id: 'session-1' }, user }))) as typeof fetch);
    assert.equal(await rejected('session=value'), null);
  }
  const unavailable = createInternalAuthenticator('http://auth.internal:3002', (async () => { throw new Error('network down'); }) as typeof fetch);
  await assert.rejects(() => unavailable('session=value'), { name: 'Error', message: 'Auth service unavailable' });
});

test('returns 503 when the private auth service cannot be reached', async t => {
  const { store } = fixture();
  const app = createApp({ store, origins: ['http://localhost:4321'], consoleOrigins: ['http://localhost:5173'], authenticate: async () => { throw new AuthServiceUnavailableError('auth unavailable'); } });
  t.after(() => app.close());
  assert.equal((await app.inject({ url: '/v1/interests', headers: { cookie: 'session=value' } })).statusCode, 503);
});

test('lists, searches, filters and updates interest records with validated fields', async t => {
  const { app, interests } = fixture(); t.after(() => app.close());
  await app.inject({ method: 'POST', url: '/v1/registrations', payload: valid });
  interests.set(secondId, { id: secondId, name: 'Jamie Young', email: 'jamie@example.com', phone: '+447700900124', programme: 'Kids', createdAt: '2026-09-06T10:00:00.000Z', updatedAt: '2026-09-06T10:00:00.000Z', emailStatus: 'sent', status: 'contacted', staffNote: '' });
  const headers = { cookie: 'session=staff' };
  const list = await app.inject({ url: '/v1/interests?q=alex&programme=Adults&status=new&page=1&pageSize=1', headers });
  assert.equal(list.statusCode, 200);
  assert.deepEqual(list.json(), { interests: [interests.get(valid.submissionId)], total: 1, page: 1, pageSize: 1 });
  assert.equal((await app.inject({ url: `/v1/interests/${valid.submissionId}`, headers })).json().interest.name, 'Alex Example');
  const update = await app.inject({ method: 'PATCH', url: `/v1/interests/${valid.submissionId}`, headers: { ...headers, origin: 'http://localhost:5173' }, payload: { status: 'follow_up', staffNote: '  Called; try again Tuesday.  ', email: 'ALEX+updated@example.com' } });
  assert.equal(update.statusCode, 200);
  assert.deepEqual(update.json().interest.status, 'follow_up');
  assert.equal(update.json().interest.staffNote, 'Called; try again Tuesday.');
  assert.equal(update.json().interest.email, 'alex+updated@example.com');
  assert.equal((await app.inject({ method: 'PATCH', url: `/v1/interests/${valid.submissionId}`, headers: { ...headers, origin: 'http://127.0.0.1:5173' }, payload: { status: 'closed' } })).statusCode, 200);
  assert.equal((await app.inject({ method: 'PATCH', url: `/v1/interests/${valid.submissionId}`, headers: { ...headers, origin: 'https://attacker.example' }, payload: { status: 'closed' } })).statusCode, 403);
  for (const payload of [{}, { status: 'trial_booked' }, { unexpected: 'value' }, { phone: 'bad' }, { staffNote: 'x'.repeat(5001) }]) {
    assert.equal((await app.inject({ method: 'PATCH', url: `/v1/interests/${valid.submissionId}`, headers, payload })).statusCode, 400);
  }
});
