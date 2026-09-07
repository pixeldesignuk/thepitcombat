# The Pit public website

Astro with the standalone Node adapter, inside the pnpm/Turborepo workspace. The public form sends name, email, phone, programme interest and consent through a same-origin Astro endpoint to the separate Node API. PostgreSQL stores registrations and the confirmation-email outbox; Resend delivery is handled by the API.

## Local development

Use Node 24 or newer and the root pnpm version. Copy this app's `.env.example` to `apps/web/site/.env` for its public origin, API URL and optional operator contacts. API/database/email settings belong in `apps/backend/api/.env`; the dashboard uses `apps/web/dash/.env`. No frontend command loads the root `.env`. From the repository root:

```sh
pnpm install
pnpm db:up
pnpm db:migrate
pnpm dev
```

The site runs on port 4321, API on 3001 and dashboard on 5173. `API_URL` is the server-side API origin; it is never a browser credential. The dashboard uses build-time `VITE_API_URL` and an admin key entered into memory at runtime. All Railway services build from the monorepo root; deployment instructions are in root `RAILWAY.md`.

`pnpm --filter @pit/site build` creates standalone Node output at `dist/server/entry.mjs` and browser assets under `dist/client`. `pnpm --filter @pit/site start` runs that production server with app-local environment configuration. Injected Railway environment variables take precedence over local files. `HOST` and `PORT` control its listener. Nothing is deployed by these commands.

## Content and form behavior

- `src/data/site.json` holds academy copy; `src/data/faq.json` holds pricing and first-session FAQs. Confirmed prices are £40/month unlimited for children/teens and £50/month unlimited for adults; the first session is free.
- Root `operations/timetable.json` remains the canonical schedule. The build regenerates the printable timetable. Classes and discipline allocations remain provisional.
- `src/styles/global.css`, `src/components/Faq.astro` and self-hosted fonts preserve the approved brand. FAQ disclosures work without JavaScript.
- The form is available without an invented operator name or privacy-contact gate. Optional `OPERATOR_NAME`, `PRIVACY_EMAIL` and `CORRESPONDENCE_ADDRESS` supply real facts when configured. The public academy remains The Pit Combat Academy; no shortlist name is automatically adopted.
- `POST /api/registrations` proxies URL-encoded submissions to the API, caps request size, rejects a mismatched browser Origin and sets no-store responses. A per-render UUID supports safe retries. JavaScript reports validation/server failures and retains entered fields on errors; native HTML submission redirects to the confirmation page after backend success.
- Registration expresses interest and does not book a session. No payment is collected. Confirmation delivery may remain pending when Resend is unconfigured; saving the registration still succeeds.
- The privacy notice covers email, phone, hosting and email processors. Its retention policy requires operational enforcement; the frontend does not run a deletion scheduler.

## Verification

From the root:

```sh
pnpm build
pnpm test
pnpm test:browser
```

Browser tests require local PostgreSQL and Chromium. The harness reads database settings from `apps/backend/api/.env`; `TEST_DATABASE_URL`, when supplied, selects a dedicated test database. It reads that file only for the database setting and does not copy API secrets into frontend builds. The harness creates a random PostgreSQL schema, builds and starts the actual production site/API/dashboard on ports 4322/3301/5174, and deletes only that schema at shutdown. It explicitly blanks Resend credentials, so no real email is sent. Existing database rows are untouched.

The suite exercises real persistence, server-side invalid-phone rejection, retry after a simulated transport failure, native submission without JavaScript, admin authentication/filtering/lock, FAQ keyboard interaction, accessibility and layout at 1440/390/320px. One request is deliberately aborted to test network recovery; successful submissions and reads use the actual API and database. Dashboard capture rows are synthetic test submissions, not seeded demo content in the app.

Screenshots are written to root `.impeccable/review/`. The harness builds with dedicated test origins, so run the ordinary `pnpm build` after browser checks to restore production output for the current app-local configuration. Review evidence and practical limits are in `REVIEW.md`.

Existing vector/font provenance is recorded in `public/brand/PROVENANCE.md`.
