import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app.js';
import type { Registration, RegistrationStore } from './registration.js';

const valid = { submissionId: '9771ac51-4b08-42a4-b2d8-de686b7fc22c', name: 'Alex Example', email: 'ALEX@example.com', phone: '+44 (7700) 900-123', programme: 'Adults', consent: 'opening-updates-email-phone', website: '' };
function fixture() {
  const records = new Map<string, Registration>();
  let unavailable = false;
  const store: RegistrationStore = {
    async save(value) {
      if (unavailable) throw new Error('database unavailable');
      const previous = records.get(value.submissionId);
      if (previous) return JSON.stringify(previous) === JSON.stringify(value) ? 'existing' : 'conflict';
      records.set(value.submissionId, value); return 'created';
    },
    async healthy() { if (unavailable) throw new Error('database unavailable'); },
    async list() { return [...records.values()]; },
  };
  return { records, failDatabase: () => { unavailable = true; }, app: createApp({ store, origins: ['http://localhost:4321'], adminToken: 'test-secret' }) };
}

test('JSON registration normalises contact data, retries safely, and rejects changed UUID reuse', async t => {
  const { app, records } = fixture(); t.after(() => app.close());
  const first = await app.inject({ method: 'POST', url: '/v1/registrations', payload: valid });
  assert.equal(first.statusCode, 201);
  assert.equal(records.get(valid.submissionId)?.email, 'alex@example.com');
  assert.equal(records.get(valid.submissionId)?.phone, '+447700900123');
  const second = await app.inject({ method: 'POST', url: '/v1/registrations', payload: valid });
  assert.equal(second.statusCode, 200);
  const changed = await app.inject({ method: 'POST', url: '/v1/registrations', payload: { ...valid, phone: '07700900124' } });
  assert.equal(changed.statusCode, 409);
  assert.equal(records.size, 1);
});

test('accepts form submissions and rejects missing email, phone, consent, bot and oversized data', async t => {
  const { app } = fixture(); t.after(() => app.close());
  const form = await app.inject({ method: 'POST', url: '/v1/registrations', headers: { 'content-type': 'application/x-www-form-urlencoded' }, payload: new URLSearchParams(valid).toString() });
  assert.equal(form.statusCode, 201);
  for (const patch of [{ email: '' }, { phone: 'nonsense' }, { consent: '' }, { website: 'bot' }, { name: '' }]) {
    const response = await app.inject({ method: 'POST', url: '/v1/registrations', payload: { ...valid, ...patch } });
    assert.equal(response.statusCode, 400);
  }
  const huge = await app.inject({ method: 'POST', url: '/v1/registrations', payload: { ...valid, name: 'x'.repeat(9000) } });
  assert.equal(huge.statusCode, 413);
});

test('does not report success on DB failure; health detects an unavailable DB', async t => {
  const { app, failDatabase } = fixture(); t.after(() => app.close());
  failDatabase();
  assert.equal((await app.inject({ method: 'POST', url: '/v1/registrations', payload: valid })).statusCode, 500);
  assert.equal((await app.inject('/healthz')).statusCode, 503);
});

test('protects the admin list, prevents caching, and enforces allowed browser origins', async t => {
  const { app } = fixture(); t.after(() => app.close());
  for (const authorization of ['', 'Bearer wrong']) {
    const response = await app.inject({ url: '/v1/admin/registrations', headers: { authorization } });
    assert.equal(response.statusCode, 401);
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.equal(response.json().registrations, undefined);
  }
  const authorised = await app.inject({ url: '/v1/admin/registrations', headers: { authorization: 'Bearer test-secret' } });
  assert.equal(authorised.statusCode, 200);
  assert.deepEqual(authorised.json(), { registrations: [] });
  assert.equal((await app.inject({ method: 'POST', url: '/v1/registrations', payload: valid, headers: { origin: 'https://untrusted.test' } })).statusCode, 403);
  const allowed = await app.inject({ method: 'OPTIONS', url: '/v1/registrations', headers: { origin: 'http://localhost:4321', 'access-control-request-method': 'POST' } });
  assert.equal(allowed.headers['access-control-allow-origin'], 'http://localhost:4321');
});
