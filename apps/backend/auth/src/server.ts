import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { fromNodeHeaders } from 'better-auth/node';
import { createAuth, createPool } from './auth.js';
import { createHandler } from './app.js';
import { readSettings } from './config.js';

const settings = readSettings();
const pool = createPool(settings);
const mutationPool = createPool(settings, 1);
const handler = createHandler(createAuth(pool, settings), pool, settings, mutationPool);
const server = createServer(async (req, res) => {
  try {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 16_384) {
        res.writeHead(413, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ code: 'BODY_TOO_LARGE', message: 'Request body is too large.' }));
        return;
      }
      chunks.push(chunk);
    }
    const method = req.method || 'GET';
    const request = new Request(new URL(req.url || '/', settings.publicUrl), {
      method,
      headers: fromNodeHeaders(req.headers),
      ...(method !== 'GET' && method !== 'HEAD' ? { body: Buffer.concat(chunks) } : {}),
    });
    const response = await handler(request);
    res.statusCode = response.status;
    response.headers.forEach((value, key) => { if (key !== 'set-cookie') res.setHeader(key, value); });
    const cookies = response.headers.getSetCookie();
    if (cookies.length) res.setHeader('set-cookie', cookies);
    if (response.body) Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]).pipe(res);
    else res.end();
  } catch {
    res.writeHead(503, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ code: 'SERVICE_UNAVAILABLE', message: 'Authentication is temporarily unavailable.' }));
  }
});
server.listen(settings.port, settings.host, () => console.log(`Auth service listening on port ${settings.port}`));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(() => { void Promise.all([pool.end(), mutationPool.end()]).then(() => process.exit(0)); }));
