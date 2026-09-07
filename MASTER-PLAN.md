# The Pit Combat Academy — Master Plan

> **Current implementation note — 7 September 2026 (takes precedence over the July plan below).** The academy is now **combat-only**; the August `brand/BRAND-FOUNDATION.md` supersedes the maktab/dual-curriculum direction. One proposed nonprofit unincorporated community sports association will operate **The Pit Combat Academy** as its working brand. A broader sport and youth-development name is shortlisted, not selected or registered; the rejected regional naming stem is no longer a candidate. Draft constitution and adoption notes are in `governance/`; the adoption record remains blank. The timetable remains provisional. Confirmed prices are £40/month for children and teens and £50/month for adults, both unlimited, with the first session free.
>
> **Current software direction:** build the custom gym management system. A pnpm/Turborepo workspace now contains the Astro Node website (`apps/web/site`), Fastify/PostgreSQL API (`apps/backend/api`) and Vite/React staff inbox (`apps/web/dash`). The local working form stores name, email, phone, programme and consent; a persistent Resend outbox queues confirmation emails until its key and verified sender are configured. Each app has its own local `.env`: API database, Resend and admin settings live in `apps/backend/api/.env`; the website and dashboard use their own app-local files. The workspace-root `.env` is not loaded. Three Docker images and isolated end-to-end persistence have been verified; Railway configuration is ready for three services plus PostgreSQL, but nothing has been publicly deployed and real email delivery is unverified. Membership payments, attendance and wider management features remain future work. Historical maktab, bought-platform and September-launch tasks below are retained for context and are not current commitments.
>
> **Entity correction:** CASC is HMRC tax status, **not incorporation**; it does not give an unincorporated association separate legal personality or end personal liability. CASC is deferred: HMRC's current multi-sport guidance explicitly treats kickboxing as ineligible, so eligibility cannot be assumed for this programme. Assess the charity/nonprofit route and charitable objects before adoption; see `governance/ADOPTION-NOTES.md` for official sources and the incorporation distinction.

**Status:** Historical July baseline — superseded as noted above · **Owner of this document:** Mansoor · **Last updated:** 2026-07-15
**Jurisdiction:** England · **Target operational launch:** September 2026 (school-term start)

---

## 1. North Star

Open a compliant, credible combat-sports academy with an on-site children's **maktab** (Islamic supplementary school), sharing one premises, under one brand, with one system for payments and — eventually — dual-curriculum progress tracking.

**The governing rule:** *nothing involving a child happens in the building until the safeguarding / insurance / entity / lawful-premises spine exists.*

**The strategic product:** the **"one drop-off" family bundle** — a child does maktab then a combat class in a single evening; the maktab's parent network *is* the combat pipeline and vice versa.

---

## 2. Decisions Locked

| Decision | Choice |
|---|---|
| **Jurisdiction** | England (Ofsted, DBS, DfE out-of-school-settings code, Charity Commission E&W) |
| **Legal structure** | **Two separate unincorporated associations** — the **Club** (sport) and the **Maktab** (education), each with its own constitution, sharing the premises. |
| **Future structure** | **Superseded:** CASC is deferred pending eligibility review; earlier kickboxing plans conflict with HMRC multi-sport guidance; verify each discipline in the latest skeleton. Incorporation and any charity route require separate decisions. |
| **Launch model** | **Two moments:** (a) **Soft launch** — early registrations open *as soon as branding is ready* (waitlist / founding-member pre-sell, no children in the building yet); (b) **Operational launch** — classes start September, gated by the full compliance spine. |
| **Build vs buy** | **Buy the engine, build the shopfront, build the portal later.** Buy a martial-arts platform + GoCardless for launch; hand-build the marketing site now; build the bespoke dual-curriculum parent portal post-launch. |
| **Intake window** | September 2026 term start (natural maktab + school intake; miss it and the next clean window is January). |

**Liability correction:** an unincorporated association has no separate legal personality, and individuals may remain personally liable for debts and contracts. CASC registration does not change this. Insurance has limits and does not substitute for incorporation; review the legal structure and signatory exposure before major commitments.

---

## 3. Workstream Map

| # | Workstream | Owner | The gate it controls |
|---|-----------|-------|----------------------|
| **WS0** | Operating Model, Pricing & Finance | Shared | What's sold, to whom, when, at what price |
| **WS1** | Entity, Governance & Registration | **Mansoor** | Bank account, contracts, insurance-in-name, rates relief |
| **WS2** | Safeguarding & Child Protection | **Mansoor** | *Any child in the building* |
| **WS3** | Affiliation, Insurance & Premises Compliance | **Mansoor** | *Any class running at all* (incl. fit-out + planning) |
| **WS4** | Combat Curriculum & Coaching | Shared | Grading, coach standards, portal syllabus |
| **WS5** | Maktab Programme | **Mansoor** | Maktab launch |
| **WS6** | Brand & Identity | **Mansoor** | Signage, kit, web, all marketing, **soft-launch trigger** |
| **WS7** | Web, Registrations & Payments | **Mansoor** | Taking money, enrolment |
| **WS8** | Parent Portal & Progress Tracker | **Mansoor** | Retention product (deliberately post-launch) |
| **WS9** | Marketing & Launch | Shared | Members through the door |
| **WS10** | Staffing & Operations | Shared | Cover, rotas, daily running |

**Boundary discipline:** keep **WS7 and WS8 separate** — the transactional front door (WS7) must ship for launch; the logged-in dual-curriculum portal (WS8) must *not* block launch.

---

## 4. Priority Order (sequence, not calendar)

### ① Fire immediately — long-lead external, start regardless of everything else
1. Call the **LPA** on planning use-class (gym E(d) + education F.1) — the one thing that can sink a September operational launch. Ask the landlord/agent first (often in the lease).
2. Appoint **DSL + deputy**, start **every enhanced DBS** (2–8 wks — the binding gate on kids in the building).
3. Adopt the **two constitutions** (Club + Maktab), open bank account(s).
4. Decide **disciplines → NGB**, request insurance quotes (disclose junior sparring).
5. Lock the **maktab lead teacher**, order Safar / An-Nasihah curriculum.

### ② Unlocks the SOFT LAUNCH — the active build (Mansoor, highest hands-on priority)
6. **Logo + name lock** ← the trigger everything waits on.
7. Core brand: colour, type, minimal brand guide.
8. **Registration / founding-member landing page** + the offer.
9. → **Soft launch: early registrations open.**

### ③ Compliance spine — gates the operational (classes) launch
10. Policy pack (CPSU templates), safeguarding regime, code of conduct.
11. **Insurance bound**, NGB affiliation, fire risk assessment.
12. First aid (EFAW + paediatric), risk assessments, ICO registration, consent/medical capture.
13. DBS cleared + DSL trained; premises confirmed lawful & safe.

### ④ Programme + platform
14. Master timetable (the "one drop-off" grid), pricing matrix.
15. Curriculum mapped to levels (feeds the future tracker).
16. Buy platform (Gymdesk / Martialytics + **GoCardless**), configure enrolment; full marketing site.
17. Staff onboarded via safer recruitment.

### ⑤ Operational launch — September
18. Open day / tasters (only once spine is live), capped classes, onboard founding families.

### ⑥ Deferred — background / post-launch
19. **CASC deferred** — assess sport eligibility and charity alternatives first. Registration is tax status, not incorporation; a constitution and bank account alone do not establish eligibility.
20. Bespoke dual-curriculum **parent portal** (Postgres/Railway).
21. Permanent signage + custom kit; term reports (paper interim until portal).

---

## 5. Two Day-1 Launch-Blockers (highest-risk items)

1. **Planning use-class.** Gym is Class **E(d)**; regular education (the maktab) leans **F.1**. If the unit needs change-of-use, that is **8+ weeks** — longer than the runway. Call the LPA this week; if it's a problem, fall back to **launch combat-first, maktab a few weeks behind.**
2. **Enhanced DBS clearance.** 2–8 weeks. Anyone not cleared by launch **cannot be in regulated activity unsupervised.** Plan staffing around who can realistically clear in time — start every application on Day 1.

---

## 6. Legal & Safeguarding Must-Haves (before any child attends)

- Enhanced **DBS + children's barred-list check** for every coach, maktab teacher, and regular volunteer (all "regulated activity"); single central record; Update Service enrolment.
- **DSL + trained deputy** (the deputy must not be coaching/teaching every session — someone must be free to receive concerns).
- **Safer recruitment:** two references, ID checks, safeguarding interview questions, **overseas police checks** for anyone who has lived/worked abroad (common for maktab hires — don't skip).
- **Policy pack** (CPSU-standard): safeguarding & child protection, physical-contact-in-coaching, anti-bullying, photography/phones/social media, changing rooms & supervision, collection/late-pickup, whistleblowing & low-level concerns, complaints, code of conduct (staff/parents/children), online safety.
- **First aid:** at least one EFAW holder at every session; **paediatric first aid** for children's sessions; stocked kits + defib decision.
- **Ratios (NSPCC floor):** ~1:6 (ages 4–8), 1:8 (9–12), 1:10 (13–18); NGB rules may be stricter for combat; **always 2 adults per session, never unsupervised 1:1.**
- **ICO registration** (processing children's data — required, ~£40–60/yr) + GDPR-compliant consent capture.
- **Local wiring:** LADO contact, referral flowchart on the wall, register with the LA's supplementary-schools / out-of-school-settings scheme if the council runs one (often free training attached).
- Adhere to the DfE **"Keeping children safe in out-of-school settings"** voluntary code — it's the standard an LA or insurer will judge you against; **Prevent** awareness (expected of Islamic supplementary settings).
- **Keep the maktab firmly part-time.** Cross into full-time education hours (≈18+ hrs/week for compulsory-school-age children) and it becomes an **unregistered independent school** — a criminal offence.

**Combat-specific:** age-appropriate contact rules; no/limited head-contact sparring for juniors per NGB rules; concussion protocol ("if in doubt, sit them out"); age/weight matching; equipment hygiene + blood procedure; injury log / accident book (RIDDOR awareness).

---

## 7. Build vs Buy (Web + Registrations + Portal)

**Buy the engine, build the shopfront, build the portal later — a deliberate phased hybrid.**

- **Buy now:** a martial-arts/club platform — shortlist **Gymdesk, Martialytics, Kicksite** (memberships, family accounts, scheduling, attendance, waivers, native belt/grading tracking), or **ClassForKids / LoveAdmin** if the kids-club/parent-comms shape fits better. Recurring billing via **GoCardless Direct Debit** (UK-norm for clubs and maktabs, low fees; Mansoor already knows the GoCardless API from Ledger).
- **Build now:** the public **marketing site** — custom, brand-perfect, fast, with platform sign-up embedded/linked, strong local SEO ("martial arts [town]", "maktab/madrasah [town]"). This is Mansoor's craft and high-leverage.
- **Build later (post-launch):** the **unified dual-curriculum parent portal** — no off-the-shelf tool tracks a maktab syllabus alongside a combat syllabus, and that's the genuine differentiator. Thin layer over the platform + GoCardless APIs, plus a syllabus-agnostic schema: **Child → Enrolment → Syllabus → Levels → Assessments**, with a 30-second-per-child teacher assessment UI. Postgres/Railway (same stack as Mansoor's other apps). If the bought platform's belt-tracking + the curriculum's paper reports turn out to be enough after a term, don't build it — let real parent demand pull it into existence.

**Explicitly rejected:** full bespoke from day one (calendar + billing-edge-case + solo-founder risk); pure off-the-shelf forever (loses the differentiator and the brand-quality bar).

---

## 8. Biggest Risks (ranked)

1. **Planning use-class mismatch** — discovering it after fit-out is the most expensive surprise. Check week 1.
2. **Safeguarding failure** — combat + children + faith-school is the highest-scrutiny category; one incident is existential. Culture matters more than paper — train everyone, drill the reporting line.
3. **Maktab drifting toward "unregistered school"** — keep provision firmly part-time.
4. **DBS not clearing in time** — start Day 1; plan staffing around who clears.
5. **Key-person overload** — Mansoor owns seven workstreams; the plan survives only if WS8 stays deferred and WS9/WS10 are genuinely shared. Recruit a volunteer administrator/committee member early to own WS2 operations (DBS admin, registers, first-aid rota).
6. **Insurance gap** — member-to-member liability missing, or activities (sparring, junior classes) not disclosed. Disclose everything in writing.
7. **Teacher recruitment miss** → maktab slips a term.

---

## 9. Brand Direction (WS6 — provisional, confirm before logo)

**Recommended:** a **balanced masterbrand** — "The Pit Combat Academy" as masterbrand with "The Pit Maktab" (or an Arabic-rooted sub-name) as an endorsed sub-brand sharing type/colour but with a softer expression. Combat-leaning primary, family-reassuring secondary.

**Constraints:** name/trademark clear (IPO, Companies House, domains, socials) before committing; avoid marks that read aggressive or figurative if the community is conservative — geometric/typographic marks serve both audiences; colour + type must work on mats, rashguards, hoodies, signage, and web.

*Open steer for Mansoor:* combat-bold vs balanced-masterbrand (recommendation: balanced).

---

## 10. Terms Glossary

| Term | Meaning |
|---|---|
| **LPA** | Local Planning Authority — the council's planning department; decides what a building may legally be *used for* (use classes). |
| **Use class E(d)** | Planning category covering indoor sport / gym / fitness. |
| **Use class F.1** | Planning category covering education / non-residential institutions (e.g. a school/maktab). |
| **CASC** | Community Amateur Sports Club — HMRC tax status with conditional tax/Gift Aid/rates benefits, not a legal form or incorporation. Current kickboxing provision requires eligibility review; route deferred. |
| **CIO** | Charitable Incorporated Organisation — a charity that is its own legal entity; considered and set aside in favour of the separate-associations + CASC route. |
| **DSL** | Designated Safeguarding Lead — the named person responsible for child protection (plus a trained deputy). |
| **DBS** | Disclosure and Barring Service — criminal-record check; "enhanced + barred-list" is required for regulated activity with children. |
| **CPSU** | Child Protection in Sport Unit (NSPCC) — provides the standard safeguarding policy templates for sport. |
| **NGB** | National Governing Body — the sport's official body (e.g. England Boxing, British Judo, UKBJJA, WAKO GB); drives affiliation, coach licensing, insurance, junior rules, grading. |
| **EFAW** | Emergency First Aid at Work — the baseline first-aid qualification. |
| **Paediatric first aid** | First-aid qualification specific to infants/children — needed for children's sessions. |
| **ICO** | Information Commissioner's Office — the UK data-protection regulator; you register with them because you process children's personal data. |
| **LADO** | Local Authority Designated Officer — the council officer you contact about allegations against an adult working with children. |
| **RIDDOR** | Reporting of Injuries, Diseases and Dangerous Occurrences Regulations — the rules on reporting serious workplace/activity injuries. |
| **Regulated activity** | Legal term for work with children frequent/intensive enough to require an enhanced DBS + barred-list check. |
| **Prevent** | The UK counter-terrorism safeguarding duty; awareness is expected of Islamic supplementary settings. |
| **Maktab** | Islamic supplementary school for children (Qur'an, tajwid, Islamic studies), run part-time (evenings/weekends). |

---

## 11. Immediate Next Actions

1. **Confirm brand lean** (combat-bold vs balanced masterbrand) → **start logo** (soft-launch trigger).
2. Fire the **Day-1 external triggers** (LPA call, DBS applications, constitutions, insurance quotes, teacher + curriculum). *(A Day-1 action pack with exact calls/applications is the next deliverable.)*
3. Stand up the **founding-member landing page** the moment core brand is ready → open early registrations.

---

*Workstream deep-dives (WS1 governance, WS2 safeguarding pack, WS5 maktab curriculum, WS6 brand, WS7 platform build, WS8 portal) each get their own focused session and document as they come up the priority order.*
