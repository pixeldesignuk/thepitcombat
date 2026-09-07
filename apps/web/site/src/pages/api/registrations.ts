import type { APIRoute } from 'astro';

const MAX_BYTES = 8192;
export const POST: APIRoute = async ({ request }) => {
  const json = request.headers.get('accept')?.includes('application/json');
  const errorResponse = (message: string, status = 503) => json
    ? Response.json({ ok: false, message }, { status, headers: { 'Cache-Control': 'no-store' } })
    : new Response(null, { status: 303, headers: { Location: '/?registration=error#register', 'Cache-Control': 'no-store' } });
  const type = request.headers.get('content-type') || '';
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return errorResponse('Please submit the form from the academy website.', 403);
  if (!type.startsWith('application/x-www-form-urlencoded')) return errorResponse('Please use the registration form.', 415);
  if (Number(request.headers.get('content-length')) > MAX_BYTES) return errorResponse('This submission is too large.', 413);
  try {
    const reader = request.body?.getReader();
    if (!reader) return errorResponse('Please complete the form.', 400);
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > MAX_BYTES) { await reader.cancel(); return errorResponse('This submission is too large.', 413); }
      chunks.push(value);
    }
    const backend = process.env.API_URL || 'http://localhost:3001';
    const response = await fetch(`${backend.replace(/\/$/, '')}/v1/registrations`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: Buffer.concat(chunks).toString('utf8'), signal: AbortSignal.timeout(12000),
    });
    const result = await response.json();
    if (!response.ok || result.ok !== true) return errorResponse(result.message || 'We couldn’t save your registration. Please try again.', response.status >= 400 ? response.status : 502);
    if (!json) return new Response(null, { status: 303, headers: { Location: '/thanks/?registered=1', 'Cache-Control': 'no-store' } });
    return Response.json({ ok: true, message: result.message }, { status: response.status, headers: { 'Cache-Control': 'no-store' } });
  } catch { return errorResponse('We couldn’t reach registration just now. Your details are still in the form. Please try again shortly.'); }
};
