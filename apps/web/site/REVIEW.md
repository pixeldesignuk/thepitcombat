# Finish review

## Current implementation — 7 September 2026

Disposition: **ship — local implementation and independent production-container checks passed**. The public site now runs on Astro's standalone Node adapter, with an enabled email-and-phone interest form, monthly pricing and first-session FAQs. The API persists registrations in PostgreSQL; the React dashboard provides protected access to the latest registrations. The disabled-preview statements below describe the earlier implementation only.

### Current evidence

- Final real-stack browser suite: **6/6 passed**, using built Astro SSR, the actual API, the built dashboard and an isolated PostgreSQL schema. Covers malformed-phone rejection, preserved inputs and corrected retry, recovery from one deliberately aborted network request, native no-JavaScript persistence, admin authentication/filtering/refresh/lock, keyboard FAQ controls, accessibility and overflow at 1440/390/320px. Successful requests use the actual database, not mocked success responses.
- Final unit/integration evidence: **14/14 passed** (6 public-site tests and 8 API tests, including the actual PostgreSQL integration test with no skips). The root orchestrator completed the root test task and the explicit database-backed API run after resolving the initial test-runner sandbox restriction. Root production build: **3/3 packages passed**.
- Final design detector returned **zero findings** for the FAQ, public page, dashboard component and dashboard CSS. Root DESIGN.md and its sidecar now describe the migrated paths and intentional FAQ, form and inbox patterns.
- Independent reviewer inspected public desktop/narrow and dashboard desktop/mobile captures and found no visual release blocker. The reviewer also rebuilt the production Docker image and confirmed a trusted public Host with forwarded HTTPS and matching Origin accepts and stores a registration (201), a hostile Origin is rejected (403), native POST redirects after success (303), and the Railway-style health probe succeeds (200).

Screenshots are at repository-root `.impeccable/review/`: `desktop.png`, `mobile.png`, `narrow.png`, `dash-desktop.png`, `dash-mobile.png` and `dash-narrow.png`. The implementing agent opened all six captures to confirm their content. Dashboard rows are synthetic submissions through the real isolated test API; no sample rows ship in the application.

### Corrections and limits

The final corrections add a minimum name length, a valid phone-pattern character class, readable server-validation feedback and an explicit trusted public domain for forwarded HTTPS handling. Optional operator details do not block collection or supply an invented organisation name.

These checks establish local behavior and production-container compatibility. No public deployment was performed. Test Resend credentials were explicitly blank, so actual provider email delivery was not exercised; successful registration storage is independent of delivery. The earlier typography triage remains below as historical evidence.

## Historical initial preview review

Date: 2026-09-07. Disposition: **PASS — ship as a review build**.

## Scope and evidence

Independent review of PRODUCT.md, the Base.astro design contract, craft-floor.md, landing-page source and desktop (1440px) / mobile (390px) screenshots in `.impeccable/review/` at repository root. Follow-up inspected the corrected source and narrow (320px) screenshot. This follow-up closes the original three findings only.

The implementing agent reports passing Playwright overflow checks at 1440/390/320px, axe WCAG 2 A/AA and 2.1 AA checks at 1440/390px, keyboard/details checks, and separate live-form fixture checks for loading, success, error, retry and native markup. The reviewer did not rerun these checks.

## Findings and severity

- Medium, resolved: narrow-screen overflow. The revised typography fits the inspected 320px capture; automated overflow checks also pass as reported.
- Low, resolved: the contract now describes the rendered four-line hero.
- Low, resolved: the header arrow now uses authored SVG.

## Required fixes

None outstanding within this review.

## What works

The established black/red/bone identity, Syne/Archivo typography and chevron remain coherent. The page makes the four disciplines, audience groups and provisional timetable clear. Disabled interest registration is explicitly explained and enforced in source.

## Verdict

Pass for the local review build. No rebuild required. Registration remains intentionally disabled pending real operator/privacy configuration; deployment and production host receipt verification are outside this review.


## Typography hook triage — 7 September 2026

All ten reported values were intentional sizes already used by the reviewed site; the initial DESIGN.md machine-readable typography omitted these roles. No UI CSS was changed.

| Reported size | Existing use | Resolution |
| --- | --- | --- |
| 9px | Mobile brand descriptor | Documented reserved scale step. |
| 12px | Mobile navigation, notes and captions | Documented caption step. |
| 42px | Mobile hero clamp minimum | Documented mobile display role. |
| 11px | Compact metadata and narrow navigation | Documented compact metadata step. |
| 15px | Supporting copy and actions | Documented supporting/action step. |
| 30px | Mobile discipline headings | Documented mobile discipline step. |
| 13px | Mobile audience copy, consent and status text | Documented small supporting step. |
| 38px | Registration headline clamp minimum | Documented registration and mobile registration roles. |
| 26px | Narrow section headings | Documented narrow section step. |
| 24px | Narrow discipline headings | Documented narrow discipline step. |

Updated DESIGN.md and the design sidecar. Rechecked with the source design-system detector using the loaded root DESIGN.md: zero findings. **Fixed:** incomplete typography documentation. **Suppressed:** none. **Left standing:** none of the ten reported findings. Prior visual/browser verification still applies because the rendered implementation is unchanged.
