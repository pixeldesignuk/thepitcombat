import type { Pool } from 'pg';
import { z } from 'zod';
import type { Auth } from './auth.js';
import type { Settings } from './config.js';
import { checkLoginLimit } from './login-limit.js';
import { handleStaff, HttpError, staffLock } from './staff.js';

export function createHandler(auth: Auth, pool: Pool, settings: Settings, mutationPool: Pool) {
  return async (request: Request): Promise<Response> => {
    let response: Response;
    try {
      const path = new URL(request.url).pathname;
      if (path === '/healthz' && request.method === 'GET') {
        await pool.query('SELECT 1 FROM "user" LIMIT 1');
        return Response.json({ ok: true, service: 'auth' });
      }
      if (!['GET', 'POST', 'PATCH'].includes(request.method)) throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.');
      if (request.method !== 'GET') {
        const origin = request.headers.get('origin');
        if (!origin || !settings.trustedOrigins.includes(origin)) throw new HttpError(403, 'INVALID_ORIGIN', 'Request origin is not allowed.');
        if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Send a JSON request.');
      }
      if (path === '/auth/staff' || path.startsWith('/auth/staff/')) {
        response = await handleStaff(request, mutationPool, auth);
      } else if (path === '/auth/get-session' && request.method === 'GET') {
        const session = await auth.api.getSession({ headers: request.headers, query: { disableCookieCache: true, disableRefresh: true } });
        // Never relay a session token in the JSON body to the browser.
        response = Response.json(session && session.user.active === true ? {
          user: session.user,
          session: { id: session.session.id, userId: session.session.userId, expiresAt: session.session.expiresAt },
        } : null);
      } else if (path === '/auth/sign-in/email' && request.method === 'POST') {
        const input = await request.clone().json() as { email?: unknown };
        const email = typeof input?.email === 'string' ? input.email.trim().toLowerCase() : '';
        await checkLoginLimit(pool, email, request.headers.get('x-forwarded-for') || 'unknown');
        // Lock waiters use a separate, single-connection pool. Better Auth
        // must retain free connections while the lock holder calls its handler.
        const client = await mutationPool.connect();
        try {
          await client.query('SELECT pg_advisory_lock($1)', [staffLock]);
          const result = await auth.handler(request);
          // Better Auth's login payload contains the raw session token. The
          // console only needs the HttpOnly cookie and the authenticated user.
          const body = await result.json() as Record<string, unknown>;
          delete body.token;
          const headers = new Headers(result.headers);
          headers.delete('content-length');
          response = Response.json(body, { status: result.status, headers });
        } finally {
          await client.query('SELECT pg_advisory_unlock($1)', [staffLock]);
          client.release();
        }
      } else if (path === '/auth/sign-out' && request.method === 'POST') {
        response = await auth.handler(request);
      } else {
        throw new HttpError(404, 'NOT_FOUND', 'Not found.');
      }
    } catch (error) {
      if (error instanceof HttpError) response = Response.json({ code: error.code, message: error.message }, { status: error.status });
      else if (error instanceof z.ZodError || error instanceof SyntaxError) response = Response.json({ code: 'INVALID_INPUT', message: error instanceof z.ZodError ? error.issues[0]?.message || 'Check the supplied values.' : 'Invalid JSON body.' }, { status: 400 });
      else if ((error as { code?: string }).code === '23505') response = Response.json({ code: 'EMAIL_EXISTS', message: 'An account with this email already exists.' }, { status: 409 });
      else response = Response.json({ code: 'SERVICE_UNAVAILABLE', message: 'Authentication is temporarily unavailable.' }, { status: 503 });
    }
    if (response.status === 429) response.headers.set('retry-after', '60');
    response.headers.set('cache-control', 'no-store');
    response.headers.set('x-content-type-options', 'nosniff');
    return response;
  };
}
