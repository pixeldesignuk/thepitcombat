# Console authentication

A small, private Node service using Better Auth 1.7.3 for email/password verification, password hashing, signed HttpOnly cookies, and database sessions. PostgreSQL auth tables live in `pit_auth`; `AUTH_DB_SCHEMA` can select a separate schema for tests. Interest records are unaffected.

## Local setup

Copy `.env.example` to `.env`, set a random `BETTER_AUTH_SECRET` of at least 32 characters and separate strong seed passwords, then run:

```sh
pnpm --filter @pit/auth migrate
pnpm --filter @pit/auth seed
pnpm --filter @pit/auth dev
```

The local `.env` generated during setup contains random credentials and has mode `0600`. Seed emails default in the example to `admin@thepitcombat.test` and `staff@thepitcombat.test`. Seeding creates missing users and never changes existing passwords, roles, or account status. Keep seed credentials in private environment variables. There is no public registration or email delivery dependency.

The console forwards `/auth/*` to `AUTH_INTERNAL_URL`, normally `http://localhost:3002`. Set `BETTER_AUTH_URL` to the **console's public origin**, not the private service address. `AUTH_TRUSTED_ORIGINS` lists additional exact console origins, separated by commas. The proxy must preserve cookies, Origin and every Set-Cookie header, and overwrite `x-forwarded-for` from a trusted connection/proxy source. Production requires an HTTPS console origin and issues Secure cookies. Auth has no public Railway domain.

## Browser contract

All mutations require JSON and a trusted Origin. Errors contain `code` and `message`.

| Method | Path | Body / response |
| --- | --- | --- |
| POST | `/auth/sign-in/email` | `{email,password}`; returns the user and sets an HttpOnly session cookie |
| POST | `/auth/sign-out` | `{}`; revokes the current session and expires the cookie |
| GET | `/auth/get-session` | `null` or `{user:{id,name,email,role,active,...},session:{id,userId,expiresAt}}` |
| GET | `/auth/staff` | Admin only; `{users:[{id,name,email,role,active,createdAt,updatedAt}]}` |
| POST | `/auth/staff` | Admin only; `{name,email,password,role}`; returns `{user}` |
| PATCH | `/auth/staff/:id` | Admin only; `{role?,active?}`; returns `{user}` |
| POST | `/auth/staff/:id/reset-password` | Admin only; `{password}`; returns `{success:true}` |
| GET | `/healthz` | Database/schema readiness |

Passwords must contain 12–128 characters. Roles are `admin` and `staff`. Administrators cannot demote/deactivate themselves. Staff writes serialize their authorization and final active-admin check in a transaction. Demotion, deactivation and password reset revoke every affected session. Resetting your own password requires signing in again. Password verification/session insertion and staff changes share a database lock to prevent a concurrent password reset from leaving an old-password session valid. A database trigger also rejects session insertion for inactive users.

The business API forwards the browser cookie to `/auth/get-session` and checks `user.active === true` plus the stored role. Session responses never expose the raw session token, and cookie caching is disabled so revocation takes effect on the next request. No API key grants staff access. Public HTTP routes are explicitly allowlisted; Better Auth's registration, account mutation and plugin routes are unavailable. Login attempts are limited to 10 per minute per normalized email and observed IP, with a broad 300-per-minute IP ceiling, using database-backed counters. Sessions expire after 12 hours and the console requires a fresh sign-in.

## Build and verification

```sh
pnpm --filter @pit/auth build
pnpm --filter @pit/auth test
TEST_DATABASE_URL=postgresql://pit:pit_dev@127.0.0.1:55432/pit pnpm --filter @pit/auth test
```

The integration test uses only the explicit TEST_DATABASE_URL database but creates and drops a random isolated auth schema. It covers actual password verification and cookies, seed idempotence, role enforcement, CSRF rejection, registration bypasses, concurrent administrator demotions, deactivation, password reset, and logout revocation.

Railway predeploy runs the compiled migration followed by seed:

```sh
node apps/backend/auth/dist/migrate.js && node apps/backend/auth/dist/seed.js
```

Start with `node apps/backend/auth/dist/server.js`. Migrations are additive Better Auth migrations plus an auth-only constraint/trigger; they do not drop existing application tables. `PORT` takes precedence over `AUTH_PORT`.

Implementation references: [Better Auth email/password](https://better-auth.com/docs/authentication/email-password), [database schemas and programmatic migrations](https://better-auth.com/docs/concepts/database), and [configuration options](https://better-auth.com/docs/reference/options).
