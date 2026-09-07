import pg from 'pg';
import type { Registration, RegistrationStore } from './registration.js';
import type { InterestListQuery, InterestRecord, InterestUpdate } from './interest.js';

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
    ALTER TABLE registrations ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new';
    ALTER TABLE registrations ADD COLUMN IF NOT EXISTS staff_note TEXT NOT NULL DEFAULT '';
    ALTER TABLE registrations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    ALTER TABLE registrations ADD COLUMN IF NOT EXISTS updated_by TEXT;
    ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_status_check;
    ALTER TABLE registrations ADD CONSTRAINT registrations_status_check CHECK (status IN ('new', 'contacted', 'follow_up', 'closed'));
    CREATE INDEX IF NOT EXISTS registrations_interest_status_created_at ON registrations(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS registrations_interest_programme_created_at ON registrations(programme, created_at DESC);
  `);
}

export function createStore(pool: pg.Pool): RegistrationStore {
  const selectInterest = (from: string, source: string) => `SELECT ${source}.id,${source}.name,${source}.email,${source}.phone,${source}.programme,${source}.created_at AS "createdAt",${source}.updated_at AS "updatedAt",${source}.status,${source}.staff_note AS "staffNote",o.status AS "emailStatus" FROM ${from} LEFT JOIN registration_email_outbox o ON o.registration_id=${source}.id`;
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
    async listInterest(query: InterestListQuery) {
      const conditions: string[] = [];
      const values: unknown[] = [];
      if (query.q) {
        values.push(`%${query.q.replace(/[\\%_]/g, '\\$&')}%`);
        conditions.push(`(r.name ILIKE $${values.length} ESCAPE '\\' OR r.email ILIKE $${values.length} ESCAPE '\\' OR r.phone ILIKE $${values.length} ESCAPE '\\')`);
      }
      if (query.programme) { values.push(query.programme); conditions.push(`r.programme = $${values.length}`); }
      if (query.status) { values.push(query.status); conditions.push(`r.status = $${values.length}`); }
      const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
      const totalResult = await pool.query<{ total: string }>(`SELECT count(*)::text AS total FROM registrations r${where}`, values);
      const offset = (query.page - 1) * query.pageSize;
      const rows = await pool.query<InterestRecord>(`${selectInterest('registrations r', 'r')}${where} ORDER BY r.created_at DESC, r.id DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`, [...values, query.pageSize, offset]);
      return { items: rows.rows, total: Number(totalResult.rows[0].total) };
    },
    async getInterest(id: string) {
      const { rows: [interest] } = await pool.query<InterestRecord>(`${selectInterest('registrations r', 'r')} WHERE r.id=$1`, [id]);
      return interest;
    },
    async updateInterest(id: string, update: InterestUpdate, updatedBy: string) {
      const columns: Record<keyof InterestUpdate, string> = { name: 'name', email: 'email', phone: 'phone', programme: 'programme', status: 'status', staffNote: 'staff_note' };
      const entries = Object.entries(update) as [keyof InterestUpdate, string][];
      const values = entries.map(([, value]) => value);
      const assignments = entries.map(([key], index) => `${columns[key]}=$${index + 1}`);
      values.push(updatedBy, id);
      const { rows: [interest] } = await pool.query<InterestRecord>(`WITH updated AS (UPDATE registrations SET ${assignments.join(', ')}, updated_at=NOW(), updated_by=$${values.length - 1} WHERE id=$${values.length} RETURNING *) ${selectInterest('updated', 'updated')}`, values);
      return interest;
    },
  };
}
