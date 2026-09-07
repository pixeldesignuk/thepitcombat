import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';
import dotenv from 'dotenv';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
// Only the browser-test harness reads API configuration, to isolate its database schema.
// The public site itself loads its own app-local environment.
const backendEnvPath = `${root}apps/backend/api/.env`;
const backendEnv = existsSync(backendEnvPath) ? dotenv.parse(readFileSync(backendEnvPath)) : {};
const requireApi = createRequire(new URL('../../../backend/api/package.json', import.meta.url));
const { Pool } = requireApi('pg');
const database = process.env.TEST_DATABASE_URL || backendEnv.TEST_DATABASE_URL || 'postgresql://pit:pit_dev@127.0.0.1:55432/pit';
const schema = `pit_browser_${randomUUID().replaceAll('-', '')}`;
const authSchema = `pit_auth_browser_${randomUUID().replaceAll('-', '')}`;
const admin = new Pool({ connectionString: database });
const children = [];
let stopping = false;
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  await Promise.all(children.map(child => new Promise(resolve => {
    if (child.exitCode !== null) return resolve();
    child.once('exit', resolve);
    child.kill('SIGTERM');
    const timeout = setTimeout(() => { child.kill('SIGKILL'); resolve(); }, 5000);
    timeout.unref();
  })));
  await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await admin.query(`DROP SCHEMA IF EXISTS "${authSchema}" CASCADE`);
  await admin.end();
  process.exit(code);
}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void stop(); });
const env = {
  ...process.env, NODE_ENV: 'production',
  RESEND_API_KEY: '', RESEND_FROM_EMAIL: '', REPLY_TO_EMAIL: '',
  PUBLIC_SITE_URL: 'http://127.0.0.1:4322', DASH_URL: 'http://127.0.0.1:5174',
  API_URL: 'http://127.0.0.1:3301', API_INTERNAL_URL: 'http://127.0.0.1:3301',
  AUTH_INTERNAL_URL: 'http://127.0.0.1:3302', CONSOLE_URL: 'http://127.0.0.1:5174',
};
function start(command, args, extra = {}) {
  const child = spawn(command, args, { cwd: root, env: { ...env, ...extra }, stdio: 'inherit' });
  children.push(child);
  return child;
}
function build(workspace) {
  return new Promise((resolve, reject) => {
    const child = start('pnpm', ['--filter', workspace, 'build']);
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`${workspace} build failed`)));
  });
}
function run(command, args, extra) {
  return new Promise((resolve, reject) => {
    const child = start(command, args, extra);
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error('Browser test setup failed')));
  });
}
async function ready(url) {
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if ((await fetch(url)).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error(`Test service did not become ready: ${url}`);
}
try {
  await admin.query(`CREATE SCHEMA "${schema}"`);
  const isolated = new URL(database);
  isolated.searchParams.set('options', `-c search_path=${schema}`);
  await build('@pit/auth');
  await build('@pit/api');
  await build('@pit/site');
  await build('@pit/dash');
  const authEnv = {
    NODE_ENV: 'test', DATABASE_URL: database, AUTH_DB_SCHEMA: authSchema, PORT: '3302',
    BETTER_AUTH_SECRET: 'isolated-browser-tests-secret-not-for-deployment',
    BETTER_AUTH_URL: 'http://127.0.0.1:5174', AUTH_TRUSTED_ORIGINS: 'http://127.0.0.1:5174',
    SEED_ADMIN_NAME: 'Test administrator', SEED_ADMIN_EMAIL: 'admin@thepitcombat.test', SEED_ADMIN_PASSWORD: 'Browser-admin-test-password-2026!',
    SEED_STAFF_NAME: 'Test staff', SEED_STAFF_EMAIL: 'staff@thepitcombat.test', SEED_STAFF_PASSWORD: 'Browser-staff-test-password-2026!',
  };
  await run(process.execPath, ['apps/backend/auth/dist/migrate.js'], authEnv);
  await run(process.execPath, ['apps/backend/auth/dist/seed.js'], authEnv);
  start(process.execPath, ['apps/backend/auth/dist/server.js'], authEnv);
  await ready('http://127.0.0.1:3302/healthz');
  start(process.execPath, ['apps/backend/api/dist/server.js'], { DATABASE_URL: isolated.toString(), PORT: '3301', HOST: '127.0.0.1' });
  await ready('http://127.0.0.1:3301/healthz');
  start(process.execPath, ['apps/web/dash/server.mjs'], { HOST: '127.0.0.1', PORT: '5174' });
  await ready('http://127.0.0.1:5174');
  start(process.execPath, ['apps/web/site/dist/server/entry.mjs'], { HOST: '127.0.0.1', PORT: '4322' });
  await ready('http://127.0.0.1:4322/healthz');
  console.log('Browser stack ready: production site, API, console proxy, Better Auth and isolated PostgreSQL schemas. Email sending disabled.');
} catch (error) {
  console.error(error instanceof Error ? error.message.replace(database, '[database]') : 'Browser stack failed.');
  await stop(1);
}
