import pg from 'pg';
import type { Registration, RegistrationStore } from './registration.js';
import { legacyProgramme, type InterestListQuery, type InterestRecord, type InterestUpdate } from './interest.js';

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
    ALTER TABLE registrations ADD COLUMN IF NOT EXISTS programmes TEXT[];
    ALTER TABLE registrations ADD COLUMN IF NOT EXISTS comment TEXT NOT NULL DEFAULT '';
    UPDATE registrations SET programmes=ARRAY[programme] WHERE programmes IS NULL;
    -- Keep old API instances able to write during a rolling deployment.
    CREATE OR REPLACE FUNCTION sync_registration_programmes() RETURNS trigger AS $$
    BEGIN
      IF TG_OP = 'INSERT' THEN
        IF NEW.programmes IS NULL THEN NEW.programmes := ARRAY[NEW.programme]; END IF;
      ELSIF NEW.programme IS DISTINCT FROM OLD.programme AND NEW.programmes IS NOT DISTINCT FROM OLD.programmes THEN
        NEW.programmes := ARRAY[NEW.programme];
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    DROP TRIGGER IF EXISTS registrations_sync_programmes ON registrations;
    CREATE TRIGGER registrations_sync_programmes BEFORE INSERT OR UPDATE ON registrations FOR EACH ROW EXECUTE FUNCTION sync_registration_programmes();
    ALTER TABLE registrations ALTER COLUMN programmes SET NOT NULL;
    CREATE INDEX IF NOT EXISTS registrations_interest_programmes ON registrations USING GIN(programmes);
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
  const selectInterest = (from: string, source: string) => `SELECT ${source}.id,${source}.name,${source}.email,${source}.phone,${source}.programme,${source}.programmes,${source}.comment,${source}.created_at AS "createdAt",${source}.updated_at AS "updatedAt",${source}.status,${source}.staff_note AS "staffNote",o.status AS "emailStatus" FROM ${from} LEFT JOIN registration_email_outbox o ON o.registration_id=${source}.id`;
  return {
    async healthy() { await pool.query('SELECT 1'); },
    async save(input: Registration) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const inserted = await client.query('INSERT INTO registrations (id,name,email,phone,programme,consent,programmes,comment) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING RETURNING id', [input.submissionId, input.name, input.email, input.phone, legacyProgramme(input.programmes), input.consent, input.programmes, input.comment]);
        if (!inserted.rowCount) {
          const { rows: [existing] } = await client.query('SELECT name,email,phone,programmes,consent,comment FROM registrations WHERE id=$1', [input.submissionId]);
          const equal = ['name', 'email', 'phone', 'consent', 'comment'].every(key => existing[key] === input[key as keyof Registration])
            && JSON.stringify([...existing.programmes].sort()) === JSON.stringify([...input.programmes].sort());
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
      const selected = query.programmes ?? (query.programme ? [query.programme] : undefined);
      if (selected) { values.push(selected); conditions.push(`r.programmes && $${values.length}::text[]`); }
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
      const columns: Record<keyof InterestUpdate, string> = { name: 'name', email: 'email', phone: 'phone', programme: 'programme', programmes: 'programmes', status: 'status', staffNote: 'staff_note' };
      const selected = update.programmes ?? (update.programme ? [update.programme] : undefined);
      const changes = selected ? { ...update, programmes: selected, programme: legacyProgramme(selected) } : update;
      const entries = Object.entries(changes) as [keyof InterestUpdate, string | string[]][];
      const values = entries.map(([, value]) => value);
      const assignments = entries.map(([key], index) => `${columns[key]}=$${index + 1}`);
      values.push(updatedBy, id);
      const { rows: [interest] } = await pool.query<InterestRecord>(`WITH updated AS (UPDATE registrations SET ${assignments.join(', ')}, updated_at=NOW(), updated_by=$${values.length - 1} WHERE id=$${values.length} RETURNING *) ${selectInterest('updated', 'updated')}`, values);
      return interest;
    },
  };
}
