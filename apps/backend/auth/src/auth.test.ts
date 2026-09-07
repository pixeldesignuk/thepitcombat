import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import test from 'node:test';
import { Pool } from 'pg';
import { createAuth, createPool } from './auth.js';
import { createHandler } from './app.js';
import { readSettings } from './config.js';
import { checkLoginLimit } from './login-limit.js';
import { migrate } from './migrate.js';
import { seed } from './seed.js';

const env = { DATABASE_URL: 'postgres://localhost/pit', BETTER_AUTH_SECRET: 'a'.repeat(48) };
test('production requires HTTPS and rejects unsafe schema names', () => {
  assert.throws(() => readSettings({ ...env, NODE_ENV: 'production' }), /HTTPS/);
  assert.throws(() => readSettings({ ...env, AUTH_DB_SCHEMA: 'public;drop schema public' }), /identifier/);
  assert.equal(readSettings({ ...env, BETTER_AUTH_URL: 'https://console.example.com' }).secureCookies, true);
  assert.throws(() => readSettings({ ...env, BETTER_AUTH_SECRET: 'short' }), /32 characters/);
});

test('real PostgreSQL authentication lifecycle and staff authorization', { skip: !process.env.TEST_DATABASE_URL }, async () => {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.BETTER_AUTH_SECRET = randomBytes(48).toString('hex');
  process.env.NODE_ENV = 'test';
  const schema = `pit_auth_test_${randomBytes(8).toString('hex')}`;
  process.env.AUTH_DB_SCHEMA = schema;
  process.env.BETTER_AUTH_URL = 'http://localhost:5173';
  process.env.AUTH_TRUSTED_ORIGINS = 'http://localhost:5173';
  process.env.SEED_ADMIN_EMAIL = 'admin@example.test';
  process.env.SEED_STAFF_EMAIL = 'staff@example.test';
  process.env.SEED_ADMIN_PASSWORD = randomBytes(24).toString('hex');
  process.env.SEED_STAFF_PASSWORD = randomBytes(24).toString('hex');
  const settings = readSettings();
  const cleanup = new Pool({ connectionString: settings.databaseUrl });
  const pool = createPool(settings);
  const mutationPool = createPool(settings, 1);
  try {
    await migrate();
    await seed();
    await seed();
    for (let attempt = 0; attempt < 10; attempt++) await checkLoginLimit(pool, 'THROTTLED@example.test', '127.0.0.1');
    await assert.rejects(checkLoginLimit(pool, ' throttled@example.test ', '127.0.0.1'), /Too many/);
    await checkLoginLimit(pool, 'another@example.test', '127.0.0.1');
    const auth = createAuth(pool, settings);
    const handle = createHandler(auth, pool, settings, mutationPool);
    let ip = 0;
    const request = async (path: string, method = 'GET', body?: unknown, cookie = '', origin = settings.publicUrl) => handle(new Request(`${settings.publicUrl}${path}`, {
      method,
      headers: { 'content-type': 'application/json', origin, cookie, 'x-forwarded-for': `192.0.2.${++ip}` },
      ...(method === 'GET' ? {} : { body: JSON.stringify(body ?? {}) }),
    }));
    const login = async (email: string, password: string) => {
      const response = await request('/auth/sign-in/email', 'POST', { email, password });
      assert.equal(response.status, 200, JSON.stringify(await response.clone().json()));
      assert.equal((await response.json()).token, undefined);
      const cookies = response.headers.getSetCookie();
      assert(cookies.some(cookie => /HttpOnly/i.test(cookie)));
      return cookies.map(cookie => cookie.split(';')[0]).join('; ');
    };
    assert.equal((await request('/healthz')).status, 200);
    assert.equal(await (await request('/auth/get-session')).json(), null);
    assert.equal((await request('/auth/sign-up/email', 'POST', { email: 'intruder@example.test', password: 'longpasswordhere', name: 'Intruder' })).status, 404);
    assert.equal((await request('/auth/admin/create-user', 'POST', {})).status, 404);
    assert.equal((await request('/auth/sign-in/email', 'POST', { email: process.env.SEED_ADMIN_EMAIL, password: 'wrongpassword' })).status, 401);
    const adminCookie = await login(process.env.SEED_ADMIN_EMAIL!, process.env.SEED_ADMIN_PASSWORD!);
    const staffCookie = await login(process.env.SEED_STAFF_EMAIL!, process.env.SEED_STAFF_PASSWORD!);
    // More concurrent sign-ins than the primary pool has connections must all
    // finish: waiting on the staff lock cannot consume Better Auth's pool.
    const concurrentLogins = await Promise.all(Array.from({ length: 12 }, () =>
      request('/auth/sign-in/email', 'POST', { email: process.env.SEED_STAFF_EMAIL, password: process.env.SEED_STAFF_PASSWORD })));
    assert(concurrentLogins.every(response => response.status === 200), 'concurrent sign-ins complete without exhausting the authentication pool');
    const adminSession = await (await request('/auth/get-session', 'GET', undefined, adminCookie)).json();
    assert.equal(adminSession.user.role, 'admin');
    assert.equal(adminSession.user.active, true);
    assert.equal(adminSession.session.token, undefined);
    assert.equal((await request('/auth/staff', 'GET', undefined, staffCookie)).status, 403);
    assert.equal((await request('/auth/staff', 'POST', {}, adminCookie, 'https://evil.example')).status, 403);
    assert.equal((await request('/auth/staff', 'POST', {}, adminCookie, '')).status, 403);
    const users = (await (await request('/auth/staff', 'GET', undefined, adminCookie)).json()).users;
    assert.equal(users.length, 2, 'seeding is idempotent');
    const staff = users.find((user: { role: string }) => user.role === 'staff');
    const admin = adminSession.user;
    assert.equal((await request(`/auth/staff/${admin.id}`, 'PATCH', { active: false }, adminCookie)).status, 409);
    assert.equal((await request(`/auth/staff/${admin.id}`, 'PATCH', { role: 'staff' }, adminCookie)).status, 409);
    const created = await request('/auth/staff', 'POST', { name: 'Second Admin', email: 'second@example.test', password: 'long-enough-new-password', role: 'admin' }, adminCookie);
    assert.equal(created.status, 201);
    const second = (await created.json()).user;
    const secondCookie = await login(second.email, 'long-enough-new-password');
    // Concurrent demotions serialize; once one succeeds the other actor no
    // longer has authority. There is always one active administrator left.
    const demotions = await Promise.all([
      request(`/auth/staff/${second.id}`, 'PATCH', { role: 'staff' }, adminCookie),
      request(`/auth/staff/${admin.id}`, 'PATCH', { role: 'staff' }, secondCookie),
    ]);
    assert.equal(demotions.filter(response => response.status === 200).length, 1);
    const activeAdmins = await pool.query('SELECT id FROM "user" WHERE role = \'admin\' AND active = true');
    assert.equal(activeAdmins.rowCount, 1);
    const currentAdminCookie = activeAdmins.rows[0].id === admin.id ? adminCookie : secondCookie;
    assert.equal((await request(`/auth/staff/${staff.id}`, 'PATCH', { active: false }, currentAdminCookie)).status, 200);
    assert.equal(await (await request('/auth/get-session', 'GET', undefined, staffCookie)).json(), null);
    assert.notEqual((await request('/auth/sign-in/email', 'POST', { email: staff.email, password: process.env.SEED_STAFF_PASSWORD })).status, 200);
    assert.equal((await request(`/auth/staff/${staff.id}`, 'PATCH', { active: true }, currentAdminCookie)).status, 200);
    const reactivatedCookie = await login(staff.email, process.env.SEED_STAFF_PASSWORD!);
    assert.equal((await request(`/auth/staff/${staff.id}/reset-password`, 'POST', { password: 'a-different-long-password' }, currentAdminCookie)).status, 200);
    assert.equal(await (await request('/auth/get-session', 'GET', undefined, reactivatedCookie)).json(), null);
    assert.equal((await request('/auth/sign-in/email', 'POST', { email: staff.email, password: process.env.SEED_STAFF_PASSWORD })).status, 401);
    const changedCookie = await login(staff.email, 'a-different-long-password');
    assert.equal((await request('/auth/sign-out', 'POST', {}, changedCookie)).status, 200);
    assert.equal(await (await request('/auth/get-session', 'GET', undefined, changedCookie)).json(), null);
    const resetSelf = await request(`/auth/staff/${activeAdmins.rows[0].id}/reset-password`, 'POST', { password: 'admin-password-replacement' }, currentAdminCookie);
    assert.equal(resetSelf.status, 200);
    assert.equal(await (await request('/auth/get-session', 'GET', undefined, currentAdminCookie)).json(), null);
  } finally {
    await mutationPool.end();
    await pool.end();
    await cleanup.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await cleanup.end();
  }
});
