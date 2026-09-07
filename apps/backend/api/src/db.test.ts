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
    const input: Registration = { submissionId: randomUUID(), name: 'Test Adult', email: 'test@example.com', phone: '+447700900123', programme: 'Adults', programmes: ['Adults'], comment: '', consent: 'opening-updates-email-phone', website: '' };
    const outcomes = await Promise.all([store.save(input), store.save(input)]);
    assert.deepEqual(outcomes.sort(), ['created', 'existing']);
    assert.equal(await store.save({ ...input, name: 'Different Adult' }), 'conflict');
    const records = (await createStore(secondPool).listInterest({ page: 1, pageSize: 25, q: '' })).items as { emailStatus: string; email: string }[];
    assert.equal(records.length, 1);
    assert.equal(records[0].email, input.email);
    assert.equal(records[0].emailStatus, 'pending');
    assert.equal((await pool.query('SELECT * FROM registration_email_outbox')).rowCount, 1);
    const initial = await store.getInterest(input.submissionId);
    assert.equal(initial?.status, 'new');
    assert.equal(initial?.staffNote, '');
    assert.ok(initial?.updatedAt);
    const updated = await store.updateInterest(input.submissionId, { status: 'follow_up', staffNote: 'Called; follow up Tuesday', email: 'changed@example.com' }, 'staff-1');
    assert.equal(updated?.status, 'follow_up');
    assert.equal(updated?.staffNote, 'Called; follow up Tuesday');
    assert.equal(updated?.email, 'changed@example.com');
    assert.equal((await pool.query('SELECT updated_by FROM registrations WHERE id=$1', [input.submissionId])).rows[0].updated_by, 'staff-1');
    assert.notEqual(updated?.updatedAt, undefined);
    const searched = await store.listInterest({ page: 1, pageSize: 25, q: 'changed@example.com', status: 'follow_up' });
    assert.equal(searched.total, 1);
    assert.equal(searched.items[0].id, input.submissionId);
    const literalWildcards = await store.listInterest({ page: 1, pageSize: 25, q: '%_', });
    assert.equal(literalWildcards.total, 0);
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

test('PostgreSQL migration preserves legacy registrations and multi-select data across reruns and rolling writes', { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const schema = `pit_test_${randomUUID().replaceAll('-', '')}`;
  const admin = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  await admin.query(`CREATE SCHEMA "${schema}"`);
  const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL, options: `-c search_path=${schema}` });
  try {
    await pool.query(`CREATE TABLE registrations (
      id UUID PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL,
      programme TEXT NOT NULL, consent TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    const legacyId = randomUUID();
    const legacyValues = [legacyId, 'Legacy Visitor', 'legacy@example.com', '+447700900123', 'Adults', 'opening-updates-email-phone'];
    const legacyInsert = 'INSERT INTO registrations (id,name,email,phone,programme,consent) VALUES ($1,$2,$3,$4,$5,$6)';
    await pool.query(legacyInsert, legacyValues);
    await migrate(pool);
    const store = createStore(pool);
    const legacy = await store.getInterest(legacyId);
    assert.deepEqual(legacy?.programmes, ['Adults']);
    assert.equal(legacy?.programme, 'Adults');
    assert.equal(legacy?.comment, '');
    assert.equal(legacy?.name, 'Legacy Visitor');
    const input: Registration = { submissionId: randomUUID(), name: 'Family Visitor', email: 'family@example.com', phone: '+447700900124', programme: 'More than one / not sure yet', programmes: ['Kids', 'Adults'], comment: 'Interested in family sessions', consent: 'opening-updates-email-phone', website: '' };
    assert.equal(await store.save(input), 'created');
    assert.equal(await store.save({ ...input, programmes: ['Adults', 'Kids'] }), 'existing');
    assert.equal(await store.save({ ...input, programmes: ['Kids'] }), 'conflict');
    assert.equal(await store.save({ ...input, comment: 'Changed' }), 'conflict');
    await migrate(pool);
    assert.deepEqual((await store.getInterest(input.submissionId))?.programmes, ['Kids', 'Adults']);
    assert.equal((await store.getInterest(input.submissionId))?.comment, input.comment);
    assert.equal((await store.listInterest({ page: 1, pageSize: 25, q: '', programme: 'Kids' })).total, 1);
    assert.equal((await store.listInterest({ page: 1, pageSize: 25, q: '', programme: 'Adults' })).total, 2);
    assert.equal((await store.listInterest({ page: 1, pageSize: 25, q: '', programmes: ['Kids', 'Teens'] })).total, 1);
    const edited = await store.updateInterest(input.submissionId, { programmes: ['Kids', 'Teens'], staffNote: 'Called visitor' }, 'staff-1');
    assert.deepEqual(edited?.programmes, ['Kids', 'Teens']);
    assert.equal(edited?.programme, 'More than one / not sure yet');
    assert.equal(edited?.comment, input.comment);
    assert.equal(edited?.staffNote, 'Called visitor');
    assert.equal((await store.listInterest({ page: 1, pageSize: 25, q: '', programme: 'Adults' })).total, 1);
    // Existing API instances still insert/update the single legacy column.
    const rollingId = randomUUID();
    await pool.query(legacyInsert, [rollingId, ...legacyValues.slice(1)]);
    assert.deepEqual((await store.getInterest(rollingId))?.programmes, ['Adults']);
    await pool.query('UPDATE registrations SET programme=$1 WHERE id=$2', ['Teens', rollingId]);
    assert.deepEqual((await store.getInterest(rollingId))?.programmes, ['Teens']);
    assert.deepEqual((await store.updateInterest(input.submissionId, { programme: 'Kids' }, 'staff-1'))?.programmes, ['Kids']);
  } finally {
    await pool.end();
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
  }
});
