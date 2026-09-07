import pg from 'pg';
import type { Registration, RegistrationStore } from './registration.js';

export function createPool(connectionString: string) {
  if (!connectionString) throw new Error('DATABASE_URL is required');
  return new pg.Pool({ connectionString, max: 10, connectionTimeoutMillis: 5000, query_timeout: 10000 });
}

export async function migrate(pool: pg.Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS registrations (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      programme TEXT NOT NULL,
      consent TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS registration_email_outbox (
      registration_id UUID PRIMARY KEY REFERENCES registrations(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
      attempts INTEGER NOT NULL DEFAULT 0,
      next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      sent_at TIMESTAMPTZ,
      last_error TEXT
    );
    CREATE INDEX IF NOT EXISTS registration_outbox_due ON registration_email_outbox(next_attempt_at) WHERE status IN ('pending', 'processing');
    CREATE INDEX IF NOT EXISTS registrations_created_at ON registrations(created_at DESC);
  `);
}

export function createStore(pool: pg.Pool): RegistrationStore {
  return {
    async healthy() { await pool.query('SELECT 1'); },
    async save(input: Registration) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const inserted = await client.query('INSERT INTO registrations (id,name,email,phone,programme,consent) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING RETURNING id', [input.submissionId, input.name, input.email, input.phone, input.programme, input.consent]);
        if (!inserted.rowCount) {
          const { rows: [existing] } = await client.query('SELECT name,email,phone,programme,consent FROM registrations WHERE id=$1', [input.submissionId]);
          const equal = ['name', 'email', 'phone', 'programme', 'consent'].every(key => existing[key] === input[key as keyof Registration]);
          await client.query('COMMIT');
          return equal ? 'existing' : 'conflict';
        }
        await client.query('INSERT INTO registration_email_outbox (registration_id) VALUES ($1)', [input.submissionId]);
        await client.query('COMMIT');
        return 'created';
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally { client.release(); }
    },
    async list() {
      const { rows } = await pool.query(`SELECT r.id,r.name,r.email,r.phone,r.programme,r.created_at AS "createdAt",o.status AS "emailStatus" FROM registrations r LEFT JOIN registration_email_outbox o ON o.registration_id=r.id ORDER BY r.created_at DESC LIMIT 200`);
      return rows;
    },
  };
}
