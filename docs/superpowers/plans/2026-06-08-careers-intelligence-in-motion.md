# Careers "Intelligence in Motion" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-architect the public Careers site into a single flagship page at `/` in the "Intelligence in Motion" direction — folding About/Life/Benefits into one cinematic scroll, with a semantic cosmic color system, mono/sans typography, live roles, real team stories, and a recruiter handoff.

**Architecture:** A section system. New presentational components under `src/components/careers/sections/`, each consuming a single content source of truth (`src/data/careers.ts`) and shared primitives (`SectionShell`, `deptColor`, existing `motion.ts` / `AuroraEffect` / `AnimatedCounter` / `CareersContext` / `JobCard`). `Index.tsx` composes them. Nav becomes anchor-based; `/about` `/life` `/benefits` routes retire.

**Tech Stack:** Vite + React + TypeScript, Tailwind, shadcn/ui, framer-motion v12 (centralized in `src/lib/motion.ts`), React Router v6, Vitest.

**Verification model (read first):** This is a visual system. *Deterministic logic* (the `deptColor` util) gets a real Vitest unit test (TDD). *Visual components* are verified by: (a) `npx tsc --noEmit` passes, (b) `npm run lint` clean, (c) **live preview screenshots** in light + dark at 1440px and 375px look correct and the console is clean. Final JSX for visual sections is authored during execution against the running app (the plan specifies the exact contract: file, data, layout, brand classes, motion, and acceptance criteria). **Do not `git push` until the user approves the built result** (push to `main` auto-deploys to Vercel).

**Brand tokens (reference):** Sirius `223 83% 52%` (primary/blue), Eclipse `264 100% 70%` (purple), Aurora `149 70% 62%` (green), Stellar `59 70% 62%` (yellow), Nova `336 68% 62%` (pink). Mono font = `font-mono` (Space Mono, already configured). Motion: `fadeUp`, `staggerContainer`, `revealViewport`, `brandEase` from `@/lib/motion`.

---

## Phase 0 — Foundations

### Task 1: Semantic brand color tokens (both themes)

**Files:**
- Modify: `src/index.css` (`:root` block ~line 49-58; `.dark` already has `--brand-*` ~line 131-135)
- Modify: `tailwind.config.ts` (colors.extend, after the `lumofy` block ~line 97-100)

- [ ] **Step 1: Add light-mode brand tokens to `:root`** (after `--lumofy-glow` line in `src/index.css`). The `.dark` block already defines these; light mode needs AA-safe (darker/saturated) values:

```css
    /* Cosmic accent palette (brand) — light-mode AA-safe variants for the semantic data system */
    --brand-sirius: 223 83% 50%;   /* blue   */
    --brand-eclipse: 264 70% 56%;  /* purple */
    --brand-aurora: 149 64% 38%;   /* green  */
    --brand-stellar: 38 92% 42%;   /* amber/yellow (darkened for white-bg contrast) */
    --brand-nova: 336 68% 50%;     /* pink   */
```

- [ ] **Step 2: Expose brand colors in Tailwind** (`tailwind.config.ts`, inside `colors`, after the `lumofy: {...}` object):

```ts
			brand: {
				sirius: 'hsl(var(--brand-sirius))',
				eclipse: 'hsl(var(--brand-eclipse))',
				aurora: 'hsl(var(--brand-aurora))',
				stellar: 'hsl(var(--brand-stellar))',
				nova: 'hsl(var(--brand-nova))',
			},
```

- [ ] **Step 3: Verify build picks up tokens.** Run: `npx tsc --noEmit` → Expected: no errors. (Visual confirmation happens once a component uses `text-brand-eclipse` in Task 5+.)

- [ ] **Step 4: Commit.**
```bash
git add src/index.css tailwind.config.ts
git commit -m "feat(careers): add semantic brand color tokens for both themes"
```

---

### Task 2: `deptColor` utility (TDD — real unit test)

Maps any department/pillar name to a stable brand hue, so color always encodes meaning. Deterministic → test it.

**Files:**
- Create: `src/lib/deptColor.ts`
- Test: `src/lib/deptColor.test.ts`

- [ ] **Step 1: Write the failing test** (`src/lib/deptColor.test.ts`):

```ts
import { describe, it, expect } from "vitest";
import { deptColor, BRAND_HUES } from "./deptColor";

describe("deptColor", () => {
  it("returns a stable hue object for the same name", () => {
    expect(deptColor("Engineering")).toBe(deptColor("Engineering"));
  });
  it("is case- and whitespace-insensitive", () => {
    expect(deptColor("  engineering ")).toBe(deptColor("Engineering"));
  });
  it("maps different names to entries from BRAND_HUES", () => {
    expect(BRAND_HUES).toContain(deptColor("Product"));
  });
  it("distributes a handful of departments across more than one hue", () => {
    const hues = new Set(
      ["Engineering", "Product", "Revenue", "Finance", "People & Culture"].map(deptColor)
    );
    expect(hues.size).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails.** Run: `npm run test -- deptColor` → Expected: FAIL ("Cannot find module './deptColor'").

- [ ] **Step 3: Implement** (`src/lib/deptColor.ts`):

```ts
// Maps a department / pillar name to a stable brand hue token so color always
// encodes meaning across the careers experience (see spec §6.1). Returns a Tailwind
// token key from the brand palette; pair with helpers below for class names.
export const BRAND_HUES = ["sirius", "eclipse", "aurora", "stellar", "nova"] as const;
export type BrandHue = (typeof BRAND_HUES)[number];

const norm = (s: string) => s.trim().toLowerCase();

// Stable string hash → index, so a given department always gets the same hue.
function hashIndex(s: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % mod;
}

export function deptColor(name: string): BrandHue {
  return BRAND_HUES[hashIndex(norm(name), BRAND_HUES.length)];
}

// Convenience class helpers (semantic color always paired with text — never color alone).
export const hueText = (h: BrandHue) => `text-brand-${h}`;
export const hueBg = (h: BrandHue) => `bg-brand-${h}`;
export const hueBgSoft = (h: BrandHue) => `bg-brand-${h}/10`;
export const hueBorder = (h: BrandHue) => `border-brand-${h}/30`;
```

- [ ] **Step 4: Run test to verify it passes.** Run: `npm run test -- deptColor` → Expected: PASS (4 tests).

- [ ] **Step 5: Commit.**
```bash
git add src/lib/deptColor.ts src/lib/deptColor.test.ts
git commit -m "feat(careers): add deptColor semantic hue utility (tested)"
```

---

### Task 3: Content source of truth (`src/data/careers.ts`)

All section copy + the real team/testimonial data (moved out of the retiring `LifeAtLumofy.tsx`). PLACEHOLDER comments mark net-new claims for user sign-off.

**Files:**
- Create: `src/data/careers.ts`

- [ ] **Step 1: Create the file** with this exact content (real data verbatim from `LifeAtLumofy.tsx`; PLACEHOLDER copy flagged):

```ts
// Single source of truth for the careers flagship page copy + people data.
// Real, verifiable content is used as-is. Net-new claims are marked PLACEHOLDER
// and must be confirmed before launch (see spec §13).
import { SITE } from "@/data/site";
import type { BrandHue } from "@/lib/deptColor";

export const hero = {
  kicker: "CAREERS AT LUMOFY · MENA",
  // PLACEHOLDER: confirm headline wording.
  headline: "Workforce intelligence for the next era of work.",
  subdeck:
    "We build the AI platform helping enterprises across MENA understand, develop, and grow their people. Join the team turning workforce data into human potential.",
  ctaPrimary: { label: "View open roles", to: "/jobs" },
  ctaSecondary: { label: "See what we're building", to: "#building" },
};

export const stakes = {
  lead: "The way organizations build talent is being rewritten. We intend to write it.",
  points: [
    {
      title: "The skills gap is the defining business problem of the decade.",
      body: "Companies can't see the capabilities they have — or the ones they'll need. We make them visible.",
    },
    {
      title: "AI is reshaping every role.",
      body: "Workforce intelligence is how organizations adapt without leaving their people behind.",
    },
    {
      title: "MENA is transforming how it grows talent — and we're at its center.",
      body: `${"100+"} organizations across ${SITE.stats.countries} countries already build with Lumofy.`, // 100+ clients: real (site copy)
    },
  ],
};

export type Pillar = { name: string; hue: BrandHue; line: string };
// PLACEHOLDER: pillar names drafted from known Lumofy platform context — confirm.
export const pillars: Pillar[] = [
  { name: "Competency frameworks", hue: "sirius", line: "Define the skills that matter, role by role." },
  { name: "Performance management", hue: "eclipse", line: "Turn goals and feedback into measurable growth." },
  { name: "Assessments & learning", hue: "aurora", line: "Diagnose capability and close gaps with targeted learning." },
  { name: "Engagement", hue: "nova", line: "Understand and lift how people feel about work." },
];

export type Principle = { n: string; title: string; body: string; hue: BrandHue };
// PLACEHOLDER: principle wording drafted — confirm with the team.
export const principles: Principle[] = [
  { n: "01", title: "Think in systems", body: "We solve root causes, not symptoms. Every fix should make the next ten easier.", hue: "sirius" },
  { n: "02", title: "Build with urgency", body: "Speed compounds. We ship, learn, and iterate faster than companies many times our size.", hue: "eclipse" },
  { n: "03", title: "Earn trust through ownership", body: "From day one you own real decisions. Trust is the default, not the reward.", hue: "aurora" },
  { n: "04", title: "Learn relentlessly", body: "We're a learning company. Curiosity and growth aren't perks here — they're the work.", hue: "stellar" },
  { n: "05", title: "Obsess over customer impact", body: "Real results for real organizations. Outcomes over output, always.", hue: "nova" },
];

export type GrowthTheme = { title: string; body: string };
export const growth: GrowthTheme[] = [
  { title: "Career acceleration", body: "Clear paths, senior mentorship, and the room to outgrow your title." },
  { title: "Learning", body: "Annual budget for courses, conferences, and professional certifications." }, // real (/life)
  { title: "Well-being", body: "Flexible time off you're trusted to manage — and a team that means it." }, // real (/life)
  { title: "Flexibility", body: "Hybrid and remote-friendly arrangements across the MENA region." }, // real (/life)
  { title: "Rewards", body: "Competitive compensation, health insurance, and benefits." }, // PLACEHOLDER: confirm specifics
  { title: "Ownership", body: "Your ideas shape the product, the team, and the company from day one." },
];

export type TeamMember = {
  name: string; role: string; department: string; location: string;
  avatar: string; photo: string; bio: string;
};
// Real team — moved verbatim from the retiring LifeAtLumofy.tsx.
export const teamMembers: TeamMember[] = [
  { name: "Ahmed Faraj", role: "Founder & CEO", department: "Leadership", location: "Bahrain", avatar: "AF", photo: "/lovable-uploads/ecf0ce79-94a1-485b-8b6b-3bb501b26321.jpg", bio: "15+ years in EdTech and HRTech. Drives Lumofy's vision to reshape how the region develops talent." },
  { name: "Mahmood Malik", role: "Cofounder & COO", department: "Leadership", location: "Bahrain", avatar: "MM", photo: "/lovable-uploads/a881206e-7d4e-443b-9591-07fbd427a0be.jpg", bio: "Operational strategist scaling Lumofy's processes, partnerships, and go-to-market across MENA." },
  { name: "Suzan Alkhriesat", role: "Senior Finance Manager", department: "Finance", location: "Bahrain", avatar: "SA", photo: "/lovable-uploads/0aa8eb0b-531f-4d4c-b360-7e6d1bf82d31.jpg", bio: "Keeps the financial engine running, from budgeting and forecasting to ensuring sustainable growth." },
  { name: "Hasan Alhashimi", role: "Employee Engagement & HR Ops Lead", department: "People & Culture", location: "Bahrain", avatar: "HA", photo: "/lovable-uploads/a82f5de3-82d3-4b03-9f19-85a62252e6d8.jpg", bio: "Champions employee wellbeing and streamlines HR operations to keep the team thriving." },
  { name: "Mahmoud Elrweny", role: "Customer Success & Professional Service Director", department: "Customer Success", location: "Bahrain", avatar: "ME", photo: "/lovable-uploads/a4a73021-bfc4-4bde-8bb2-1338418a13e2.jpg", bio: "Ensures every client achieves measurable talent outcomes with hands-on strategic support." },
  { name: "Shehab Beram", role: "Senior Product Manager", department: "Product", location: "Remote", avatar: "SB", photo: "/lovable-uploads/72097222-3975-48f3-b226-c02d3e10ad53.jpg", bio: "Translates customer needs into product roadmaps that ship fast and delight users." },
  { name: "Husain Alsayyad", role: "Acting Revenue Director", department: "Revenue", location: "Bahrain", avatar: "HA", photo: "/lovable-uploads/43c6c44e-9e97-4d4d-b00f-74541f108978.jpg", bio: "Drives revenue growth and commercial strategy across enterprise and mid-market segments." },
  { name: "Safa AlFulaij", role: "Tech Lead", department: "Engineering", location: "Bahrain", avatar: "TM", photo: "/lovable-uploads/94c2428a-fa7d-41b7-a57e-2b8c3b2c5ac1.jpg", bio: "Architects scalable systems and leads the engineering team building Lumofy's core platform." },
];

export type Story = { name: string; role: string; photo: string; quote: string; tenure: string };
// Real testimonials — moved verbatim from the retiring LifeAtLumofy.tsx.
export const stories: Story[] = [
  { name: "Suzan Alkhriesat", role: "Senior Finance Manager", photo: "/lovable-uploads/0aa8eb0b-531f-4d4c-b360-7e6d1bf82d31.jpg", quote: "What sets Lumofy apart is the trust. From day one, I had ownership of real decisions, not busywork. That's rare.", tenure: "2 years" },
  { name: "Hasan Alhashimi", role: "Employee Engagement & HR Ops Lead", photo: "/lovable-uploads/a82f5de3-82d3-4b03-9f19-85a62252e6d8.jpg", quote: "I get to practice what we preach — building an employee experience that actually works. The culture here isn't a poster on a wall.", tenure: "1.5 years" },
  { name: "Mahmoud Elrweny", role: "CS & Professional Service Director", photo: "/lovable-uploads/a4a73021-bfc4-4bde-8bb2-1338418a13e2.jpg", quote: "Our clients don't just use the platform — they see real results. Being part of those transformations keeps me motivated every day.", tenure: "3 years" },
  { name: "Shehab Beram", role: "Senior Product Manager", photo: "/lovable-uploads/72097222-3975-48f3-b226-c02d3e10ad53.jpg", quote: "The speed here is unreal. We ideate, ship, and iterate faster than teams three times our size. And the team actually listens.", tenure: "1 year" },
];

// Recruiter for the closing human handoff (real — from site.ts + team photo).
export const recruiter = {
  name: SITE.recruiter.name,           // Hasan Alhashimi
  title: SITE.recruiter.title,
  email: SITE.careersEmail,
  photo: "/lovable-uploads/a82f5de3-82d3-4b03-9f19-85a62252e6d8.jpg",
};

export const faqs = [
  // PLACEHOLDER: reuse the 6 existing FAQ entries from src/components/careers/FAQ.tsx verbatim during execution.
];
```

- [ ] **Step 2: Type-check.** Run: `npx tsc --noEmit` → Expected: no errors.

- [ ] **Step 3: Commit.**
```bash
git add src/data/careers.ts
git commit -m "feat(careers): add careers content source of truth (real data + flagged placeholders)"
```

---

### Task 4: `SectionShell` + `ScrollThread` primitives

**Files:**
- Create: `src/components/careers/sections/SectionShell.tsx`
- Create: `src/components/careers/ScrollThread.tsx`

- [ ] **Step 1: `SectionShell`** — shared section wrapper (mono kicker + H2 + sub-deck + scroll reveal + anchor id + nav offset):

```tsx
import { motion } from "framer-motion";
import { fadeUp, staggerContainer, revealViewport } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface SectionShellProps {
  id?: string;
  kicker?: string;
  title?: React.ReactNode;
  sub?: React.ReactNode;
  className?: string;
  headerClassName?: string;
  children: React.ReactNode;
}

const SectionShell = ({ id, kicker, title, sub, className, headerClassName, children }: SectionShellProps) => (
  <section id={id} className={cn("scroll-mt-24 px-4 py-20 sm:py-28", className)}>
    <div className="mx-auto max-w-6xl">
      {(kicker || title || sub) && (
        <motion.div
          variants={staggerContainer()}
          initial="hidden"
          whileInView="show"
          viewport={revealViewport}
          className={cn("mx-auto max-w-2xl text-center", headerClassName)}
        >
          {kicker && (
            <motion.p variants={fadeUp} className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-primary">
              {kicker}
            </motion.p>
          )}
          {title && (
            <motion.h2 variants={fadeUp} className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              {title}
            </motion.h2>
          )}
          {sub && (
            <motion.p variants={fadeUp} className="mt-4 text-base text-muted-foreground sm:text-lg">
              {sub}
            </motion.p>
          )}
        </motion.div>
      )}
      {children}
    </div>
  </section>
);

export default SectionShell;
```

- [ ] **Step 2: `ScrollThread`** — 2px Sirius scroll-progress bar (the "intelligence thread"):

```tsx
import { motion, useScroll, useSpring } from "framer-motion";

// Thin Sirius progress line that tracks scroll depth — sits directly under the navbar.
const ScrollThread = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });
  return (
    <motion.div
      aria-hidden="true"
      className="fixed left-0 right-0 top-16 z-40 h-[2px] origin-left bg-primary"
      style={{ scaleX }}
    />
  );
};

export default ScrollThread;
```

- [ ] **Step 3: Add smooth-scroll for anchors** in `src/index.css` (inside the first `@layer base`, after the `body` rule). Reduced-motion already forces `scroll-behavior: auto` via the existing media query, so this is safe:

```css
  html { scroll-behavior: smooth; }
```

- [ ] **Step 4: Type-check.** Run: `npx tsc --noEmit` → Expected: no errors.

- [ ] **Step 5: Commit.**
```bash
git add src/components/careers/sections/SectionShell.tsx src/components/careers/ScrollThread.tsx src/index.css
git commit -m "feat(careers): add SectionShell + ScrollThread primitives"
```

---

## Phase 1 — Sections

> **Execution loop for every section task:** author the component → temporarily render it in `Index.tsx` → `npx tsc --noEmit` → start/reload preview → screenshot light+dark, desktop(1440)+mobile(375) → check console clean → fix from source → commit. Each section file lives in `src/components/careers/sections/`.

### Task 5: `HeroSection`

**Files:** Create `src/components/careers/sections/HeroSection.tsx`; temporarily wire into `Index.tsx`.

**Contract:**
- **Data:** `hero` from `@/data/careers`; live open count = `useCareers().jobs.filter(j => j.status === "open").length`.
- **Layout:** asymmetric grid (`lg:grid-cols-[1.1fr_0.9fr]`), full-viewport-ish (`min-h-[88vh]` flex items-center). Left column: mono kicker, display headline (`text-[clamp(2.5rem,6vw,5rem)] font-extrabold tracking-[-0.03em] leading-[1.05]`), sub-deck, two buttons (primary `asChild` Link → `/jobs` with `btn-sheen`; secondary outline → `#building`). Right column: **live system panel** — a `glass-card rounded-2xl` containing a restrained animated "capability signal" (3–5 horizontal bars/nodes in semantic hues that subtly pulse) + a readout row using `AnimatedCounter` for the open-role count with mono label `OPEN ROLES`.
- **Background:** `<AuroraEffect />` (reuse) at low opacity behind, plus the existing top brand wash.
- **Motion (one move):** headline/sub-deck line reveal via `staggerContainer`+`fadeUp`; the panel's signal bars animate width/opacity on a slow loop (transform/opacity only).
- **Acceptance:** headline dominates; panel reads as "data, not decoration"; real open count shown; AA contrast both themes; no layout shift; reduced-motion stills.

**Steps:**
- [ ] Author `HeroSection.tsx` per contract.
- [ ] Render `<HeroSection />` in `Index.tsx` (temporary, replacing `<Hero />`).
- [ ] `npx tsc --noEmit` → no errors.
- [ ] Preview: `preview_start` (or reload), screenshot light+dark @1440 and @375; `preview_console_logs` clean.
- [ ] Fix from source until it matches the contract.
- [ ] Commit: `git add -A && git commit -m "feat(careers): hero section (thesis + live system panel)"`

---

### Task 6: `WhyItMattersSection`

**Files:** Create `src/components/careers/sections/WhyItMattersSection.tsx`.

**Contract:**
- **Data:** `stakes` from `@/data/careers`.
- **Layout:** `SectionShell` id=`why`, kicker `WHY THIS MATTERS`. Big editorial lead line (`stakes.lead`) at large display size, left-aligned, max-w-4xl. Below: 3 stake rows in a `md:grid-cols-3` — each a quiet card (thin border, no heavy glow) with a mono index (`01/02/03`), title, body; one brand hue accent per card (sirius/eclipse/aurora) on the index + top border.
- **Motion (one move):** sequential reveal of the 3 stakes (stagger).
- **Acceptance:** reads as a confident argument; numbers (100+, 10+) visible; lots of negative space.

**Steps:** author → tsc → preview (light/dark, 1440/375) → fix → commit `feat(careers): why-this-matters stakes section`.

---

### Task 7: `WhatWeBuildSection`

**Files:** Create `src/components/careers/sections/WhatWeBuildSection.tsx`.

**Contract:**
- **Data:** `pillars` from `@/data/careers` (4, each with `hue`).
- **Layout:** `SectionShell` id=`building`, kicker `WHAT WE'RE BUILDING`, title + sub. The 4 pillars **assemble on scroll**: a 2×2 (`md:grid-cols-2`) of pillar panels (`glass-card`), each with the pillar name, one-line description, a mono tag, and a small semantic-hued "module" glyph (use `hueText`/`hueBgSoft` from `deptColor`). Optional connective lines/dots between panels (decorative, low opacity) to imply a "system".
- **Motion (one move):** each pillar `scaleIn`/`fadeUp` staggered as it enters; hue accent fades in.
- **Acceptance:** feels like a product system assembling; color = pillar identity; PLACEHOLDER copy clearly the only invented part.

**Steps:** author → tsc → preview → fix → commit `feat(careers): what-we're-building pillars section`.

---

### Task 8: `OperatingPrinciplesSection`

**Files:** Create `src/components/careers/sections/OperatingPrinciplesSection.tsx`.

**Contract:**
- **Data:** `principles` from `@/data/careers` (01–05, each `hue`).
- **Layout (desktop):** two columns — left a numbered **index** (clickable list 01–05, mono numbers, active item highlighted in its hue); right a **detail panel** showing the selected principle's title + body large, with a supporting real artifact (a `teamMembers` photo or a stat). `useState` for active index; default 0.
- **Layout (mobile):** stacked accordion (each principle expands).
- **Motion (one move):** detail panel cross-fades/slides on selection (`AnimatePresence`).
- **Acceptance:** interactive, premium, keyboard-operable (buttons, focus ring); no icon-in-circle cliché; one hue per principle.

**Steps:** author → tsc → preview (test clicking an item via `preview_click`) → fix → commit `feat(careers): operating principles interactive index`.

---

### Task 9: `GrowthExperienceSection`

**Files:** Create `src/components/careers/sections/GrowthExperienceSection.tsx`.

**Contract:**
- **Data:** `growth` from `@/data/careers` (6 themes).
- **Layout:** `SectionShell` id=`growth`, kicker `GROWTH EXPERIENCE`, title "Your trajectory" + sub. A cohesive grid (`md:grid-cols-2 lg:grid-cols-3`) of 6 growth cards framed around the candidate ("you"), each with a mono label, title, body, and a subtle hue accent cycling through the palette. Keep cards equal height (`h-full`).
- **Motion (one move):** card stagger reveal.
- **Acceptance:** reframed as employee success (copy is "you"-centric), not company perks; folds real /life + /benefits perks.

**Steps:** author → tsc → preview → fix → commit `feat(careers): growth experience section`.

---

### Task 10: `TeamStoriesSection`

**Files:** Create `src/components/careers/sections/TeamStoriesSection.tsx`.

**Contract:**
- **Data:** `stories` + `teamMembers` from `@/data/careers`.
- **Layout:** `SectionShell` id=`team`, kicker `TEAM STORIES`, title + sub. Top: a **featured spotlight** — large real photo + name + role + mono tenure tag + the real quote as an editorial pull-quote; a small control to cycle spotlights (`stories`). Below: a refined **team grid** (`teamMembers`) — photo, name, role (mono), location; equal heights; subtle hover lift. Optionally reuse `TeamMarquee` for the grid if it reads better.
- **Motion (one move):** spotlight cross-fade on change (auto-advance optional, pause on hover; respect reduced motion → no auto-advance).
- **Acceptance:** real people, real quotes; editorial and warm; no invented progression histories.

**Steps:** author → tsc → preview (verify real photos load) → fix → commit `feat(careers): team stories section`.

---

### Task 11: `OpenRolesSection` (+ fold HiringProcess)

**Files:** Create `src/components/careers/sections/OpenRolesSection.tsx`.

**Contract:**
- **Data:** `useCareers().jobs` (open only). Departments derived from live open jobs (`[...new Set(openJobs.map(j => j.department))]`). `useState` for active department filter (default "All").
- **Layout:** `SectionShell` id=`roles`, kicker `OPEN ROLES`, title + live count in sub ("{N} roles open across {D} teams"). **Department pills** (horizontal, `scrollbar-none` on mobile) color-coded via `deptColor` (active pill filled in its hue). A grid of up to 6 filtered roles using the (elevated) `JobCard`. A prominent **View all {N} roles →** button → `/jobs` (carrying `?dept=` when a filter is active). Below, fold **"How hiring works"**: the 4 steps from `HiringProcess.tsx` (Apply → Intro call → Meet the team → Offer) restyled as a mono-numbered horizontal stepper.
- **Empty state:** if no open jobs, a tasteful "No open roles right now — introduce yourself" → mailto recruiter.
- **Motion (one move):** card stagger; pill filter transitions.
- **Acceptance:** live real roles on `/`; pills filter instantly; deep-link to `/jobs` works; hiring steps clear.

**Steps:** author → tsc → preview (click a pill via `preview_click`, verify filter) → fix → commit `feat(careers): open roles section + how hiring works`.

---

### Task 12: `ClosingSection` (FAQ + horizon + recruiter handoff)

**Files:** Create `src/components/careers/sections/ClosingSection.tsx`.

**Contract:**
- **Data:** `recruiter` + `faqs` (reuse the 6 entries from `FAQ.tsx` verbatim — copy them into `careers.ts` `faqs` during this task) + live open count.
- **Layout:** (a) a **quiet FAQ** accordion (shadcn `Accordion`, restrained) under kicker `QUESTIONS`; then (b) the **horizon close**: full-bleed band with `<AuroraEffect />` (#2 — the only other aurora), a large mission restatement, the live open-role count, one decisive primary CTA → `/jobs`, and a **recruiter handoff card** (real photo, name, title, "Talk to a real person" mailto link).
- **Motion (one move):** aurora swell + headline reveal.
- **Acceptance:** feels like an ending, not a CTA box; human contact present; aurora used here + hero only.

**Steps:** author → tsc → preview → fix → commit `feat(careers): closing horizon section + recruiter handoff`.

---

## Phase 2 — Recompose & wire

### Task 13: Recompose `Index.tsx`

**Files:** Modify `src/pages/Index.tsx`.

- [ ] **Step 1: Replace body** with the full section order + `ScrollThread`:

```tsx
import Navbar from "@/components/careers/Navbar";
import ScrollThread from "@/components/careers/ScrollThread";
import HeroSection from "@/components/careers/sections/HeroSection";
import WhyItMattersSection from "@/components/careers/sections/WhyItMattersSection";
import WhatWeBuildSection from "@/components/careers/sections/WhatWeBuildSection";
import OperatingPrinciplesSection from "@/components/careers/sections/OperatingPrinciplesSection";
import GrowthExperienceSection from "@/components/careers/sections/GrowthExperienceSection";
import TeamStoriesSection from "@/components/careers/sections/TeamStoriesSection";
import OpenRolesSection from "@/components/careers/sections/OpenRolesSection";
import ClosingSection from "@/components/careers/sections/ClosingSection";
import Footer from "@/components/careers/Footer";

const Index = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <ScrollThread />
    <main id="main">
      <HeroSection />
      <WhyItMattersSection />
      <WhatWeBuildSection />
      <OperatingPrinciplesSection />
      <GrowthExperienceSection />
      <TeamStoriesSection />
      <OpenRolesSection />
      <ClosingSection />
    </main>
    <Footer />
  </div>
);

export default Index;
```

- [ ] **Step 2:** `npx tsc --noEmit` → no errors.
- [ ] **Step 3:** Preview full page scroll, light+dark, 1440+375; console clean; verify section order + anchors.
- [ ] **Step 4:** Commit `feat(careers): compose flagship Index from section system`.

---

### Task 14: Navbar → anchors + persistent CTA + thread offset

**Files:** Modify `src/components/careers/Navbar.tsx`.

- [ ] **Step 1: Replace the `links` array** (lines 13-19) with in-page anchors:

```tsx
  const links = [
    { to: "/#why", label: "Mission" },
    { to: "/#building", label: "Building" },
    { to: "/#principles", label: "Principles" },
    { to: "/#growth", label: "Growth" },
    { to: "/#team", label: "Team" },
    { to: "/#roles", label: "Roles" },
  ];
```

- [ ] **Step 2: Add a persistent primary CTA** in the desktop link row (after the `links.map`, before the `isHrUser` block): a `Button asChild size="sm"` → `/jobs` labeled "View open roles" with `btn-sheen`. Add the same full-width in the mobile menu.
- [ ] **Step 3:** Section ids must match (`why`, `building`, `principles`, `growth`, `team`, `roles`). Ensure `OperatingPrinciplesSection` uses id=`principles`.
- [ ] **Step 4:** `npx tsc --noEmit`; preview: click a desktop nav link → smooth scroll to section (offset correct under fixed nav).
- [ ] **Step 5:** Commit `feat(careers): navbar anchors + persistent View open roles CTA`.

---

### Task 15: Footer → anchors

**Files:** Modify `src/components/careers/Footer.tsx` (lines 22-25).

- [ ] **Step 1:** Replace the Careers link list with: `Open Positions` → `/jobs`; `Team` → `/#team`; `Growth` → `/#growth`; `Principles` → `/#principles`. Keep contact block unchanged.
- [ ] **Step 2:** `npx tsc --noEmit`; preview footer links.
- [ ] **Step 3:** Commit `feat(careers): footer links point to flagship anchors`.

---

### Task 16: MobileBottomNav → anchors

**Files:** Modify `src/components/careers/MobileBottomNav.tsx` (lines 5-11).

- [ ] **Step 1:** Replace `navItems` with 5 items suited to the single page: `Home` (`/`, Home), `Mission` (`/#why`, Sparkles), `Team` (`/#team`, Users), `Roles` (`/#roles`, Briefcase), `Apply` (`/jobs`, Send). Update icon imports accordingly. Keep the hide-on-dashboard/apply logic. (Active state: keep `/` exact-match; anchors won't be "active" — acceptable.)
- [ ] **Step 2:** `npx tsc --noEmit`; preview @375: tap items scroll correctly.
- [ ] **Step 3:** Commit `feat(careers): mobile bottom nav points to flagship anchors`.

---

### Task 17: Retire `/about` `/life` `/benefits` routes

**Files:** Modify `src/App.tsx` (imports lines 21-23; routes lines 84-85 + the about route).

- [ ] **Step 1:** Remove the three `lazy(() => import(...))` lines for `AboutPage`, `BenefitsPage`, `LifeAtLumofy`.
- [ ] **Step 2:** Remove the three `<Route>` entries: `/about`, `/life`, `/benefits`. (Leave page files on disk; they're now unreferenced.)
- [ ] **Step 3:** Grep for any remaining references to those routes: `grep -rn "/life\b\|/benefits\b\|/about\b" src` → ensure only intended ones remain (none in nav/footer after Tasks 14-15).
- [ ] **Step 4:** `npx tsc --noEmit`; `npm run build` → succeeds; preview: navigating to `/about` shows NotFound.
- [ ] **Step 5:** Commit `feat(careers): retire /about /life /benefits routes (folded into /)`.

---

## Phase 3 — `/jobs` light elevation

### Task 18: Elevate `JobCard` (mono meta + dept color)

**Files:** Modify `src/components/careers/JobCard.tsx`.

- [ ] **Step 1:** Make the department badge color semantic: import `deptColor`, `hueText`, `hueBgSoft`; color the `Badge` per `deptColor(job.department)` instead of fixed primary. Keep the "Open" pulse dot but tint it the dept hue.
- [ ] **Step 2:** Make the meta row (location, type) use `font-mono text-[11px] uppercase tracking-wider` for the "precision" tell. Keep icons.
- [ ] **Step 3:** `npx tsc --noEmit`; preview `/jobs`: cards show semantic dept colors + mono meta; still AA-contrast both themes.
- [ ] **Step 4:** Commit `feat(careers): elevate JobCard with semantic dept color + mono meta`.

---

### Task 19: Light elevation of `JobsPage` header

**Files:** Modify `src/pages/JobsPage.tsx` (header area only).

- [ ] **Step 1:** Add a mono kicker (`OPEN ROLES · LUMOFY`) above the page H1; align the H1/sub to the new display type scale. Do **not** touch the filtering logic, sidebar, or URL-param sync.
- [ ] **Step 2:** `npx tsc --noEmit`; preview `/jobs` header light+dark.
- [ ] **Step 3:** Commit `feat(careers): align /jobs header with the new system`.

---

## Phase 4 — Verify & ship-ready

### Task 20: Full verification pass

**Files:** none (verification + fixes from source).

- [ ] **Step 1:** `npm run lint` → fix any new warnings/errors in touched files.
- [ ] **Step 2:** `npm run test` → all green (deptColor + existing).
- [ ] **Step 3:** `npm run build` → succeeds (no type errors, bundles).
- [ ] **Step 4:** Preview full page: light + dark, 1440 + 375. For each section capture a screenshot; confirm: one signature move per section, aurora only in hero+closing, semantic colors consistent, mono used for data only, no CLS, console clean, anchors + principle index + role pills all work, reduced-motion (emulate) stills animations.
- [ ] **Step 5:** Fix any issues from source; re-verify.
- [ ] **Step 6:** Final commit `chore(careers): lint/test/build green + verification pass`.
- [ ] **Step 7:** Present screenshots to the user for approval. **Do NOT `git push`** until approved (push to `main` auto-deploys to Vercel).

---

## Self-Review (author checklist — completed)

**Spec coverage:** §5 IA → Tasks 13-17. §6 visual (color/type) → Tasks 1,3,5+ (mono in SectionShell/JobCard). §7 motion → motion.ts reuse + ScrollThread (Task 4) + one-move-per-section in each. §8 sections 1-8 → Tasks 5-12. §9 components → Tasks 4-12 (+ deptColor Task 2). §10 mobile → verified per-section + Task 20. §11 conversion (persistent CTA, live counts) → Tasks 5,11,12,14. §12 employer brand → Tasks 8,10,12. §13 placeholders → Task 3 (flagged). §14 tech (files) → all. §15 a11y/perf → Task 20 + contracts. §16 verify → Task 20. ✓

**Placeholder scan:** Visual-section tasks specify contracts (data, layout, classes, motion, acceptance) rather than vague "style it nicely" — acceptable for inline live-preview authoring, and explicitly flagged in the Verification model. Deterministic code (tokens, deptColor, careers.ts, SectionShell, ScrollThread, Index, nav/footer/app edits) has full code. Content PLACEHOLDERs are intentional and flagged. ✓

**Type consistency:** `deptColor()` → `BrandHue`; `hueText/hueBg/hueBgSoft/hueBorder` used consistently; `Pillar/Principle/GrowthTheme/TeamMember/Story` types defined in `careers.ts` and consumed by matching sections; `useCareers().jobs` + `.status === "open"` used in Hero/OpenRoles/Closing consistently; section ids (`why/building/principles/growth/team/roles`) match between Navbar (Task 14), MobileBottomNav (Task 16), and section components. ✓
