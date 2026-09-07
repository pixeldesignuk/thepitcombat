---
version: 1
slug: "apps-web-dash-src-app-tsx"
primary_target: "apps/web/dash/src/App.tsx"
related_targets: ["apps/web/dash/src/styles.css", "apps/web/dash/index.html"]
---

## Scope and mode

Operate mode for the private staff console. Staff review and update expressions of interest; admins also manage console accounts.

## Audience and job

Academy staff need to find a person quickly, see their full contact record, record follow-up state and notes, and contact them. Admins need a small, explicit account-management surface. The primary task is processing the interest list accurately without exposing credentials or inventing member-management features.

## Direction

Use the AgentOS console as structural visual truth: compact left rail, dense ruled rows, technical metadata, layered near-black surfaces, and an adjacent work panel. Translate it into The Pit with the supplied logo, Archivo for the operational UI, Syne only for the login title, bone text, and Pit red for current state and primary action. The memorable interaction is the list-to-detail handoff: selecting a row opens the complete working record beside it, or as a focused mobile view.

## Form

The visual reference is the user-pinned AgentOS console at `/Users/mansoor/Developer/ai/agentos`; its rail/list/detail information architecture is the structural source for this surface. Use a compact 216px desktop rail, dense 64–65px ruled rows, layered near-black panels, and an adjacent detail panel for the working record. The detail panel carries contact actions, follow-up controls, notes and submitted fields; the primary action is a restrained Pit-red save or sign-in button. At 760px and below, the selected record becomes a focused full-width detail view with an explicit back action, while the compact rail remains available. Keep the supplied Pit logo, Archivo operational type, Syne only for the sign-in title, visible red keyboard focus, native form semantics and reduced-motion behavior. Do not fabricate cards, seed rows, membership screens or additional navigation.

## Constraints

Use same-origin cookie sessions only. Show Interests and, for admins, Staff accounts; no dead navigation, registration automation, memberships, plans, payments, or synthetic production rows. Preserve loading, error, empty, disabled, keyboard, reduced-motion, 320px, and touch states. Contact actions use the submitted email and phone as supplied by the API.

## Unresolved

None for this phase. Future registration automation and membership plans remain outside this surface.
