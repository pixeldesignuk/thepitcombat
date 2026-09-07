# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The **brand/identity workspace** for **The Pit Combat Academy** — a UK multi-discipline martial-arts academy (Boxing, MMA, Muay Thai/Kickboxing, BJJ/Grappling) for **young people and adults**, run by a **father and son** (a background story, not the headline). This directory (`the pit/brand/`) is **design output, not an application**: there is no package.json, build, lint, or test step. Deliverables are self-contained HTML logo-concept galleries with inline SVG marks.

> **The brief was reset (2026-08-17)** and discovery (01 Audience → 04 Offer) is locked in **`BRAND-FOUNDATION.md` — read it first.** The venture is now **combat-academy only**; the earlier maktab / dual-audience / ENDORSED-architecture direction and its rounds (`logo-concepts-*.html`, `logo-refine-*.html`, `logo-round4-*.html`, old `BRAND-BRIEF.md`) are **superseded** — archive only, do not carry their constraints forward.

## Brand foundation (current — full detail in `BRAND-FOUNDATION.md`)

- **What it is:** multi-discipline martial-arts academy — Boxing, MMA, Muay Thai/Kickboxing, BJJ/Grappling — youth + adults, Greater Manchester (Oldham/Rochdale). Family-run (father & son), background.
- **Audience:** parents (forge my kid) + serious fighters (real competitive room). One promise: *this is where you're made.*
- **Voice:** **The Hard Mentor, values-led** — firm, few words, respect/discipline/family/honour. Never hype, cheese, emoji-spam, or soft.
- **Visual:** **contemporary, sharp, type-forward** — modern-MMA angularity + streetwear bold lettering. **Black + red.** Mono-safe, scales tiny→signage, dark & light.
- **Mark:** **abstract / geometric / typographic only — no people, no animals.** Toughness from weight, angle, letterform.
- **Differentiator:** the **kid-to-competitor pipeline — we take a child and forge a fighter.**
- **Bans:** flames/tribal/dragons, neon/gamer glow, cartoon brights, crossed-gloves/fist clichés, heritage-crest, quiet-minimal.

**Live concept directions** (survivors of discovery — each a distinct *idea*, not a palette swap):
1. **Wordmark-led** — heavy combat-plate "THE PIT" with a red cut/notch; icon optional.
2. **Sharp abstract mark** — the pit/arena in plan or section, or a **P** built from that geometry.

## Repository layout

- `inspiration/` — reference imagery (`.webp`) feeding the marks.
- `logo-*.html` (existing) — **superseded** prior rounds; keep for reference only.
- New rounds land as new `logo-round-N-*.html` files (see conventions below).

Broader venture context is one level up in `the pit/`:
- `MASTER-PLAN.md` — the whole operation (note: still references the maktab; the **brand** no longer does). Brand is workstream **WS6**, and **logo lock is the soft-launch trigger** everything else waits on.
- `floor plan.ai` — Illustrator premises plan (binary).

## Conventions for the HTML concept pages

- **Self-contained**: no external assets, no build. All CSS inline in a `<style>` block; every mark is **inline SVG** so it renders standalone and stays vector.
- **Theme-aware** (match existing pages): light palette on bare `:root`; dark overrides under both `@media (prefers-color-scheme:dark)` (guarded `:root:not([data-theme="light"])`) and `:root[data-theme="dark"]`.
- Each concept card shows the mark at multiple scales (e.g. 64/40/24px), a mono/dark swatch, and a horizontal lockup ("THE PIT COMBAT ACADEMY").
- To review, open the HTML file directly in a browser (or send it with the file tools) — nothing to compile.
- Rounds are **additive**: each new exploration is a new file, committed `feat(the-pit): Round N …`. Don't overwrite prior rounds; add the next one.

## Workflow

- **Delegate the actual visual/logo generation to the Fable model**, not the main agent. Lock the brief in chat first, get approval, then hand off.
- **AI logo pipeline**: the `logo-creator` skill (Gemini nano-banana) is for *idea generation*; the **final art is hand-built SVG**. Batch working dirs land in `.skill-archive/` (gitignored).
- **Git**: repository root is `~/Developer/personal` (this is a subdirectory of it). Commit **directly to main**, no feature branches. Prefix commits `feat(the-pit): …`. The personal repo has **no remote** — commits stay local.
