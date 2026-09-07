# The Pit — prelaunch deliverables

The academy’s public name remains **The Pit Combat Academy**. The association name is still a choice; no name has been adopted, reserved or registered by this work.

| Deliverable | Editable source | Review / print |
| --- | --- | --- |
| Five-name shortlist and preliminary checks | [Name shortlist](governance/NAME-SHORTLIST.md) | Same document; official-register checks remain incomplete. |
| Draft nonprofit association constitution | [Constitution](governance/CONSTITUTION.md) | [Printable constitution](governance/CONSTITUTION.html) · [Adoption notes](governance/ADOPTION-NOTES.md) |
| Provisional seven-day timetable | [Schedule data](operations/timetable.json) · [Readable timetable](operations/TIMETABLE.md) | [Printable timetable](operations/timetable.html) |
| Prelaunch website and registration system | [Astro website](apps/web/site/) · [Node API](apps/backend/api/) · [Staff dashboard](apps/web/dash/) | Run the workspace locally using the instructions below. |

## Run locally

Use Node 24+, pnpm 10.32.1 and Docker. The Turborepo workspace contains the Astro Node website, Fastify API with PostgreSQL, Better Auth service, and Vite/React staff console. This is the first part of the custom gym management system; memberships, billing and attendance are future work.

Environment files live with each application. API database and Resend settings belong in `apps/backend/api/.env`; Better Auth signing and seeded-user credentials belong in `apps/backend/auth/.env`. Website settings are in `apps/web/site/.env`; the console origin and private proxy targets are in `apps/web/dash/.env`. These files are excluded from Git and Docker images.

For a fresh clone, copy each app's `.env.example` to `.env` only if the destination does not exist. Generate a random `BETTER_AUTH_SECRET` and strong seed passwords in the auth file. Add your Resend key, verified sender and monitored reply-to inbox in the API file when ready. Migrations and seeding use the configured database; automated tests use `TEST_DATABASE_URL` and isolated schemas. The workspace-root `.env` is not loaded.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm db:up
pnpm db:migrate
pnpm auth:migrate
pnpm auth:seed
pnpm dev
```

Open the [website](http://localhost:4321) and [staff inbox](http://localhost:5173). The API runs on `http://localhost:3001`; local PostgreSQL uses `127.0.0.1:55432`. Sign in with the seeded credentials in `apps/backend/auth/.env`.

The enabled form saves adult/parent name, email, phone number, programme and consent in PostgreSQL. Confirmation emails use a persistent outbox: registrations still save when Resend is unconfigured, and emails remain queued until valid sender credentials are supplied and the API is restarted. A successful registration does not claim email delivery.

Run `pnpm build`, `pnpm test` and `pnpm test:browser` for project checks. `pnpm db:stop` stops the local database while retaining its data.

Railway infrastructure is authored in one [`.railway/railway.ts`](.railway/railway.ts) file for project **thepit**, environment **development**. The existing public-site service is named **website**, while its code remains in `apps/web/site`; `Postgres` is retained, and the migration created API and dashboard services. See [Railway deployment](RAILWAY.md) for CLI plan/apply and reconciling existing services. A Git push does not apply the infrastructure definition. Secrets stay in Railway through `preserve()` entries; local app `.env` files are not uploaded. The reviewed migration from commit `d50f085` was applied successfully on 7 September 2026 without Postgres changes. Required public-origin, admin and email values remain to be configured; successful live application operation has not been verified.

## Membership offer

Children and teens: **£40 per month, unlimited classes**. Adults: **£50 per month, unlimited classes**. **The first session is free.** These offers appear in the website FAQ; the interest form does not take payment or book a specific class.

## Confirmed timetable skeleton

Monday–Friday: kids **6:30–7:30pm**, changeover **7:30–7:45pm**, combined teens/adults **7:45–9:15pm**. The remaining time to 9:30pm is outside teaching. Saturday and Sunday start **10:30am**; classes and finish times remain open. Wrestling, MMA, Thai boxing and BJJ have not been allocated to days.

## Remaining decisions

- Select a preferred association name and reserve; complete live register/similarity checks before adoption.
- Review and adopt the constitution with actual officers and independent committee members. Personal appointments and signatures are blank; charity/CASC status is not claimed.
- Confirm venue, staffing, capacities, age bands, class allocations and opening date before presenting the schedule as committed.
- Supply the actual operator identity, privacy inbox and correspondence address for the public privacy information.
- Complete the applied Railway services’ public-origin, admin and verified Resend sender settings, then verify real registration and email receipt on the deployed host. Local Docker integration and infrastructure apply are verified; live application operation and real email delivery are not.

The older [master plan](MASTER-PLAN.md) carries a current implementation note and entity correction; its July maktab and launch timeline are historical.
