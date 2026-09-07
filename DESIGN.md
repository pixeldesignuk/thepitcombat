---
name: The Pit Combat Academy
description: The established August identity applied to the academy website and registration inbox.
colors:
  black: "#000"
  bone: "#fafafa"
  red: "#e0231f"
  muted: "#aaa"
  rule: "#343434"
  supporting-text: "#c3c3c3"
  light-hover: "#dedede"
  disabled-background: "#c7c7c7"
  disabled-text: "#454545"
  field-background: "#101010"
  field-border: "#666"
  error-border: "#ef726e"
  error-text: "#ffd8d7"
typography:
  scale:
    mobile-brand-descriptor: "9px"
    compact-metadata: "11px"
    caption: "12px"
    supporting-small: "13px"
    action-and-supporting-copy: "15px"
    lead-and-schedule-time: "18px"
    schedule-heading: "20px"
    prose-heading-and-footer-brand: "22px"
    narrow-discipline-heading: "24px"
    narrow-section-heading: "26px"
    mobile-discipline-heading: "30px"
    inbox-heading: "34px"
  display:
    fontFamily: "Syne, sans-serif"
    fontSize: "clamp(44px, 7.1vw, 96px)"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Syne, sans-serif"
    fontSize: "clamp(34px, 4.15vw, 56px)"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Archivo, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Archivo, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.6
  mobile-display:
    fontFamily: "Syne, sans-serif"
    fontSize: "clamp(42px, 10.4vw, 72px)"
    fontWeight: 800
    lineHeight: 1.02
  discipline-heading:
    fontFamily: "Syne, sans-serif"
    fontSize: "clamp(25px, 3vw, 40px)"
    fontWeight: 600
    lineHeight: 1.2
  registration-heading:
    fontFamily: "Syne, sans-serif"
    fontSize: "clamp(38px, 4.8vw, 64px)"
    fontWeight: 800
    lineHeight: 1.02
  mobile-registration-heading:
    fontFamily: "Syne, sans-serif"
    fontSize: "clamp(38px, 9vw, 56px)"
    fontWeight: 800
    lineHeight: 1.02
  prose-title:
    fontFamily: "Syne, sans-serif"
    fontSize: "clamp(38px, 6vw, 64px)"
    fontWeight: 800
    lineHeight: 1.02
rounded:
  square: "0"
spacing:
  page-gutter: "clamp(24px, 5vw, 80px)"
  control-gap: "12px"
  row-gap: "24px"
  heading-gap: "48px"
  column-gap: "60px"
components:
  button-light:
    backgroundColor: "{colors.bone}"
    textColor: "{colors.black}"
    padding: "18px 24px"
  button-light-hover:
    backgroundColor: "{colors.light-hover}"
  button-disabled:
    backgroundColor: "{colors.disabled-background}"
    textColor: "{colors.disabled-text}"
  field:
    backgroundColor: "{colors.field-background}"
    textColor: "{colors.bone}"
    rounded: "{rounded.square}"
    padding: "13px 14px"
    width: "100%"
---

# Design System: The Pit Combat Academy

## Overview

**Creative North Star: "Discipline first."**

Preserve the August 2026 identity: a planted double-chevron, geometric wordmark, black and bone surfaces, and sparing red. The website is direct and confident, with readable supporting copy and open space for parents and first-time trainees.

This document records the finished website, not a replacement identity. Brand authority is `brand/brand-guidelines.html`; implementation authority is `apps/web/site/src/styles/global.css`, `fonts.css`, `layouts/Base.astro` and `pages/index.astro`. Product facts belong in `PRODUCT.md`. Review disposition is recorded in `apps/web/site/REVIEW.md`.

**Key Characteristics:**
- Large uppercase Syne headings with quiet Archivo copy.
- Flat black surfaces, open ruled rows and a bone timetable band.
- Original chevron and wordmark geometry; restrained SVG interaction icons.

## Colors

Primary Pit Red identifies the mark and functional focus/selection treatments. Keep it below ten percent of a surface, following the existing brand guidance. Black and Bone are the principal neutral surfaces; muted and supporting text distinguish secondary content. Functional greys belong to UI borders, disabled controls and supporting copy. Error colours are feedback, not additional brand colours.

## Typography

Use the self-hosted Syne 800 and Archivo 400/600 WOFF2 files in `apps/web/site/public/fonts/`, loaded with `font-display: swap`. Body paragraphs are capped at 68ch; hero copy at 49ch, reducing to 40ch on mobile. Discipline titles use Syne at `clamp(25px, 3vw, 40px)`; ordinary subheads and form labels use Archivo 600. Schedule numerals are tabular.

The named scale and fluid roles above include the existing responsive variants, rather than only the desktop defaults. Small 9px/11px values are reserved for the brand descriptor and compact metadata/navigation; they are not general body-copy sizes. Supporting copy uses 12–16px according to its role. The 24px, 26px and 30px heading steps preserve the reviewed mobile layouts, including the 320px overflow fix. The 34px narrow registration heading reuses the main headline's minimum step.

The web headings use the compact tracking recorded above. The August guideline's wider brand display tracking remains separate from this implemented page treatment; preserve the supplied wordmark asset rather than recreating it as text.

## Layout

The centred container caps at 1440px with fluid page gutters. Desktop hero columns use a 1.65:1 ratio and a four-line headline; section headings and timetable use 1.25:1 columns. Registration and audience groups use two columns. Main dark sections have 100px vertical padding; the light timetable has 90px.

At 1000px and below, gaps tighten and timetable entries stack within their columns. At 700px and below, primary sections become one column, the decorative hero mark disappears, navigation retains only registration, and section padding falls to approximately 60–64px. Hero type becomes `clamp(42px, 10.4vw, 72px)`. The hero action fills its column up to 360px. Audience groups remain paired until 370px, then stack. At 370px and below, section headings reduce to 26px, registration headings to 34px and discipline headings to 24px; the header arrow is hidden and the logo reduces to 132px. Preserve these narrow-screen accommodations.

## Elevation & Depth

No shadows or gradients. Contrast between black and bone, thin rules and typography establish hierarchy. The chevron reveals once over 950ms with a short downward movement; button colour and disclosure rotation transitions last 200ms. Reduced-motion preferences disable animation, transitions and smooth scrolling.

## Shapes

Use straight rules and square field corners. Content sits in open rows rather than cards. Preserve the exact chevron and wordmark in `apps/web/site/public/brand/mark.svg` and `logo.svg`; provenance is in `apps/web/site/public/brand/PROVENANCE.md`. No raster assets ship in this implementation.

## Components

- **Actions:** bone-filled, dark-text buttons with a minimum height of 58px and an authored arrow SVG. Hover darkens the surface. Disabled controls use functional greys and a unavailable cursor. All keyboard-focusable controls receive a 3px red outline offset by 5px.
- **Navigation:** horizontal text links, underline on hover, with a persistent bottom rule on the registration action. SVG arrows are 18px in navigation and normally 24px elsewhere. The skip link becomes visible on focus. There is no mobile menu or active-section indicator.
- **Discipline disclosure:** native `details`/`summary`, separated by thin rules. The plus rotates 45 degrees when expanded. Supporting copy aligns beneath the descriptive column on desktop and beneath the title on mobile.
- **Timetable:** a light surface with ruled definition-list rows and tabular times. The provisional label is a small rectangular outlined status, not an interactive chip.
- **Fields:** full-width dark inputs and native select, 52px minimum height, 1px grey border and visible labels. Disabled fields use 0.7 opacity. Consent uses a native 18px checkbox with the red accent.
- **Registration states:** the form collects an adult name, email, phone, training group and contact consent. Native validation precedes submission; sending disables the button, changes its label and sets `aria-busy`. Success resets the form and focuses a polite live status. Server-validation errors explain what to correct; network errors preserve values and support retry. Native POST to `/api/registrations` redirects to `/thanks/?registered=1` after the API saves the registration. Missing optional operator details do not disable collection.

- **FAQ:** native ruled disclosures extend the discipline pattern, with Archivo 600 questions at 18px (16px mobile), 16px answers (14px mobile), an inherited Syne section heading and a plus rotating 45 degrees. The five answers cover confirmed monthly unlimited prices, free first session, disciplines, weekends and no-commitment interest registration.

## Registration inbox

The private operational surface lives in `apps/web/dash/src/` and follows the user-selected AgentOS console reference: a compact rail, ruled list, and adjacent detail workspace. This is a console-specific extension of the Pit palette and does not alter the public site's square, open composition. The shipped shell is a 216px rail at desktop, a sticky compact rail at 860px and below, and a 12px main gutter at the narrowest 320px width. The logo is the supplied `/brand/logo.svg`; Archivo serves all operational UI, while Syne is reserved for the 38px sign-in title. Bone text and Pit red mark primary actions, selected rows, current status and focus.

Console tokens in `apps/web/dash/src/styles.css` are near-black `#080808` background, `#0d0d0d` rail, `#111111` panel, `#171717` raised state, `#1c1c1c` hover, `#2d2d2d` border, `#222222` soft rule, `#fafafa` text, `#f4f0e7` bone, `#aaa69d` muted copy, `#817e77` dim metadata and `#e0231f` primary red. Panels use 9px radius; controls use 6px radius; categorical status tags are pills. Controls are 40px high by default, buttons 38px, rows about 64–65px, and mobile form controls use 16px text to prevent browser zoom. The console uses tonal layering and 1px rules; it has no shadows or gradients.

The login view is a centered, restrained panel with the supplied logo, Syne title, concise access copy, labeled email and password fields, and a full-width red sign-in action. It has no background watermark. Session restoration and loading are explicit; rejected sign-in and session-expiry messages use `role="alert"`; save confirmations use `role="status"`. Focus-visible controls receive a 2px red outline with a 3px offset, native labels and semantics remain intact, loading and disabled controls communicate their state, and `prefers-reduced-motion` removes animation and transitions.

Staff land on Expressions of interest. Search, programme and follow-up status filters lead into dense selectable rows with name, email, programme, status and received date. The adjacent detail panel provides email and phone actions, follow-up status, confirmation state, staff note, editable submitted contact details, save and discard actions, and last-updated metadata. Dates use tabular numerals and London time. At 760px and below, selecting a record hides the list and opens a focused full-width detail view with an explicit “Back to interests” action; the same rail/list/detail treatment applies to Staff accounts. Empty, filtered-empty, loading skeleton, network/error, validation, saving and saved states are represented in the interface. The application renders API data only and contains no fabricated rows.

Administrators also see Staff accounts. The page uses the same ruled list and adjacent detail pattern to show role and active state, create an account, change role, activate/deactivate and reset a password. Staff never see this navigation item. Self-lockout and final-admin protections are explained in the UI and enforced by the service. Better Auth email/password sessions use secure HttpOnly cookies; seed setup provides configurable admin and staff users, with existing accounts preserved. Memberships, plans, billing and registration automation remain outside this surface.

## Do's and Don'ts

- **Do** retain the supplied August logo geometry, fonts and black/red/bone hierarchy.
- **Do** use functional greys for readable secondary information and control states.
- **Do** preserve keyboard focus, native disclosure/form semantics and reduced-motion behavior.
- **Don't** add gradients, glow, decorative card grids or replacement logo artwork.
- **Don't** use red body copy or obscure provisional and disabled states.
