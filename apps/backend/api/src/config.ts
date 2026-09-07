import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';

config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true } as Parameters<typeof config>[0]);

const origins = [process.env.PUBLIC_SITE_URL || 'http://localhost:4321', process.env.DASH_URL || 'http://localhost:5173'].map(value => new URL(value).origin);
if (process.env.NODE_ENV !== 'production') {
  for (const origin of [...origins]) {
    const url = new URL(origin);
    if (url.hostname === 'localhost') { url.hostname = '127.0.0.1'; origins.push(url.origin); }
  }
}

export const settings = {
  port: Number(process.env.PORT || process.env.API_PORT || 3001),
  databaseUrl: process.env.DATABASE_URL || '',
  adminToken: process.env.ADMIN_API_TOKEN || '',
  origins,
  resendKey: process.env.RESEND_API_KEY || '',
  resendFrom: process.env.RESEND_FROM_EMAIL || '',
  replyTo: process.env.REPLY_TO_EMAIL || undefined,
};
