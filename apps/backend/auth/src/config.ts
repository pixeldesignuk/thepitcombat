import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';

config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true } as Parameters<typeof config>[0]);

export interface Settings {
  schema: string;
  port: number;
  host: string;
  databaseUrl: string;
  secret: string;
  publicUrl: string;
  trustedOrigins: string[];
  secureCookies: boolean;
}

export function readSettings(env = process.env): Settings {
  const publicUrl = env.BETTER_AUTH_URL || 'http://localhost:5173';
  const url = new URL(publicUrl);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('BETTER_AUTH_URL must use HTTP or HTTPS');
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  if (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32) throw new Error('BETTER_AUTH_SECRET must contain at least 32 characters');
  if (env.NODE_ENV === 'production' && url.protocol !== 'https:') throw new Error('Production BETTER_AUTH_URL must use HTTPS');
  const schema = env.AUTH_DB_SCHEMA || 'pit_auth';
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(schema)) throw new Error('AUTH_DB_SCHEMA must be a lowercase PostgreSQL identifier');
  const trustedOrigins = [...new Set([url.origin, ...(env.AUTH_TRUSTED_ORIGINS || '').split(',').filter(Boolean).map(value => new URL(value.trim()).origin)])];
  return {
    schema,
    port: Number(env.PORT || env.AUTH_PORT || 3002),
    host: env.HOST || '::',
    databaseUrl: env.DATABASE_URL,
    secret: env.BETTER_AUTH_SECRET,
    publicUrl: url.origin,
    trustedOrigins,
    secureCookies: url.protocol === 'https:',
  };
}
