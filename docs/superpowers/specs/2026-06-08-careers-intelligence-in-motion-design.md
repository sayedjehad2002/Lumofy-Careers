# Lumofy Careers — "Intelligence in Motion" Re-Architecture

**Date:** 2026-06-08
**Status:** Approved blueprint → spec
**Owner:** Careers Experience Task Force (Product Design · UX Research · Creative · Employer Brand · Conversion)
**Scope:** Complete re-architecture of the public Careers experience into a single flagship page at `/`.

---

## 1. Objective

Replace the current thin, multi-page careers site with a single, cinematic, conversion-driven **talent acquisition experience** that feels at home next to Stripe, Linear, Vercel, and Anthropic — while remaining unmistakably Lumofy. The page must make a top candidate think, within one scroll: *"These people are building something important, and I want to work here."*

This is a re-architecture, not a touch-up: new information architecture, new visual system, new section concepts, new motion language. The bones (brand tokens, motion system, data layer) are reused; the architecture and ambition are rebuilt.

## 2. Creative direction — "Intelligence in Motion"

**Governing idea:** *The interface behaves like the product — it senses, reveals, and clarifies.* Lumofy sells **workforce intelligence**; the careers page must itself feel intelligent. Restraint is the brand signal — confidence through whitespace, precision typography, and motion that exposes structure rather than decorating it.

**Three non-negotiable rules:**
1. **One signature move per section.** Never stack competing animations.
2. **Color means something.** Color encodes data (department, pillar, status) — never pure decoration.
3. **Every effect earns its place against an "apply" outcome.** If it doesn't aid comprehension, desire, or trust, it is cut.

This direction was chosen over "The Constellation" (cosmic-maximal; perf/spectacle risk) and "The Human System" (warm but undifferentiated). C's human warmth is deliberately pulled into Sections 4 and 6 so B does not read cold.

## 3. Competitive benchmark

| Company | What we borrow | How we differ / improve |
|---|---|---|
| **Stripe** | Precision type, generous whitespace, restrained color | Add a *live* data layer (real open-role counts) so it's useful, not just pretty |
| **Linear** | Mono/sans pairing, "one move per section", dark-first polish | Apply a *semantic* color system tied to departments/pillars (Linear is near-monochrome) |
| **Vercel** | High-contrast hero thesis, confident negative space | Asymmetric hero with a live "system panel" rather than a static gradient |
| **Notion** | Human, real-people storytelling | Editorial "journey" spotlights with role/tenure/ownership, not quote cards |
| **Ramp** | Conversion discipline, role surfacing | Surface live roles in the hero *and* a curated section + persistent CTA |
| **Anthropic** | Calm, serious, mission-forward tone | A "Why this matters" stakes section grounded in MENA talent transformation |

## 4. Audit of current experience & why the redesign is superior

Current `/` = `Hero` (headline + stats + 3 "why join" cards) → `HiringProcess` → `FAQ` → `JoinCTA`. Mission/people/benefits exiled to `/about`, `/life`, `/benefits`.

| Lens | Current weakness | Redesign superiority |
|---|---|---|
| UX | Story buried on secondary routes; roles 2 clicks deep; no roles on `/` | One scroll tells the whole story; live roles in hero + curated section; persistent CTA |
| Visual | Premium cosmic system unused on `/`; repeated white `bg-card` + `light-glow` boxes | Disciplined B system actually deploys the brand; mono/sans precision; semantic color |
| Storytelling | "Build your future / fast-growing HRTech" — generic, no stakes | Mission thesis → stakes → product vision → principles → growth → people → invitation |
| Conversion | Two CTAs total, no momentum | Momentum architecture: every section has a job; live counts; human handoff at close |
| Employer brand | Real team/testimonials/4.8/5 hidden on `/life` | Real people elevated to editorial "Team Stories"; recruiter handoff at close |

## 5. Information architecture

**One cinematic page at `/`.** Scroll-driven, anchor-navigable.

**Routing changes (`src/App.tsx`):**
- **Retire** routes: `/about`, `/life`, `/benefits` (and remove the lazy imports for `AboutPage`, `LifeAtLumofy`, `BenefitsPage`). Their content is folded into `/`.
- **Keep:** `/`, `/jobs`, `/jobs/:id`, `/jobs/:id/apply`, `/dashboard`, `/hr/join`, `*`.
- The retired page files may remain on disk (unused) or be deleted in a cleanup pass; routes/links are the source of truth for "removed."

**Nav (`Navbar.tsx`):** Links become in-page anchors — **Mission · Building · Principles · Growth · Team · Roles** — plus a persistent primary **View open roles** button, theme toggle, and the conditional HR Dashboard button. A thin **scroll-progress "intelligence thread"** sits under the bar.

**Footer (`Footer.tsx`):** Replace `/life`, `/benefits`, `/about` links with in-page anchors; keep Open Positions (`/jobs`), LinkedIn, office, careers email.

**Mobile nav (`MobileBottomNav.tsx`):** Re-point to the new anchors / `/jobs`.

**Page section order:**
0. Nav + scroll thread
1. Hero — the thesis
2. Why this matters — the stakes
3. What we're building — product vision
4. Operating principles *(replaces Life at Lumofy)*
5. Growth experience *(replaces Benefits)*
6. Team stories *(replaces testimonials)*
7. Open roles + how hiring works
8. FAQ (folded, quiet) → Closing — the horizon
9. Footer

## 6. Visual system

### 6.1 Color strategy
- **Monochrome-forward canvas:** ~90% of every screen is Cosmos neutral (dark) / near-white (light), using existing `--background`, `--card`, `--muted`, `--border`.
- **Sirius blue (`--primary`, #215BEA)** is the *single* primary accent: emphasis, "live" pulse, primary CTA.
- **Semantic cosmic palette:** Eclipse / Aurora / Stellar / Nova become a *data* system. Each **department** and each **product pillar** maps to a fixed hue. A `deptColor(name)` helper returns a stable hue per department.
  - Pillars: Competency → **Sirius**, Performance → **Eclipse**, Assessments & Learning → **Aurora**, Engagement → **Nova**. (Stellar reserved for data highlights.)
- **Aurora gradient appears exactly twice:** Hero (subtle, behind) and Closing. Nowhere else.
- **Token work (`src/index.css`):** the `--brand-sirius/eclipse/aurora/stellar/nova` tokens currently exist only under `.dark`. **Add light-mode equivalents to `:root`** (slightly darker/more saturated for AA contrast on white) so the semantic system works in both themes. Expose as Tailwind colors (e.g., `brand.eclipse`) in `tailwind.config.ts`.

### 6.2 Typography
- **Source Sans 3** (brand, already loaded) for all human copy. Display scale with tightened tracking:
  - Display/Hero: `clamp(2.5rem, 6vw, 5rem)`, weight 800, tracking `-0.03em`, leading `1.05`.
  - Section H2: `text-3xl sm:text-4xl lg:text-5xl`, weight 800, tracking `-0.02em`.
  - Body: `text-base sm:text-lg`, `text-muted-foreground`.
- **Space Mono** (already in `tailwind.config.ts` as `font-mono`, currently unused) for **data**: kickers, section labels, role meta, counts, numeric readouts. Uppercase, `tracking-[0.15em]`, `text-xs`. This is the precision/"engineered" tell.

### 6.3 Surfaces & components
- Cards use existing `glass-card` / `light-glow` but **flatter and quieter** than today — thin borders, restrained shadow, hover = subtle lift + Sirius border tint only.
- Primary button keeps `btn-sheen`. Mono is never used for buttons (sans only).

## 7. Motion system

Built on existing `src/lib/motion.ts` (`brandEase`, `fadeUp`, `staggerContainer`, `revealViewport`) and `<MotionConfig reducedMotion="user">` — all additions inherit reduced-motion safety.

- **Text reveals:** headline/sub-deck reveal in lines with small stagger (extend `fadeUp`).
- **Count-ups:** reuse `AnimatedCounter`, scroll-triggered, for all numeric data.
- **Progressive disclosure:** Sections 3 (pillars assemble) and 4 (principle index) reveal detail on scroll/selection.
- **Scroll thread:** a 2px Sirius progress bar under the nav driven by `useScroll`.
- **Signature-move budget:** Hero = live system panel; §2 = sequential stake reveal; §3 = pillar assembly; §4 = index disclosure; §5 = trajectory draw; §6 = spotlight transition; §7 = card stagger; §8 = aurora swell. One each.
- **Guardrails:** transform/opacity only, 150–400ms, ease-out, ~30–50ms stagger, no layout shift. Honor `prefers-reduced-motion`.

## 8. Section-by-section specification

Each section: **Concept · Layout · Content/Data · Components · Motion · Conversion job · Mobile · Why superior.**

### §1 Hero — "The thesis"
- **Concept:** A category thesis, not "join our team."
- **Layout:** Asymmetric. Left: mono kicker (`CAREERS AT LUMOFY · MENA`), huge mission headline, sub-deck, two CTAs (**View open roles** primary → `/jobs`; **See what we're building** → anchor). Right/below: a restrained **live system panel** — an animated capability/signal motif with a real **"{N} open roles"** readout.
- **Data:** open-role count from `CareersContext` (`jobs.filter(status==='open').length`).
- **Components:** `HeroSection` (new), `AuroraEffect` (reuse, subtle), `AnimatedCounter`.
- **Motion:** line text reveal; panel signal animation (one move).
- **Conversion:** ambition + immediate apply path → first CTA click. **Emotion:** seriousness/scale.
- **Mobile:** stacked; panel becomes a compact live readout chip.
- **Why superior:** replaces generic headline + static stats with a thesis + live, useful data.
- **PLACEHOLDER:** headline copy (draft: *"Workforce intelligence for the next era of work."*).

### §2 Why this matters — "The stakes"
- **Concept:** Why workforce intelligence matters now: skills gap × AI reshaping work × MENA talent transformation.
- **Layout:** Editorial lead statement + 3 "stake" points revealed in sequence; mono data captions; heavy negative space.
- **Data:** real where possible (`100+` clients, `10+` countries, MENA). Net-new figures flagged `PLACEHOLDER`.
- **Components:** `WhyItMattersSection` (new).
- **Motion:** sequential stake reveal.
- **Conversion:** belief in mission → emotional buy-in. **Emotion:** significance.
- **Mobile:** single column, stakes stack.
- **Why superior:** replaces absent stakes/abstract "why join" cards with a real argument.

### §3 What we're building — "Product vision"
- **Concept:** Disciplined, immersive product showcase — show, don't tell.
- **Layout:** 4 pillars — **Competency frameworks · Performance management · Assessments & Learning · Engagement** — that **assemble as you scroll**, each in its semantic hue; short label + one line each; an optional "capability graph" motif connecting them.
- **Components:** `WhatWeBuildSection` (new).
- **Motion:** pillar assembly on scroll (one move).
- **Conversion:** "important + technically serious" → desire. **Emotion:** ambition.
- **Mobile:** vertical stack of pillar blocks.
- **Why superior:** the current site never shows the product; this makes the mission tangible.
- **PLACEHOLDER:** pillar names/copy (drafted from known Lumofy platform context — confirm).

### §4 Operating principles — "How we work" *(replaces Life at Lumofy)*
- **Concept:** Premium culture framework, not perk cards.
- **Layout:** Interactive numbered index **01–05** (vertical). Selecting/scrolling a principle reveals a detail panel with a *real* artifact (team photo or metric). Mono numbering; one hue per principle.
- **Data:** real team photos from `/lovable-uploads/...`.
- **Components:** `OperatingPrinciplesSection` (new).
- **Motion:** index disclosure (one move).
- **Conversion:** self-selection by standard → higher-quality applicants. **Emotion:** belonging.
- **Mobile:** stacked accordion.
- **Why superior:** replaces generic culture/perk cards with a memorable, interactive standard.
- **PLACEHOLDER:** the 5 principle statements (drafted — confirm).

### §5 Growth experience — "Your trajectory" *(replaces Benefits)*
- **Concept:** Reframe benefits as *employee success*, not company perks.
- **Layout:** A cohesive "growth system" organized around **Career acceleration · Learning · Well-being · Flexibility · Rewards · Ownership**; a primary trajectory visual + supporting detail.
- **Data:** fold real perks from current `/life` (`Flexible & Hybrid`, `Learning Budget`, `Flexible Time Off`, `Flat Culture`, `Career Growth`, `Innovation Days`, `Impactful Work`) and `/benefits` (`Growth`, `Career Progression`, `Impact`, `Culture`, `Innovation`, `Ownership`).
- **Components:** `GrowthExperienceSection` (new).
- **Motion:** trajectory draw on scroll.
- **Conversion:** aspiration → desire to grow here. **Emotion:** "I'll become more."
- **Mobile:** stacked cards.
- **Why superior:** reframes perks around the candidate's success arc.

### §6 Team stories — "The people" *(replaces testimonials)*
- **Concept:** Real people, superior format. C's warmth lives here.
- **Layout:** Featured **journey spotlights** (real photo, name, role, tenure, real quote, "what they own") + a refined supporting team grid/marquee.
- **Data:** real team + testimonials already in `LifeAtLumofy.tsx` (8 members, 4 quotes, photos, tenure). **Do not fabricate** promotion histories; keep to role/tenure/quote/ownership we actually have.
- **Components:** `TeamStoriesSection` (new); may reuse `TeamMarquee`.
- **Motion:** spotlight transition (one move).
- **Conversion:** trust → "I want to work with them." **Emotion:** human connection.
- **Mobile:** swipeable spotlight + stacked grid.
- **Why superior:** elevates hidden real people to an editorial centerpiece.

### §7 Open roles + how hiring works
- **Concept:** Curated live preview → full `/jobs`.
- **Layout:** Top N open roles as premium cards (mono meta: dept · location · type; color-coded department pill), department filter pills, **View all {N} roles →** `/jobs`. Below: "How hiring works" 4 steps (fold `HiringProcess`).
- **Data:** live from `CareersContext`; reuse/adapt `JobCard`.
- **Components:** `OpenRolesSection` (new), elevated `JobCard`, fold `HiringProcess`.
- **Motion:** card stagger.
- **Conversion:** reduce friction → application started. **Emotion:** opportunity, clarity.
- **Mobile:** full-width cards; horizontal pill scroll.
- **Why superior:** roles are now on `/`, branded, live, and set expectations.
- **`/jobs` elevation (light):** apply mono meta + semantic dept color + type polish to match; do not rebuild filtering.

### §8 FAQ + Closing — "The horizon"
- **Concept:** A memorable ending + human handoff, not a CTA box.
- **Layout:** Quiet FAQ accordion (fold `FAQ`, restyled) → full-bleed closing: mission restatement, **aurora #2**, live roles count, one decisive CTA, and **recruiter handoff** (Hasan Alhashimi's real name/photo from `site.ts` / team data) — "talk to a real person."
- **Components:** `ClosingSection` (new), fold `FAQ`, replace `JoinCTA`.
- **Motion:** aurora swell (one move).
- **Conversion:** conviction → application completed. **Emotion:** decisiveness + reassurance.
- **Mobile:** stacked; recruiter card full width.
- **Why superior:** replaces a lone CTA block with an emotional close + human contact.

## 9. Component specifications (new)

All under `src/components/careers/sections/`, composed by `Index.tsx`. Each is self-contained, presentational, reduced-motion-safe, and reads shared content from a new `src/data/careers.ts` (single source of truth for section copy, principles, pillars, growth items — keeps copy/placeholders editable in one place).

| Component | Responsibility | Key data/props |
|---|---|---|
| `SectionShell` | Shared section wrapper: kicker (mono) + H2 + sub-deck + reveal | `{ id, kicker, title, sub, children }` |
| `HeroSection` | Thesis + CTAs + live system panel | open-role count (context) |
| `WhyItMattersSection` | Stakes statement + 3 stake points | `careers.stakes` |
| `WhatWeBuildSection` | 4 assembling pillars | `careers.pillars` |
| `OperatingPrinciplesSection` | Interactive 01–05 index + detail | `careers.principles`, team photos |
| `GrowthExperienceSection` | 6-theme growth system | `careers.growth` |
| `TeamStoriesSection` | Journey spotlights + team grid | real team/testimonials data |
| `OpenRolesSection` | Live curated roles + dept pills + how-hiring | `CareersContext`, `JobCard` |
| `ClosingSection` | FAQ + horizon close + recruiter handoff | `SITE`, FAQ items |
| `ScrollThread` | 2px Sirius scroll-progress bar under nav | `useScroll` |
| `deptColor()` util | Stable hue per department/pillar | string → token class |

**Reused as-is:** `AnimatedCounter`, `AuroraEffect`, `TiltCard` (sparingly), `motion.ts`, `CareersContext`, `JobCard`, `TeamMarquee` (optional).

## 10. Mobile experience

Designed mobile-first; B's restraint is the mobile strategy (less to choke a mid-range Android). Single-column reflow per section; hero panel → compact readout; principles → accordion; roles → full-width cards with ≥44px targets; horizontal pill strips use existing `.scrollbar-none`. Verify at 375px and 768px.

## 11. Conversion optimization rationale

| Section | Goal | Emotion | Outcome |
|---|---|---|---|
| Hero | Surface roles instantly + thesis | Seriousness/scale | First CTA click |
| Why it matters | Build belief | Significance | Mission buy-in |
| What we're building | Prove credibility | Ambition | Desire |
| Principles | Self-selection | Belonging | Higher-quality applicants |
| Growth | Show upside | Aspiration | Time-on-page, desire |
| Team stories | Build trust | Connection | Trust |
| Open roles | Remove friction | Opportunity | Application started |
| Closing | Decisive push + human contact | Conviction/reassurance | Application completed |

Persistent **View open roles** in nav guarantees an apply path from any scroll depth.

## 12. Employer branding rationale

Top talent applies to **mission + people + standards**. The redesign foregrounds all three: a real mission thesis (Hero/§2), a tangible product (§3), explicit standards (§4), a growth promise (§5), real humans (§6), and a real recruiter (§8). Restraint itself signals confidence and engineering maturity — the same signal Stripe/Linear send.

## 13. Content inventory & placeholders

**Real (reuse, verifiable):** team (8, photos/roles/tenure/bios), testimonials (4 quotes), `site.ts` stats (30+ employees, Bahrain & Saudi Arabia, 10+ countries, founded 2020), 100+ clients, 4.8/5, recruiter Hasan Alhashimi, careers email, jobs via `CareersContext`.

**`PLACEHOLDER` (drafted, flagged for sign-off):** hero mission line; product pillar names/copy; 5 operating principles; any net-new metric beyond `site.ts`. All marked in `careers.ts` with `PLACEHOLDER` comments and surfaced for review before launch.

## 14. Technical implementation notes

- **New:** `src/components/careers/sections/*`, `src/data/careers.ts`, `src/components/careers/ScrollThread.tsx`, `deptColor` util (in `src/lib/`).
- **Edit:** `Index.tsx` (recompose), `Navbar.tsx` (anchors + persistent CTA + thread), `Footer.tsx` (anchors), `MobileBottomNav.tsx` (anchors), `App.tsx` (retire 3 routes), `src/index.css` (light-mode brand tokens), `tailwind.config.ts` (expose `brand.*`), `JobCard.tsx` (mono meta + dept color), `JobsPage.tsx` (light elevation).
- **Retire (routes/links):** `/about`, `/life`, `/benefits`. Page files left unused (optional later deletion).
- **Reuse:** all primitives above; do not duplicate motion tokens.

## 15. Accessibility & performance guardrails

- WCAG AA contrast for all text incl. new light-mode brand tokens; semantic color never the *only* signal (always paired with text/label).
- Keyboard: anchor nav focusable, principle index operable by keyboard, visible focus rings, skip-link preserved.
- Reduced motion respected everywhere (inherited).
- Perf: lazy/anchor-only; no heavy canvas added to `/` beyond existing `AuroraEffect`; animate transform/opacity only; protect LCP (hero text first, panel non-blocking); keep CLS ~0.

## 16. Verification plan

Build → run dev server (port 3005) → preview in light + dark, desktop (1440) + mobile (375): console clean, snapshot structure, screenshots of each section, test anchor nav + principle index + roles pills. Fix from source. **Do not push to `main` until the user approves** (auto-deploys to Vercel).

## 17. Out of scope (non-goals)

HR dashboard, apply flow internals, Supabase/edge functions, AI functions, auth, deep `/jobs` filtering rebuild, deleting retired page files (optional cleanup later).
