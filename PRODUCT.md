# The Pit Combat Academy

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

pnpm/Turborepo monorepo: Astro with the Node standalone adapter in `apps/web/site`, Node.js/Fastify with PostgreSQL in `apps/backend/api`, and Vite/React in `apps/web/dash`. Separate Docker images share the repository-root build context. One `.railway/railway.ts` describes the Railway infrastructure for project `thepit`, environment `development`; the existing Astro service is named `website`. The existing `Postgres` resource remains alongside it; API and dashboard are planned additions, subject to the live IaC plan. CLI plan/apply manages infrastructure; Git pushes do not apply it. This establishes the custom gym management system's registration intake and staff inbox; member accounts, billing and attendance are not implemented in this phase.

## Users

Parents/guardians exploring training for children, and teens/adults considering combat sports around the Oldham/Rochdale corridor in Greater Manchester.

## Product Purpose

A prelaunch introduction to the academy, its four disciplines, membership prices and provisional training hours, leading to adult/parent interest registration. Staff can view saved registrations in the access-key-protected inbox.

## Operating Context

The Pit remains the public brand. A broader nonprofit unincorporated association is being drafted; its name is not chosen and it has not been adopted or registered through this work. CASC is deferred. The earlier maktab programme is not part of the academy offer.

The association naming direction should convey sport and youth development. The user rejected “Pennine” because it sounds like a housing association; do not carry that stem into future shortlists.

## Capabilities and Constraints

- Wrestling, MMA, Thai boxing and BJJ; kids plus combined teens/adults.
- Provisional Monday–Friday: kids 18:30–19:30, changeover to 19:45, teens/adults 19:45–21:15; no teaching 21:15–21:30.
- Both weekend days start 10:30; finish and allocation are undecided.
- Canonical schedule: `operations/timetable.json`. No committed discipline/day allocations.
- Children and teens: £40 per month, unlimited classes. Adults: £50 per month, unlimited classes. First session free.
- The enabled interest form collects adult/parent name, email, phone and programme interest, with consent for opening updates by email and phone. It does not book a class or collect payment.
- Same-origin website submission proxies to the API; PostgreSQL persists registrations and an email outbox. Resend sends confirmations when its API key and verified sender are configured; absent credentials leave emails queued without blocking registration storage.
- The dashboard requires the backend admin access key and displays registrations and email status. Credentials stay out of frontend builds.
- Local configuration lives in each app's `.env`: API database/Resend/admin secrets in `apps/backend/api/.env`, website settings in `apps/web/site/.env`, and the dashboard's public API URL in `apps/web/dash/.env`. These files are excluded from Git/Docker; the workspace-root `.env` is not loaded. Optional operator identity, privacy contact and correspondence address populate public privacy information.
- All three Docker images and isolated registration persistence were verified locally. Railway IaC preserves existing secret values without embedding them in source. The authenticated live plan for `thepit / development` reported 2 additions, 5 changes and no deletions, with no Postgres changes; it has not been applied. Required public-origin values, deployment and real email receipt remain to be checked.
- Exact address, opening date, age bands and coach credentials are unconfirmed. Do not fabricate them.

## Brand Commitments

Preserve the August identity in `brand/brand-guidelines.html`: existing chevron and wordmark geometry, Syne/Archivo, black/red/bone. Voice is firm, direct, values-led and welcoming to parents. No new logo or photographic claims are required.

## Product Principles

- Make provisional information unmistakable.
- Let the academy brand lead; never imply an unchosen legal name is adopted.
- Make first contact simple and collect only what is needed.
- Keep the timetable consistent across web and print.

## Accessibility & Inclusion

Responsive mobile/desktop, keyboard access, visible focus, labelled controls, readable contrast, reduced-motion support and native form fallback.
