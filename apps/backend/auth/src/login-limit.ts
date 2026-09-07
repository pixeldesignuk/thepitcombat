import { createHash } from 'node:crypto';
import type { Pool } from 'pg';
import { HttpError } from './staff.js';

export async function checkLoginLimit(pool: Pool, email: string, observedIp: string) {
  // Hash the normalized account and trusted proxy observation rather than
  // storing email addresses in rate-limit keys. Separate accounts sharing a
  // Railway proxy do not consume each other's small login budget.
  const key = createHash('sha256').update(`${email.trim().toLowerCase()}\0${observedIp}`).digest('hex');
  const result = await pool.query(`INSERT INTO login_attempts (key, count, started_at) VALUES ($1, 1, now())
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN login_attempts.started_at < now() - interval '60 seconds' THEN 1 ELSE login_attempts.count + 1 END,
      started_at = CASE WHEN login_attempts.started_at < now() - interval '60 seconds' THEN now() ELSE login_attempts.started_at END
    RETURNING count`, [key]);
  await pool.query("DELETE FROM login_attempts WHERE started_at < now() - interval '60 seconds'");
  if (result.rows[0].count > 10) throw new HttpError(429, 'TOO_MANY_ATTEMPTS', 'Too many sign-in attempts. Try again in a minute.');
}
