# The Pit Railway configuration

`railway.ts` is the single infrastructure definition for **thepit / development**. Its guard rejects other projects or environments. The public-site service is `website`; its source directory remains `apps/web/site`. Existing Postgres configuration and its volume are retained; the application services are `website`, `api`, `dash` and `auth`.

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm railway:check
pnpm exec railway status
pnpm railway:plan
```

The local CLI is authenticated and linked to `thepit / development`. On another machine, authenticate with `pnpm exec railway login`, then link with `pnpm exec railway link --project thepit --environment development`.

After reviewing the intended changes, run:

```sh
pnpm exec railway config apply
```

The CLI asks for confirmation. A Git push does not apply this file. `preserve()` leaves existing values on Railway; missing secrets or public URLs must be configured there, not committed here. Local app `.env` files are not infrastructure input.

The initial three-service deployment was verified on 7 September 2026. The console extension adds a private Better Auth service, routes dashboard authentication and API requests through the dashboard server, and applies additive authentication and interest-management migrations. Review the current plan before applying; Postgres and its volume must remain unchanged.

The development console uses `https://dev-console.thepitcombat.com` as `dash.CONSOLE_URL`. Auth uses the same HTTPS origin for cookies and origin checks. Its secret and seed account settings are Railway-managed values; local credentials are in the ignored `apps/backend/auth/.env`. Never commit them. The auth service needs no public domain.

Earlier website mail/admin variables and dashboard `VITE_API_URL` are preserved to avoid deleting manually configured remote values, but the new console does not consume them. Email delivery requires Resend settings on **api**. An admin API token no longer grants console access.

See [the deployment guide](../RAILWAY.md) for domain and variable requirements, Docker networking and verification.
