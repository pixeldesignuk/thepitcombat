import { betterAuth } from 'better-auth';
import { Pool } from 'pg';
import type { Settings } from './config.js';

export function createPool(settings: Pick<Settings, 'databaseUrl' | 'schema'>, max = 10) {
  // Auth has its own namespace; existing interest records stay in public.
  return new Pool({ connectionString: settings.databaseUrl, options: `-c search_path=${settings.schema}`, max });
}

export function createAuth(pool: Pool, settings: Settings, validateSchema = true) {
  return betterAuth({
    appName: 'The Pit Console',
    database: pool,
    baseURL: settings.publicUrl,
    basePath: '/auth',
    secret: settings.secret,
    trustedOrigins: settings.trustedOrigins,
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
    },
    user: {
      additionalFields: {
        role: { type: ['admin', 'staff'], required: true, defaultValue: 'staff', input: false },
        active: { type: 'boolean', required: true, defaultValue: true, input: false },
      },
    },
    session: {
      expiresIn: 60 * 60 * 12,
      updateAge: 60 * 60,
      cookieCache: { enabled: false },
    },
    advanced: {
      database: { validateSchema },
      useSecureCookies: settings.secureCookies,
      cookiePrefix: 'pit',
      defaultCookieAttributes: { httpOnly: true, sameSite: 'lax', path: '/' },
      // The dashboard proxy overwrites this header from its own request context.
      ipAddress: { ipAddressHeaders: ['x-forwarded-for'] },
    },
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 100,
      customRules: { '/sign-in/email': { window: 60, max: 300 } },
    },
    databaseHooks: {
      session: {
        create: {
          before: async session => {
            const result = await pool.query('SELECT active FROM "user" WHERE id = $1', [session.userId]);
            return result.rows[0]?.active === true;
          },
        },
      },
    },
  });
}
export type Auth = ReturnType<typeof createAuth>;
