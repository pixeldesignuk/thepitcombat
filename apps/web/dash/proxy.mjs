import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';

const MAX_BODY = 64 * 1024;
const hopHeaders = new Set(['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade']);

function fail(res, status, message) {
  if (res.headersSent) return res.destroy();
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify({ message }));
}

// Upstreams come only from server configuration. Browser requests and cookies stay
// on the console origin, including when Railway services use separate domains.
export async function proxyConsoleRequest(req, res, pathname, settings) {
  const isAuth = pathname === '/auth' || pathname.startsWith('/auth/');
  const isApi = pathname === '/api' || pathname.startsWith('/api/');
  if (!isAuth && !isApi) return false;
  if (!['GET', 'POST', 'PATCH', 'DELETE', 'HEAD'].includes(req.method)) {
    fail(res, 405, 'This method is not supported.');
    return true;
  }
  if (!['GET', 'HEAD'].includes(req.method)) {
    const origin = req.headers.origin;
    if (!origin || !settings.origins.includes(origin)) {
      fail(res, 403, 'Please use the console to make this change.');
      return true;
    }
  }
  const base = isAuth ? settings.authUrl : settings.apiUrl;
  if (!base) {
    fail(res, 503, 'The console service is not configured.');
    return true;
  }
  let target;
  try {
    target = new URL(base);
    if (!['http:', 'https:'].includes(target.protocol)) throw new Error('Invalid upstream');
    const original = new URL(req.url, 'http://localhost');
    target.pathname = isAuth ? original.pathname : `/v1${original.pathname.slice(4)}`;
    target.search = original.search;
  } catch {
    fail(res, 503, 'The console service is not configured.');
    return true;
  }
  if (Number(req.headers['content-length']) > MAX_BODY) {
    fail(res, 413, 'This request is too large.');
    return true;
  }
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > MAX_BODY) {
        fail(res, 413, 'This request is too large.');
        return true;
      }
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);
    const headers = {};
    for (const name of ['accept', 'content-type', 'cookie', 'origin', 'user-agent']) {
      if (req.headers[name]) headers[name] = req.headers[name];
    }
    headers['x-forwarded-for'] = req.socket.remoteAddress || 'unknown';
    if (body.length) headers['content-length'] = String(body.length);
    const transport = target.protocol === 'https:' ? httpsRequest : httpRequest;
    const upstream = transport(target, { method: req.method, headers, timeout: 15000 }, response => {
      for (const [name, value] of Object.entries(response.headers)) {
        if (value !== undefined && !hopHeaders.has(name) && !name.startsWith('access-control-')) res.setHeader(name, value);
      }
      res.setHeader('Cache-Control', 'no-store');
      res.writeHead(response.statusCode || 502);
      response.on('error', () => res.destroy());
      response.pipe(res);
    });
    upstream.on('timeout', () => upstream.destroy(new Error('Upstream timeout')));
    upstream.on('error', () => fail(res, 502, 'The console service could not be reached. Please try again.'));
    res.on('close', () => { if (!res.writableEnded) upstream.destroy(); });
    upstream.end(body);
  } catch {
    fail(res, 400, 'The request could not be read.');
  }
  return true;
}
