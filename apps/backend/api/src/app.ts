import Fastify from 'fastify';
import cors from '@fastify/cors';
import formbody from '@fastify/formbody';
import { createHash, timingSafeEqual } from 'node:crypto';
import { registrationSchema, type RegistrationStore } from './registration.js';

export function createApp(options: { store: RegistrationStore; origins: string[]; adminToken: string; logger?: boolean }) {
  const app = Fastify({ bodyLimit: 8192, logger: options.logger ?? false, disableRequestLogging: true });
  app.register(cors, { origin: options.origins, methods: ['GET', 'POST'], allowedHeaders: ['Content-Type', 'Authorization'] });
  app.register(formbody);
  app.setErrorHandler((error, request, reply) => {
    const status = (error as { statusCode?: number }).statusCode || 500;
    if (status >= 500) request.log.error({ event: 'request_failed', requestId: request.id }, 'Request failed');
    reply.code(status).send({ ok: false, message: status === 429 ? 'Too many attempts. Please try again later.' : status >= 500 ? 'We could not save your details. Please try again.' : 'Check your submission and try again.' });
  });
  app.get('/healthz', async (_request, reply) => {
    try { await options.store.healthy(); return { ok: true }; }
    catch { return reply.code(503).send({ ok: false }); }
  });
  app.post('/v1/registrations', async (request, reply) => {
    if (request.headers.origin && !options.origins.includes(request.headers.origin)) return reply.code(403).send({ ok: false, message: 'This origin is not allowed.' });
    const parsed = registrationSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ ok: false, message: 'Enter your name, a valid email and phone number, and agree to opening updates.', fields: parsed.error.flatten().fieldErrors });
    if (parsed.data.website) return reply.code(400).send({ ok: false, message: 'We could not accept this submission.' });
    const result = await options.store.save(parsed.data);
    if (result === 'conflict') return reply.code(409).send({ ok: false, message: 'This submission was already used with different details. Refresh the page and try again.' });
    return reply.code(result === 'created' ? 201 : 200).send({ ok: true, message: 'You’re on the interest list. We’ll share opening updates using the details you provided.' });
  });
  app.get('/v1/admin/registrations', async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    const supplied = request.headers.authorization?.startsWith('Bearer ') ? request.headers.authorization.slice(7) : '';
    const digest = (value: string) => createHash('sha256').update(value).digest();
    if (!options.adminToken || !supplied || !timingSafeEqual(digest(supplied), digest(options.adminToken))) return reply.code(401).send({ ok: false, message: 'Unauthorised' });
    return { registrations: await options.store.list() };
  });
  return app;
}
