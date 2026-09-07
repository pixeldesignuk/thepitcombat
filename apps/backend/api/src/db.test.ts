import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { createStore, migrate } from './db.js';
import type { Registration } from './registration.js';

test('PostgreSQL commits registrations and outbox together, survives a new connection, and handles concurrent retries', { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const schema = `pit_test_${randomUUID().replaceAll('-', '')}`;
  const admin = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  await admin.query(`CREATE SCHEMA "${schema}"`);
  const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL, options: `-c search_path=${schema}` });
  const secondPool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL, options: `-c search_path=${schema}` });
  try {
    await migrate(pool);
    const store = createStore(pool);
    const input: Registration = { submissionId: randomUUID(), name: 'Test Adult', email: 'test@example.com', phone: '+447700900123', programme: 'Adults', consent: 'opening-updates-email-phone', website: '' };
    const outcomes = await Promise.all([store.save(input), store.save(input)]);
    assert.deepEqual(outcomes.sort(), ['created', 'existing']);
    assert.equal(await store.save({ ...input, name: 'Different Adult' }), 'conflict');
    const records = await createStore(secondPool).list() as { emailStatus: string; email: string }[];
    assert.equal(records.length, 1);
    assert.equal(records[0].email, input.email);
    assert.equal(records[0].emailStatus, 'pending');
    assert.equal((await pool.query('SELECT * FROM registration_email_outbox')).rowCount, 1);
    // A queue failure must roll back the registration as well.
    await pool.query('ALTER TABLE registration_email_outbox ADD CONSTRAINT force_failure CHECK (attempts < 0) NOT VALID');
    const failedId = randomUUID();
    await assert.rejects(() => store.save({ ...input, submissionId: failedId }));
    assert.equal((await pool.query('SELECT id FROM registrations WHERE id=$1', [failedId])).rowCount, 0);
  } finally {
    await pool.end();
    await secondPool.end();
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
  }
});
