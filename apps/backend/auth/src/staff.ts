import { randomUUID } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import type { Pool, PoolClient } from 'pg';
import { z } from 'zod';
import type { Auth } from './auth.js';

export const staffLock = 781204302;
const columns = 'id, name, email, role, active, "createdAt", "updatedAt"';
export const passwordSchema = z.string().min(12, 'Use at least 12 characters.').max(128);
export const createUserSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  password: passwordSchema,
  role: z.enum(['admin', 'staff']).default('staff'),
}).strict();
const updateUserSchema = z.object({ role: z.enum(['admin', 'staff']).optional(), active: z.boolean().optional() }).strict().refine(value => value.role !== undefined || value.active !== undefined, 'Choose a role or account status.');

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export async function insertUser(client: PoolClient, input: z.infer<typeof createUserSchema>) {
  const id = randomUUID();
  const password = await hashPassword(input.password);
  const result = await client.query(`INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt", role, active)
    VALUES ($1, $2, $3, false, now(), now(), $4, true) RETURNING ${columns}`, [id, input.name, input.email, input.role]);
  await client.query(`INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
    VALUES ($1, $2, 'credential', $2, $3, now(), now())`, [randomUUID(), id, password]);
  return result.rows[0];
}

export async function handleStaff(request: Request, pool: Pool, auth: Auth): Promise<Response> {
  const session = await auth.api.getSession({ headers: request.headers, query: { disableCookieCache: true } });
  if (!session || session.user.active !== true) throw new HttpError(401, 'UNAUTHORIZED', 'Sign in to continue.');
  const url = new URL(request.url);
  const match = /^\/auth\/staff(?:\/([^/]+)(\/reset-password)?)?$/.exec(url.pathname);
  if (!match) throw new HttpError(404, 'NOT_FOUND', 'Not found.');
  const [, id, reset] = match;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Serialize staff writes and sign-ins, including the final active-admin check.
    await client.query('SELECT pg_advisory_xact_lock($1)', [staffLock]);
    const actor = await client.query(`SELECT u.role, u.active FROM "user" u
      JOIN session s ON s."userId" = u.id WHERE u.id = $1 AND s.id = $2 AND s."expiresAt" > now() FOR UPDATE OF u`, [session.user.id, session.session.id]);
    if (!actor.rows[0]?.active) throw new HttpError(401, 'UNAUTHORIZED', 'Sign in to continue.');
    if (actor.rows[0].role !== 'admin') throw new HttpError(403, 'FORBIDDEN', 'Only administrators can manage staff.');
    let response: Response;
    if (request.method === 'GET' && !id) {
      const result = await client.query(`SELECT ${columns} FROM "user" ORDER BY "createdAt", id`);
      response = Response.json({ users: result.rows });
    } else if (request.method === 'POST' && !id) {
      const input = createUserSchema.parse(await request.json());
      response = Response.json({ user: await insertUser(client, input) }, { status: 201 });
    } else if (id && request.method === 'PATCH' && !reset) {
      const input = updateUserSchema.parse(await request.json());
      const result = await client.query(`SELECT ${columns} FROM "user" WHERE id = $1 FOR UPDATE`, [id]);
      const current = result.rows[0];
      if (!current) throw new HttpError(404, 'NOT_FOUND', 'Staff account not found.');
      const role = input.role ?? current.role;
      const active = input.active ?? current.active;
      if (id === session.user.id && (role !== 'admin' || !active)) throw new HttpError(409, 'SELF_LOCKOUT', 'You cannot demote or deactivate your own account.');
      if (current.role === 'admin' && current.active && (role !== 'admin' || !active)) {
        const count = await client.query('SELECT count(*)::integer AS total FROM "user" WHERE role = \'admin\' AND active = true');
        if (count.rows[0].total <= 1) throw new HttpError(409, 'LAST_ADMIN', 'Keep at least one active administrator.');
      }
      const updated = await client.query(`UPDATE "user" SET role = $2, active = $3, "updatedAt" = now() WHERE id = $1 RETURNING ${columns}`, [id, role, active]);
      if (!active || role !== current.role) await client.query('DELETE FROM session WHERE "userId" = $1', [id]);
      response = Response.json({ user: updated.rows[0] });
    } else if (id && request.method === 'POST' && reset) {
      const { password } = z.object({ password: passwordSchema }).strict().parse(await request.json());
      const result = await client.query('SELECT id FROM "user" WHERE id = $1 FOR UPDATE', [id]);
      if (!result.rowCount) throw new HttpError(404, 'NOT_FOUND', 'Staff account not found.');
      await client.query('UPDATE account SET password = $2, "updatedAt" = now() WHERE "userId" = $1 AND "providerId" = \'credential\'', [id, await hashPassword(password)]);
      await client.query('DELETE FROM session WHERE "userId" = $1', [id]);
      response = Response.json({ success: true });
    } else {
      throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.');
    }
    await client.query('COMMIT');
    return response;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
