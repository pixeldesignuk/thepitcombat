# The Pit Railway configuration

`railway.ts` is the single infrastructure definition for **thepit / development**. Its guard rejects other projects or environments. The public-site service is `website`; its source directory remains `apps/web/site`. Existing Postgres configuration and its volume are retained; the migration created `api` and `dash`.

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

Applied on 7 September 2026: after local SDK/type and graph checks and review of the live plan (**2 additions, 5 changes, 0 deletions**), commit `d50f085` was pushed and `pnpm exec railway config apply --yes` succeeded against **thepit / development**. The website configuration changed and `api`/`dash` were created, with **no Postgres changes**. Post-apply drift verification is separate; rerun the plan after source or live-state changes.

Final verification: after matching Railway's normalized defaults, the live plan reports **no changes**. All three application deployments report **SUCCESS**, using their intended Dockerfiles; API migration/start and website/dashboard startup succeeded. The original Postgres deployment is unchanged.

Public domains are not assigned yet. Website `PUBLIC_SITE_URL`, API admin/email/dashboard-origin settings and dashboard `VITE_API_URL` still need configuration. Public form operation and real email delivery remain unverified.

See [the deployment guide](../RAILWAY.md) for domain and variable requirements, safe existing-state imports, Docker networking and verification.
