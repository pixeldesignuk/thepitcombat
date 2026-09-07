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
const database = process.env.TEST_DATABASE_URL || backendEnv.TEST_DATABASE_URL || process.env.DATABASE_URL || backendEnv.DATABASE_URL;
if (!database) throw new Error('Set TEST_DATABASE_URL or DATABASE_URL for the isolated browser-test schema.');
const schema = `pit_browser_${randomUUID().replaceAll('-', '')}`;
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
  await admin.end();
  process.exit(code);
}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void stop(); });
const env = {
  ...process.env, NODE_ENV: 'production', ADMIN_API_TOKEN: 'browser-test-access-key',
  RESEND_API_KEY: '', RESEND_FROM_EMAIL: '', REPLY_TO_EMAIL: '',
  PUBLIC_SITE_URL: 'http://127.0.0.1:4322', DASH_URL: 'http://127.0.0.1:5174',
  API_URL: 'http://127.0.0.1:3301', VITE_API_URL: 'http://127.0.0.1:3301',
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
  await build('@pit/api');
  await build('@pit/site');
  await build('@pit/dash');
  start(process.execPath, ['apps/backend/api/dist/server.js'], { DATABASE_URL: isolated.toString(), PORT: '3301' });
  await ready('http://127.0.0.1:3301/healthz');
  start(process.execPath, ['apps/web/dash/node_modules/vite/bin/vite.js', 'preview', 'apps/web/dash', '--host', '127.0.0.1', '--port', '5174', '--strictPort']);
  await ready('http://127.0.0.1:5174');
  start(process.execPath, ['apps/web/site/dist/server/entry.mjs'], { HOST: '127.0.0.1', PORT: '4322' });
  await ready('http://127.0.0.1:4322/healthz');
  console.log('Browser stack ready: production site, API, dashboard and isolated PostgreSQL schema. Email sending disabled.');
} catch (error) {
  console.error(error instanceof Error ? error.message.replace(database, '[database]') : 'Browser stack failed.');
  await stop(1);
}
