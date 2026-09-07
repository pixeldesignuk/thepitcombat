# Railway Infrastructure as Code

The project is configured in one [`.railway/railway.ts`](.railway/railway.ts). It targets Railway project **thepit**, environment **development**, and retains the existing public-site service name **website**. The source code for that service remains in `apps/web/site`. The environment contains `website`, `api`, `dash`, and the dedicated `auth` service, backed by the existing Postgres resource and volume.

This replaces the three per-service `railway.json` files and the former manual-settings workflow. Railway evaluates IaC through its CLI. **Pushing the file to GitHub does not apply infrastructure changes**; this repository has no infrastructure auto-apply pipeline. Existing application GitHub autodeploys are a separate mechanism. [Railway IaC guide](https://docs.railway.com/infrastructure-as-code)

## Check, plan and apply

Run from this standalone repository root. The pinned Railway SDK and CLI are installed with the workspace dependencies:

```sh
pnpm install --frozen-lockfile
pnpm railway:check
pnpm exec railway login
pnpm exec railway link --project thepit --environment development
pnpm exec railway status
pnpm railway:plan
```

`railway:check` validates the definition locally; it does not compare it with Railway. `railway:plan` reads the selected environment and shows proposed changes. The authoring file rejects a different project name or environment. Confirm the status and the plan both target **thepit / development**, not an environment named `dev`.

On 7 September 2026, the local CLI was authenticated and linked to that environment. Local SDK/type and graph validation passed; the reviewed live plan reported **2 additions, 5 changes, 0 deletions**. After commit `d50f085` was pushed, `pnpm exec railway config apply --yes` succeeded: website configuration changed and `api`/`dash` were created, with **no Postgres changes**. The imported Postgres 18 image, volume, credentials and placement were retained. A new plan checks post-apply drift or subsequent source/live-state changes; apply success alone does not establish application readiness.

After reviewing the exact plan, apply it with:

```sh
pnpm exec railway config apply
```

The interactive command presents the changes for confirmation. The initial reviewed apply used `--yes` as recorded above; future changes should still be reviewed against the selected environment. Plan output redacts variable values by default; no secret-revealing flags are needed. [CLI configuration reference](https://docs.railway.com/cli/config)

## Reconcile the existing environment

IaC identifies services by their visible Railway names. Keep `website` and `Postgres` matched to the existing services; a different name can imply resource creation rather than updating the intended service. Keep the existing database image, volume and credentials represented in the definition.

The file describes the whole environment: omissions can propose deletions. Before the first apply, compare all existing services, variables, domains and mounted volumes with the file, and carry forward anything that must remain. Investigate unexpected deletes or database replacement before applying. [IaC guide](https://docs.railway.com/infrastructure-as-code), [resource reference](https://docs.railway.com/infrastructure-as-code/reference)

For comparison, `pnpm exec railway config pull --json` obtains the linked state without replacing the authored TypeScript file. Ordinary `config pull` writes an authoring file, so do not overwrite this reviewed definition casually. Leave out `--include-variables`; existing secret values should remain represented by `preserve()`, not copied into source. If a live service still has an old Railway Config File path configured, clear that legacy path before using IaC for it. Deleting the repository JSON alone does not clear a remote setting. [CLI import reference](https://docs.railway.com/cli/config), [migration guide](https://docs.railway.com/infrastructure-as-code)

## Docker services and networking

All application services use GitHub source `pixeldesignuk/thepitcombat`, branch `main`, with **Root Directory `/`** and repository-root Docker build context. The definition selects each Dockerfile explicitly and clears build/start overrides so the image's command runs.

| Railway service | Dockerfile | Runtime |
| --- | --- | --- |
| `website` | `apps/web/site/Dockerfile` | Astro standalone Node server |
| `api` | `apps/backend/api/Dockerfile` | Fastify API and PostgreSQL-backed email outbox |
| `dash` | `apps/web/dash/Dockerfile` | Vite/React console with a Node authentication/API proxy |
| `auth` | `apps/backend/auth/Dockerfile` | Better Auth email/password sessions and staff management |

The definition sets application `PORT=3000`, one replica per application's configured region, `/healthz` and a 120-second health timeout. Restart uses Railway's default on-failure policy with ten retries, rather than explicit fields that Railway normalizes away. API pre-deploy runs `node apps/backend/api/dist/migrate.js`. Auth pre-deploy runs its compiled `migrate.js` and `seed.js`; seeding only creates missing accounts. Auth tables use the separate `pit_auth` schema. API and auth bind to `::` for Railway private-network IPv6 and IPv4. PostgreSQL remains a separate persistent resource.

The website's server-only `API_URL` uses `http://${{api.RAILWAY_PRIVATE_DOMAIN}}:3000`. The browser posts to the website's same-origin `/api/registrations` endpoint. The console browser calls only its own `/auth` and `/api` routes. Its Node server forwards them to private auth/API addresses, preserving HttpOnly cookies. Website and console need public HTTPS domains; auth and API do not need public domains for this workflow.

## Values kept on Railway

`preserve()` retains a value already configured on the selected Railway service. It does **not** create a secret, invent a URL or supply a missing value. Supply missing values in Railway before expecting a new service to work. [Preservation semantics](https://docs.railway.com/infrastructure-as-code/reference)

| Service | Required or optional configuration |
| --- | --- |
| `website` | `PUBLIC_SITE_URL`: actual website HTTPS origin. Optional accurate `OPERATOR_NAME`, `PRIVACY_EMAIL`, `CORRESPONDENCE_ADDRESS`. |
| `api` | Database, auth address and allowed console origin are references. Configure `RESEND_API_KEY`, verified `RESEND_FROM_EMAIL` and monitored `REPLY_TO_EMAIL` for confirmation emails. |
| `dash` | `CONSOLE_URL`: exact console HTTPS origin. Private API/auth proxy targets are declared in IaC. |
| `auth` | `BETTER_AUTH_SECRET`: random signing secret. `SEED_ADMIN_EMAIL`, `SEED_ADMIN_NAME`, `SEED_ADMIN_PASSWORD` and the corresponding `SEED_STAFF_*` values create initial accounts. Database and public auth origin are references. |

`PUBLIC_SITE_URL` must exist at website **build time and runtime** because Astro trusts that forwarded public host. Rebuild the website when its domain changes. Console proxy targets are runtime settings; no public `VITE_API_URL` or browser admin key is used. The auth public origin is the console origin, not the private auth address. Production auth requires HTTPS.

Keep the same auth signing secret across restarts. Set seed credentials on the auth service before its initial migration/seed deployment; do not commit them. Re-running seeding does not reset passwords, change roles or re-enable existing accounts. Administrators manage accounts inside the console after bootstrap. Password resets, role changes and deactivation revoke affected sessions; the final active administrator is protected.

Local `.env` files are never uploaded by IaC. Railway supplies deployed variables independently. The auth service and API use the configured database; use an explicit local `TEST_DATABASE_URL` for isolated automated tests.

## Deployment verification

After the intended configuration is applied, verify API/auth migrations and `/healthz`, then sign into the console and check interest and staff management. Submit controlled contact details, check actual PostgreSQL/dashboard receipt and separately verify Resend delivery. A healthy API or saved registration does not prove an email was delivered.

If logs still show Railpack or “no start command”, inspect the latest plan and applied environment: the affected service must use its Dockerfile and repository root, with old overrides removed. A Git push alone cannot correct unapplied infrastructure settings.

The initial three-service IaC migration was verified without database changes. The console/auth extension is validated separately through real session, role, persistence and browser tests; public form and Resend delivery must also be checked on the actual configured host.
Local verification additionally covered isolated PostgreSQL persistence, retry handling, dashboard authentication and simulated Railway HTTPS forwarding. Matching Host/Origin succeeded, hostile Origin failed and native submission redirected after saving. `compose.yaml` remains only the local PostgreSQL dependency; it is not the Railway deployment definition.
