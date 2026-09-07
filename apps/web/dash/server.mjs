import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { proxyConsoleRequest } from './proxy.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), 'dist');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const consoleOrigin = process.env.CONSOLE_URL || (process.env.NODE_ENV !== 'production' ? 'http://localhost:5173' : '');
const origins = consoleOrigin ? [new URL(consoleOrigin).origin] : [];
if (process.env.NODE_ENV !== 'production' && origins.length) {
  const local = new URL(origins[0]);
  if (local.hostname === 'localhost') { local.hostname = '127.0.0.1'; origins.push(local.origin); }
}
const proxySettings = {
  origins,
  authUrl: process.env.AUTH_INTERNAL_URL || (process.env.NODE_ENV !== 'production' ? 'http://localhost:3002' : ''),
  apiUrl: process.env.API_INTERNAL_URL || (process.env.NODE_ENV !== 'production' ? 'http://localhost:3001' : ''),
};

const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store');
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400).end('Invalid path');
    return;
  }
  if (await proxyConsoleRequest(req, res, pathname, proxySettings)) return;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  if (pathname === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(req.method === 'HEAD' ? undefined : '{"status":"ok"}');
    return;
  }

  let filename = resolve(root, `.${pathname}`);
  if (pathname.includes('\0') || (filename !== root && !filename.startsWith(`${root}${sep}`))) {
    res.writeHead(400).end('Invalid path');
    return;
  }
  try {
    let info;
    try { info = await stat(filename); } catch (error) {
      if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error;
    }
    if (!info?.isFile()) {
      // Missing assets must be a 404, not an HTML response masquerading as JS.
      if (extname(pathname) || pathname.startsWith('/assets/')) {
        res.writeHead(404).end('Not found');
        return;
      }
      filename = resolve(root, 'index.html');
      info = await stat(filename);
    }
    res.setHeader('Content-Type', mime[extname(filename)] ?? 'application/octet-stream');
    res.setHeader('Content-Length', info.size);
    if (pathname.startsWith('/assets/')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    res.writeHead(200);
    if (req.method === 'HEAD') res.end();
    else createReadStream(filename).on('error', () => res.destroy()).pipe(res);
  } catch {
    res.writeHead(500).end('Unable to serve dashboard');
  }
});

server.listen(Number(process.env.PORT || 3000), process.env.HOST || '0.0.0.0');
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
