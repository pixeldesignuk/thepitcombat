# Railway deployment

The repository is a pnpm/Turborepo workspace. It uses the Sajda pattern: one Dockerfile and Railway config per application, with the **repository root as the build context**. The website runs Astro's Node standalone server; the API runs Node/Fastify; the Vite dashboard uses a small Node static server. All images use Node 24 and pnpm 10.32.1 with frozen lockfile installs. Runtime images run as the `node` user.

## Services

This workspace is now a **standalone Git repository**, with `package.json` at its root. Use the repository-root settings below when connecting it to Railway.

Create a Railway project with a PostgreSQL service named `Postgres`, and three services connected to the dedicated Pit repository:

| Service name | Root Directory | Config File Path |
| --- | --- | --- |
| `api` | `/` (repository root) | `/apps/backend/api/railway.json` |
| `site` | `/` (repository root) | `/apps/web/site/railway.json` |
| `dash` | `/` (repository root) | `/apps/web/dash/railway.json` |

Only if deploying a different repository that contains this project under a `the pit/` subdirectory, set **Root Directory to `/the pit` for all three services**, and use Config File Paths `/the pit/apps/backend/api/railway.json`, `/the pit/apps/web/site/railway.json` and `/the pit/apps/web/dash/railway.json`. Railway resolves the config-file path from the connected repository independently of Root Directory. The Dockerfile paths already inside these configs stay `apps/...`, relative to the Pit build context. Use the literal space in `the pit`, not `%20`. This alternative does not apply to the standalone repository.

Do not point Root Directory at an individual application: Docker needs the Pit root lockfile and workspace manifest. Each config selects its own Dockerfile. Leave build/start command overrides empty so Docker controls them. All local Docker commands below run from this `the pit/` workspace, regardless of where `.git` lives. No deploy has been performed by adding these files.

Assign public HTTPS domains to the website, dashboard and API. The dashboard calls the public API; the website proxies registration submissions to it over Railway's private network. All servers bind to `0.0.0.0` and respect `PORT`. Set **API `PORT=3000`** for a stable private-service port; website/dashboard can use Railway's assigned port.

## Variables

Development configuration is app-local: `apps/backend/api/.env` contains database, Resend and admin secrets; `apps/web/site/.env` contains website settings; `apps/web/dash/.env` contains its public API URL. The workspace-root `.env` is not loaded. Local `.env` files are ignored by Git and Docker; `.env.example` templates are retained. Add production values in each Railway service's variables UI; do not copy a local `.env` into an image. Turbo hashes each app's own `.env*` files for builds and passes exported API secrets only to API runtime/test tasks.

**API service:**

```dotenv
PORT=3000
DATABASE_URL=${{Postgres.DATABASE_URL}}
ADMIN_API_TOKEN=<a long random secret>
RESEND_API_KEY=<your Resend API key>
RESEND_FROM_EMAIL=The Pit Combat Academy <hello@your-verified-domain>
REPLY_TO_EMAIL=<your monitored inbox>
PUBLIC_SITE_URL=https://<website-domain>
DASH_URL=https://<dashboard-domain>
```

Use a Resend-verified sender domain. Keep `RESEND_API_KEY`, `DATABASE_URL` and `ADMIN_API_TOKEN` on the API service only. Enter the admin token when using the dashboard; it is never a `VITE_*` variable. The configured website/dashboard origins must match their actual HTTPS domains.

**Website service:**

```dotenv
API_URL=http://${{api.RAILWAY_PRIVATE_DOMAIN}}:3000
PUBLIC_SITE_URL=https://<website-domain>
OPERATOR_NAME=<the responsible operator's name>
PRIVACY_EMAIL=<privacy contact email>
CORRESPONDENCE_ADDRESS=<operator correspondence address>
```

`PUBLIC_SITE_URL` is also a public **build-time** Docker argument: Astro pins this exact origin in its trusted host/proxy policy. Set it before the first build and rebuild the website when changing its public domain; keep the runtime value identical. This allows HTTPS requests forwarded by Railway to pass the website's same-origin checks. The remaining website values are runtime configuration. Browser submissions go to its same-origin `/api/registrations` route, which forwards to the API's `/v1/registrations`. The private API address is not shipped to the browser. The operator/privacy fields are optional display details; supply accurate values for public launch.

**Dashboard service:**

```dotenv
VITE_API_URL=https://<api-public-domain>
```

`VITE_API_URL` is a public **build-time** value declared as a Docker `ARG`. Redeploy/rebuild the dashboard when changing it. Resend credentials and admin tokens must never be build arguments.

## Deployment and verification

1. Provision PostgreSQL and set variables before deploying the API. Its pre-deploy command runs `node apps/backend/api/dist/migrate.js`; a migration failure stops deployment. Use Railway database backups before later schema changes.
2. Deploy the API, then site and dashboard. Each service has a `/healthz` check; API health includes a database query. Website/dashboard health only establishes that their HTTP server is running.
3. Open the website and submit a registration with an inbox you control. Check that email and phone are present in the dashboard and that the confirmation arrives through Resend. Check Resend logs if delivery fails; API/database health does not establish email delivery.
4. Check keyboard/mobile form handling, dashboard authentication and a refresh on a dashboard route. Verify invalid submissions fail cleanly and repeated submissions do not produce duplicate contacts.

Build each image locally from the repository root after installing dependencies and updating the lockfile:

```sh
docker build -f apps/backend/api/Dockerfile -t pit-api .
docker build --build-arg PUBLIC_SITE_URL=http://localhost:4321 -f apps/web/site/Dockerfile -t pit-site .
docker build --build-arg VITE_API_URL=http://localhost:3001 -f apps/web/dash/Dockerfile -t pit-dash .
```

`compose.yaml` is a **local PostgreSQL dependency**, not the Railway deployment definition. `docker compose up -d postgres` exposes it only at `127.0.0.1:55432` with database/user `pit` and development password `pit_dev`. Data persists in `pit_pgdata`; do not use these development credentials in production. The application processes run through the root development scripts.

## References

Local verification on 7 September 2026: all three Docker images built from this workspace root with the frozen pnpm lockfile. Temporary containers passed custom-port health checks, API migration, website-to-API registration persistence and retry handling, admin authentication, and dashboard SPA/asset handling against an isolated PostgreSQL database. A production site rebuild with an explicit public domain also passed simulated Railway HTTPS forwarding: matching Host/Origin submitted successfully, hostile Origin was rejected, and native form submission redirected to confirmation. Resend was deliberately unconfigured during these tests, so real email delivery and Railway deployment remain unverified.

The configuration follows Railway's [monorepo guidance](https://docs.railway.com/deployments/monorepo), [Dockerfile documentation](https://docs.railway.com/builds/dockerfiles), [config-as-code reference](https://docs.railway.com/config-as-code/reference) and [variable references](https://docs.railway.com/variables/reference). It adapts the local Sajda API, dashboard and app deployment files without changing that project.
