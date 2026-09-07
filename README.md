# The Pit — prelaunch deliverables

The academy’s public name remains **The Pit Combat Academy**. The association name is still a choice; no name has been adopted, reserved or registered by this work.

| Deliverable | Editable source | Review / print |
| --- | --- | --- |
| Five-name shortlist and preliminary checks | [Name shortlist](governance/NAME-SHORTLIST.md) | Same document; official-register checks remain incomplete. |
| Draft nonprofit association constitution | [Constitution](governance/CONSTITUTION.md) | [Printable constitution](governance/CONSTITUTION.html) · [Adoption notes](governance/ADOPTION-NOTES.md) |
| Provisional seven-day timetable | [Schedule data](operations/timetable.json) · [Readable timetable](operations/TIMETABLE.md) | [Printable timetable](operations/timetable.html) |
| Prelaunch website and registration system | [Astro website](apps/web/site/) · [Node API](apps/backend/api/) · [Staff dashboard](apps/web/dash/) | Run the workspace locally using the instructions below. |

## Run locally

Use Node 24+, pnpm 10.32.1 and Docker. The Turborepo workspace contains the Astro Node website, Fastify API with PostgreSQL, and Vite/React registration inbox. This is the first part of the custom gym management system; memberships, billing and attendance are future work.

Environment files live with each application. Add your `RESEND_API_KEY` **and** `RESEND_FROM_EMAIL` in [`apps/backend/api/.env`](apps/backend/api/.env) using a verified Resend sender; set `REPLY_TO_EMAIL` to a monitored inbox. The API's database settings and random local `ADMIN_API_TOKEN` also live there. Website settings are in `apps/web/site/.env`; the dashboard's public API URL is in `apps/web/dash/.env`. Keep secrets in the API file. All local environment files are excluded from Git and Docker images; safe `.env.example` templates remain available.

For a fresh clone, copy each app's `.env.example` to `.env` in the same directory if the destination does not exist. Set the API's `ADMIN_API_TOKEN` to a newly generated long random secret, and fill in the Resend values. Do not overwrite an existing file or reuse the development token in production. The workspace-root `.env` is not loaded by these apps. Set operator/privacy contact details in the website's environment to accurate values before public launch.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm db:up
pnpm db:migrate
pnpm dev
```

Open the [website](http://localhost:4321) and [staff inbox](http://localhost:5173). The API runs on `http://localhost:3001`; local PostgreSQL uses `127.0.0.1:55432`. Enter the local admin token from `apps/backend/api/.env` into the inbox access-key field.

The enabled form saves adult/parent name, email, phone number, programme and consent in PostgreSQL. Confirmation emails use a persistent outbox: registrations still save when Resend is unconfigured, and emails remain queued until valid sender credentials are supplied and the API is restarted. A successful registration does not claim email delivery.

Run `pnpm build`, `pnpm test` and `pnpm test:browser` for project checks. `pnpm db:stop` stops the local database while retaining its data. See [Railway deployment](RAILWAY.md) for the three Docker services plus PostgreSQL; no public deployment has been performed.

## Membership offer

Children and teens: **£40 per month, unlimited classes**. Adults: **£50 per month, unlimited classes**. **The first session is free.** These offers appear in the website FAQ; the interest form does not take payment or book a specific class.

## Confirmed timetable skeleton

Monday–Friday: kids **6:30–7:30pm**, changeover **7:30–7:45pm**, combined teens/adults **7:45–9:15pm**. The remaining time to 9:30pm is outside teaching. Saturday and Sunday start **10:30am**; classes and finish times remain open. Wrestling, MMA, Thai boxing and BJJ have not been allocated to days.

## Remaining decisions

- Select a preferred association name and reserve; complete live register/similarity checks before adoption.
- Review and adopt the constitution with actual officers and independent committee members. Personal appointments and signatures are blank; charity/CASC status is not claimed.
- Confirm venue, staffing, capacities, age bands, class allocations and opening date before presenting the schedule as committed.
- Supply the actual operator identity, privacy inbox and correspondence address for the public privacy information.
- Configure the Railway services and verified Resend sender, then verify real registration and email receipt on the deployed host. Local Docker integration is verified; no deployment or registration application has been performed.

The older [master plan](MASTER-PLAN.md) carries a current implementation note and entity correction; its July maktab and launch timeline are historical.
