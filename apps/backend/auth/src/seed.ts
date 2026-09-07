import { pathToFileURL } from 'node:url';
import { createPool } from './auth.js';
import { readSettings } from './config.js';
import { createUserSchema, insertUser, staffLock } from './staff.js';

export async function seed() {
  const pool = createPool(readSettings());
  const inputs = [
    { name: process.env.SEED_ADMIN_NAME || 'Pit Admin', email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD, role: 'admin' },
    { name: process.env.SEED_STAFF_NAME || 'Pit Staff', email: process.env.SEED_STAFF_EMAIL, password: process.env.SEED_STAFF_PASSWORD, role: 'staff' },
  ].map(input => createUserSchema.parse(input));
  if (inputs[0].email === inputs[1].email) throw new Error('Seed admin and staff emails must differ');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [staffLock]);
    for (const input of inputs) {
      const existing = await client.query('SELECT id FROM "user" WHERE lower(email) = $1', [input.email]);
      // Repeat runs never replace a password, role, or account status.
      if (!existing.rowCount) await insertUser(client, input);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await seed();
  console.log('Seed staff accounts are present. Existing accounts were preserved.');
}
