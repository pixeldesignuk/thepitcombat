# The Pit Railway configuration

`railway.ts` is the single infrastructure definition for **thepit / development**. Its guard rejects other projects or environments. The existing public-site service is `website`; its source directory remains `apps/web/site`. Existing Postgres configuration and its volume are retained; `api` and `dash` are additions.

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

Validation on 7 September 2026: local SDK/type and graph checks passed. The authenticated live plan reported **2 additions, 5 changes, 0 deletions**, with **no Postgres changes**. This records a reviewed plan, not an applied migration; rerun the plan if the source or live environment changes.

See [the deployment guide](../RAILWAY.md) for domain and variable requirements, safe existing-state imports, Docker networking and verification.
