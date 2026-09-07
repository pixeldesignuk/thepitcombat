# Railway Infrastructure as Code

The project is configured in one [`.railway/railway.ts`](.railway/railway.ts). It targets Railway project **thepit**, environment **development**, and retains the existing public-site service name **website**. The source code for that service remains in `apps/web/site`. The applied migration retained `Postgres` and created `api` and `dash`.

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
| `dash` | `apps/web/dash/Dockerfile` | Built Vite/React app through a Node static server |

The definition sets application `PORT=3000`, one replica per application's configured region, `/healthz` and a 120-second health timeout. Restart uses Railway's default on-failure policy with ten retries, rather than explicit fields that Railway normalizes away. API pre-deploy runs `node apps/backend/api/dist/migrate.js`. PostgreSQL remains a separate persistent resource.

The website's server-only `API_URL` uses `http://${{api.RAILWAY_PRIVATE_DOMAIN}}:3000`. The browser posts to the website's same-origin `/api/registrations` endpoint. The dashboard calls the API's **public HTTPS origin**, so website, API and dashboard need their correct public domains. Public domains are not interchangeable with Railway private DNS.

## Values kept on Railway

`preserve()` retains a value already configured on the selected Railway service. It does **not** create a secret, invent a URL or supply a missing value. Supply missing values in Railway before expecting a new service to work. [Preservation semantics](https://docs.railway.com/infrastructure-as-code/reference)

The live import confirmed that `website.PUBLIC_SITE_URL` is not set yet. It must be supplied for the website build. The new API and dashboard also need their preserved admin/email/origin values configured; a clean or non-destructive infrastructure plan does not establish application readiness.

| Service | Required or optional configuration |
| --- | --- |
| `website` | `PUBLIC_SITE_URL`: actual website HTTPS origin. Optional accurate `OPERATOR_NAME`, `PRIVACY_EMAIL`, `CORRESPONDENCE_ADDRESS`. |
| `api` | `DATABASE_URL` references Postgres; `PUBLIC_SITE_URL` references website. Set `DASH_URL` to dashboard HTTPS origin and `ADMIN_API_TOKEN` to a long random secret. Configure `RESEND_API_KEY`, verified `RESEND_FROM_EMAIL` and monitored `REPLY_TO_EMAIL` for email delivery. |
| `dash` | `VITE_API_URL`: API public HTTPS origin, never an admin token or private DNS URL. |

`PUBLIC_SITE_URL` must exist at website **build time and runtime**: its Docker argument pins Astro's trusted forwarded-host policy. Rebuild when the website domain changes. Dashboard `VITE_API_URL` is also a public Docker build argument; rebuild when it changes. Keep database credentials, admin tokens and Resend keys on the API only, never in frontend build arguments.

Local configuration stays in each app's ignored `.env`; API secrets belong in `apps/backend/api/.env`. IaC does not upload those files. Railway supplies deployed variables independently. The root `.env` is not loaded.

## Deployment verification

After the intended configuration is applied, verify API migration and `/healthz`, then deploy/rebuild the website and dashboard with their public-origin values. Submit controlled contact details, check actual PostgreSQL/dashboard receipt and separately verify Resend delivery. A healthy API or saved registration does not prove an email was delivered.

If logs still show Railpack or “no start command”, inspect the latest plan and applied environment: the affected service must use its Dockerfile and repository root, with old overrides removed. A Git push alone cannot correct unapplied infrastructure settings.

Final live verification on 7 September 2026: the normalized IaC definition produces **no plan changes**. All three application deployments report **SUCCESS** with the exact intended Dockerfiles; API migration/start and website/dashboard startup succeeded. The original Postgres deployment is unchanged. No public domains are assigned yet, and required origins, admin, dashboard API URL and Resend settings remain unset; public form operation and real email delivery are therefore unverified.

Local verification additionally covered isolated PostgreSQL persistence, retry handling, dashboard authentication and simulated Railway HTTPS forwarding. Matching Host/Origin succeeded, hostile Origin failed and native submission redirected after saving. `compose.yaml` remains only the local PostgreSQL dependency; it is not the Railway deployment definition.
