import { getMigrations } from 'better-auth/db/migration';
import { pathToFileURL } from 'node:url';
import { createAuth, createPool } from './auth.js';
import { readSettings } from './config.js';

export async function migrate() {
  const settings = readSettings();
  const pool = createPool(settings);
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock(781204301)');
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${settings.schema}"`);
    const auth = createAuth(pool, settings, false);
    const { runMigrations } = await getMigrations(auth.options);
    await runMigrations();
    await client.query('CREATE TABLE IF NOT EXISTS login_attempts (key text PRIMARY KEY, count integer NOT NULL, started_at timestamptz NOT NULL)');
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS pit_auth_user_email_lower ON "user" (lower(email))');
    // Coordinate session insertion with staff status changes: a disable either
    // deletes an earlier session or prevents a later session from being created.
    await client.query(`CREATE OR REPLACE FUNCTION require_active_session_user() RETURNS trigger AS $$
      BEGIN
        PERFORM 1 FROM "user" WHERE id = NEW."userId" AND active = true FOR SHARE;
        IF NOT FOUND THEN RAISE EXCEPTION 'Inactive user cannot hold a session'; END IF;
        RETURN NEW;
      END; $$ LANGUAGE plpgsql`);
    await client.query('DROP TRIGGER IF EXISTS require_active_session_user ON session');
    await client.query('CREATE TRIGGER require_active_session_user BEFORE INSERT ON session FOR EACH ROW EXECUTE FUNCTION require_active_session_user()');
  } finally {
    await client.query('SELECT pg_advisory_unlock(781204301)');
    client.release();
    await pool.end();
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await migrate();
  console.log('Auth schema migration complete.');
}
