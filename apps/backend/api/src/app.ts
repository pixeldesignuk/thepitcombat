import Fastify, { type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import formbody from '@fastify/formbody';
import { registrationSchema, type RegistrationStore } from './registration.js';
import { interestListQuerySchema, interestUpdateSchema } from './interest.js';

export type StaffUser = { id: string; email: string; role: 'admin' | 'staff'; active: true };
export type Authenticate = (cookie: string | undefined) => Promise<StaffUser | null>;

export class AuthServiceUnavailableError extends Error {
  statusCode = 503;
}

type AuthServiceResponse = {
  session?: unknown;
  user?: { id?: unknown; email?: unknown; role?: unknown; active?: unknown };
} | null;

export function createInternalAuthenticator(authInternalUrl: string, request = fetch): Authenticate {
  const endpoint = authInternalUrl ? new URL('/auth/get-session', authInternalUrl).toString() : '';
  return async cookie => {
    if (!endpoint || !cookie) return null;
    let response: Response;
    try { response = await request(endpoint, { headers: { Cookie: cookie }, signal: AbortSignal.timeout(5000) }); }
    catch { throw new AuthServiceUnavailableError('Auth service unavailable'); }
    if (!response.ok) throw new AuthServiceUnavailableError('Auth service unavailable');
    let body: AuthServiceResponse;
    try { body = await response.json() as AuthServiceResponse; }
    catch { throw new AuthServiceUnavailableError('Auth service unavailable'); }
    const user = body?.user;
    if (!body?.session || typeof body.session !== 'object' || !user || user.active !== true || (user.role !== 'admin' && user.role !== 'staff') || typeof user.id !== 'string' || typeof user.email !== 'string') return null;
    return { id: user.id, email: user.email, role: user.role, active: true };
  };
}

export function createApp(options: { store: RegistrationStore; origins: string[]; consoleOrigins: string[]; authenticate: Authenticate; logger?: boolean }) {
  const app = Fastify({ bodyLimit: 32768, logger: options.logger ?? false, disableRequestLogging: true });
  app.register(cors, { origin: options.origins, methods: ['GET', 'POST', 'PATCH'], allowedHeaders: ['Content-Type'] });
  app.register(formbody);
  app.setErrorHandler((error, request, reply) => {
    const status = (error as { statusCode?: number }).statusCode || 500;
    if (status >= 500) request.log.error({ event: 'request_failed', requestId: request.id }, 'Request failed');
    reply.code(status).send({ ok: false, message: status === 429 ? 'Too many attempts. Please try again later.' : status >= 500 ? 'We could not save your details. Please try again.' : 'Check your submission and try again.' });
  });

  const requireStaff = async (request: FastifyRequest, reply: { code(status: number): { send(body: unknown): unknown } }) => {
    const user = await options.authenticate(request.headers.cookie);
    if (!user) {
      await reply.code(401).send({ ok: false, message: 'Unauthorised' });
      return null;
    }
    return user;
  };
  const requireConsoleOrigin = (request: FastifyRequest, reply: { code(status: number): { send(body: unknown): unknown } }) => {
    if (request.headers.origin && !options.consoleOrigins.includes(request.headers.origin)) {
      void reply.code(403).send({ ok: false, message: 'This origin is not allowed.' });
      return false;
    }
    return true;
  };

  app.get('/healthz', async (_request, reply) => {
    try { await options.store.healthy(); return { ok: true }; }
    catch { return reply.code(503).send({ ok: false }); }
  });
  app.post('/v1/registrations', async (request, reply) => {
    if (request.headers.origin && !options.origins.includes(request.headers.origin)) return reply.code(403).send({ ok: false, message: 'This origin is not allowed.' });
    const parsed = registrationSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ ok: false, message: 'Enter your name, a valid email and phone number, choose training groups, and agree to opening updates.', fields: parsed.error.flatten().fieldErrors });
    if (parsed.data.website) return reply.code(400).send({ ok: false, message: 'We could not accept this submission.' });
    const result = await options.store.save(parsed.data);
    if (result === 'conflict') return reply.code(409).send({ ok: false, message: 'This submission was already used with different details. Refresh the page and try again.' });
    return reply.code(result === 'created' ? 201 : 200).send({ ok: true, message: 'You’re on the interest list. We’ll share opening updates using the details you provided.' });
  });
  app.get('/v1/interests', async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    if (!await requireStaff(request, reply)) return;
    const parsed = interestListQuerySchema.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ ok: false, message: 'Check your request and try again.' });
    const result = await options.store.listInterest(parsed.data);
    return { interests: result.items, total: result.total, page: parsed.data.page, pageSize: parsed.data.pageSize };
  });
  app.get('/v1/interests/:id', async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    if (!await requireStaff(request, reply)) return;
    const id = (request.params as { id?: string }).id || '';
    if (!isUuid(id)) return reply.code(404).send({ ok: false, message: 'Not found' });
    const interest = await options.store.getInterest(id);
    if (!interest) return reply.code(404).send({ ok: false, message: 'Not found' });
    return { interest };
  });
  app.patch('/v1/interests/:id', async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    const user = await requireStaff(request, reply);
    if (!user || !requireConsoleOrigin(request, reply)) return;
    const id = (request.params as { id?: string }).id || '';
    if (!isUuid(id)) return reply.code(404).send({ ok: false, message: 'Not found' });
    const parsed = interestUpdateSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ ok: false, message: 'Check your changes and try again.', fields: parsed.error.flatten().fieldErrors });
    const interest = await options.store.updateInterest(id, parsed.data, user.id);
    if (!interest) return reply.code(404).send({ ok: false, message: 'Not found' });
    return { interest };
  });
  return app;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
