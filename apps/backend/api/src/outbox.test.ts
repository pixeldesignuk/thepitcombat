import { test } from 'node:test';
import assert from 'node:assert/strict';
import type pg from 'pg';
import type { Resend } from 'resend';
import { processOutbox, startOutbox } from './outbox.js';

const settings = { resendKey: 'test-mocked', resendFrom: 'The Pit <test@example.com>' };
function mockPool(attempts = 1) {
  const calls: { text: string; values?: unknown[] }[] = [];
  const pool = { async query(text: string, values?: unknown[]) {
    calls.push({ text, values });
    if (text.includes('RETURNING registration_id')) return { rows: [{ registration_id: 'test-id', attempts }] };
    if (text.startsWith('SELECT email')) return { rows: [{ email: 'test@example.com' }] };
    return { rows: [] };
  } } as unknown as pg.Pool;
  return { pool, calls };
}

test('outbox sends confirmation with a stable idempotency key and marks delivery', async () => {
  const { pool, calls } = mockPool();
  const sent: unknown[][] = [];
  const client = { emails: { async send(...args: unknown[]) { sent.push(args); return { data: { id: 'mail-id' }, error: null }; } } } as unknown as Pick<Resend, 'emails'>;
  await processOutbox(pool, client, settings, () => {});
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0][1], { idempotencyKey: 'registration-test-id' });
  assert.match((sent[0][0] as { text: string }).text, /first session is free/);
  assert.match((sent[0][0] as { text: string }).text, /not a class booking/);
  assert.match(calls.at(-1)!.text, /status='sent'/);
});

test('delivery errors preserve a bounded retry and use safe failure metadata', async () => {
  const { pool, calls } = mockPool(6);
  const client = { emails: { async send() { return { data: null, error: { name: 'validation_error', message: 'sensitive provider output' } }; } } } as unknown as Pick<Resend, 'emails'>;
  const logs: string[] = [];
  await processOutbox(pool, client, settings, message => logs.push(message));
  assert.match(calls.at(-1)!.text, /WHEN attempts>=6 THEN 'failed'/);
  assert.deepEqual(calls.at(-1)!.values, ['test-id', 1920]);
  assert.ok(!JSON.stringify(calls).includes('sensitive provider output'));
  assert.equal(logs.length, 1);
});

test('missing Resend configuration leaves pending jobs untouched', async () => {
  const { pool, calls } = mockPool();
  const stop = startOutbox(pool, { ...settings, resendKey: '' }, () => {});
  await stop();
  assert.equal(calls.length, 0);
});
