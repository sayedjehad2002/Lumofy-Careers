# HR Dashboard "Intelligence in Motion" Elevation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevate the HR dashboard to a cohesive, world-class workforce-intelligence product: a unified design system (surfaces, mono-data type, semantic color, motion, primitives) + a rebuilt Overview "Command Center" with live, honestly-derived intelligence (deltas, sparklines, an action queue) + shell polish.

**Architecture:** Extend the existing `dashboard/primitives.tsx` + `statusColors.ts` token system. Add pure, unit-tested metric helpers (`src/lib/dashboardMetrics.ts`). Rebuild `DashboardOverview.tsx` on the elevated primitives. Other tabs inherit the primitives; their bespoke redesigns are deferred.

**Tech Stack:** Vite + React + TS, Tailwind, framer-motion v12 (`src/lib/motion.ts`), recharts (existing charts), Vitest. Tokens: `--intel-*`, `--chart-1..5`, Space Mono (`font-mono`), Source Sans 3.

**Verification model:** Deterministic logic (`dashboardMetrics`) → real Vitest tests (TDD). Visual components → `npx tsc --noEmit` + `npm run lint` + **live HR-authed preview** at `/dashboard` (light + dark, 1440 + 375), console clean. The dev env may have thin applicant data → every widget must have a graceful empty/thin-data state (sparklines/deltas hidden when `hasTrend` is false). **Do not `git push` until approved** (auto-deploys to Vercel).

**Brand refs:** Sirius = sole accent. `intel-success/warning/danger` = status only. `CHART_SERIES` (chart tokens) = categorical series only. Mono = all data. Motion via `brandEase`, reduced-motion-safe.

---

## Phase 0 — System foundation

### Task 1: `dashboardMetrics.ts` — pure metric helpers (TDD)

Honest, testable derivations from real `Applicant`/`Job` fields. `now` is a parameter (no `Date.now()` inside) for deterministic tests.

**Files:**
- Create: `src/lib/dashboardMetrics.ts`
- Test: `src/lib/dashboardMetrics.test.ts`

- [ ] **Step 1: Write failing tests** (`src/lib/dashboardMetrics.test.ts`):

```ts
import { describe, it, expect } from "vitest";
import { dailyCounts, trendDeltaPct, hasTrend } from "./dashboardMetrics";

const DAY = 86400000;
const NOW = 1_700_000_000_000; // fixed reference

describe("dailyCounts", () => {
  it("buckets ISO dates into the last N day-slots, newest last", () => {
    const dates = [
      new Date(NOW).toISOString(),            // age 0 → last slot
      new Date(NOW - 1 * DAY).toISOString(),  // age 1
      new Date(NOW - 1 * DAY).toISOString(),  // age 1 (two on same day)
      new Date(NOW - 13 * DAY).toISOString(), // age 13 → first slot
      new Date(NOW - 99 * DAY).toISOString(), // out of window → ignored
    ];
    const out = dailyCounts(dates, 14, NOW);
    expect(out).toHaveLength(14);
    expect(out[13]).toBe(1); // today
    expect(out[12]).toBe(2); // yesterday
    expect(out[0]).toBe(1);  // 13 days ago
    expect(out.reduce((a, b) => a + b, 0)).toBe(4); // the 99d one excluded
  });
  it("ignores invalid dates", () => {
    expect(dailyCounts(["nope", ""], 7, NOW).reduce((a, b) => a + b, 0)).toBe(0);
  });
});

describe("trendDeltaPct", () => {
  it("compares recent half vs prior half as a percent", () => {
    // prior 7 sum = 10, recent 7 sum = 15 → +50%
    expect(trendDeltaPct([2,2,2,2,1,1,0, 3,3,3,2,2,1,1])).toBe(50);
  });
  it("returns null when the prior half is empty (no baseline)", () => {
    expect(trendDeltaPct([0,0,0,0,0,0,0, 1,2,3,0,0,0,0])).toBeNull();
  });
});

describe("hasTrend", () => {
  it("is true only with >= 3 non-zero days", () => {
    expect(hasTrend([0,1,0,2,0,3,0])).toBe(true);
    expect(hasTrend([0,0,1,0,1,0,0])).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL.** Run: `npm run test -- dashboardMetrics` → Expected: FAIL ("Cannot find module './dashboardMetrics'").

- [ ] **Step 3: Implement** (`src/lib/dashboardMetrics.ts`):

```ts
// Pure, testable derivations for the dashboard's "live intelligence" widgets.
// Every value comes from real Applicant/Job fields. `now` is injected so the
// helpers are deterministic under test (no Date.now() inside).
import type { Applicant, Job } from "@/types/careers";
import { STAGE_SLA_DAYS } from "@/types/careers";

const DAY = 86_400_000;

/** Count ISO dates into the last `days` day-buckets (oldest first, newest last). */
export function dailyCounts(isoDates: string[], days: number, now: number): number[] {
  const out = new Array(days).fill(0);
  for (const iso of isoDates) {
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) continue;
    const age = Math.floor((now - t) / DAY);
    if (age >= 0 && age < days) out[days - 1 - age] += 1;
  }
  return out;
}

/** Percent change of the recent half vs the prior half of a series. null if no baseline. */
export function trendDeltaPct(series: number[]): number | null {
  const half = Math.floor(series.length / 2);
  if (half === 0) return null;
  const prior = series.slice(0, half).reduce((a, b) => a + b, 0);
  const recent = series.slice(series.length - half).reduce((a, b) => a + b, 0);
  if (prior === 0) return null;
  return Math.round(((recent - prior) / prior) * 100);
}

/** A series is "trend-worthy" only with enough signal (avoids inventing trends from noise). */
export function hasTrend(series: number[]): boolean {
  return series.filter((v) => v > 0).length >= 3;
}

export type Attention = {
  unreviewed: number;
  stalledInterviews: number;
  jobsClosingSoon: number;
  slaBreaches: number;
};

/** The actionable "Needs attention" counts — all real conditions. */
export function computeAttention(applicants: Applicant[], jobs: Job[], now: number): Attention {
  const ageDays = (iso?: string) => (now - new Date(iso || 0).getTime()) / DAY;
  return {
    unreviewed: applicants.filter((a) => a.status === "new").length,
    stalledInterviews: applicants.filter(
      (a) => a.status === "interview" && ageDays(a.stageEnteredAt || a.appliedDate) > 7
    ).length,
    jobsClosingSoon: jobs.filter((j) => {
      if (j.status !== "open" || !j.deadline) return false;
      const d = (new Date(j.deadline).getTime() - now) / DAY;
      return d >= 0 && d <= 7;
    }).length,
    slaBreaches: applicants.filter((a) => {
      const sla = (STAGE_SLA_DAYS as Record<string, number>)[a.status];
      return sla ? ageDays(a.stageEnteredAt || a.appliedDate) > sla : false;
    }).length,
  };
}
```

- [ ] **Step 4: Run tests — expect PASS.** Run: `npm run test -- dashboardMetrics` → Expected: PASS (6 tests).

- [ ] **Step 5: Commit.**
```bash
git add src/lib/dashboardMetrics.ts src/lib/dashboardMetrics.test.ts
git commit -m "feat(dashboard): add tested dashboardMetrics helpers (series, delta, attention)"
```

---

### Task 2: `CHART_SERIES` — unified categorical palette

**Files:** Modify `src/components/careers/statusColors.ts` (append; no breaking changes).

- [ ] **Step 1: Append** to `statusColors.ts`:

```ts
/**
 * Ordered, theme-aware color VALUES (not classes) for categorical chart series
 * (recharts `fill`/`stroke`, inline `backgroundColor`). Single source of truth —
 * replaces hardcoded hex like "#3b82f6" that break in dark mode.
 */
export const CHART_SERIES = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];
```

- [ ] **Step 2: Type-check.** Run: `npx tsc --noEmit` → Expected: no errors.

- [ ] **Step 3: Commit.**
```bash
git add src/components/careers/statusColors.ts
git commit -m "feat(dashboard): add theme-aware CHART_SERIES palette"
```

---

### Task 3: Elevate + extend dashboard primitives

Consolidate all primitives in one file (one import source). Elevate `Panel`/`StatTile`→`MetricTile`/`Meter`; add `Sparkline`, `DeltaBadge`, `LiveDot`, `SectionHeading`. Keep `StatTile` as a thin alias so existing imports don't break.

**Files:** Modify `src/components/careers/dashboard/primitives.tsx` (full rewrite below).

- [ ] **Step 1: Replace file contents:**

```tsx
import { type ReactNode, type ComponentType } from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import AnimatedCounter from "@/components/careers/AnimatedCounter";
import { brandEase, prefersReducedMotion } from "@/lib/motion";

/**
 * Dashboard primitives — the shared "Intelligence in Motion, tool-tuned" language:
 * calm intel-token surfaces, hairline borders, mono data, one Sirius accent,
 * restrained motion. Reused across every dashboard screen for consistency.
 */
type IconType = ComponentType<{ className?: string }>;

const PANEL = "rounded-xl border border-[hsl(var(--intel-border))] bg-[hsl(var(--intel-card))]";

/** Calm surface: intel-card, hairline border, optional header with mono kicker. */
export function Panel({
  title, icon: Icon, action, children, className = "", bodyClassName = "p-4",
}: {
  title?: string; icon?: IconType; action?: ReactNode; children: ReactNode;
  className?: string; bodyClassName?: string;
}) {
  return (
    <section className={`h-full ${PANEL} ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-[hsl(var(--intel-border))] px-4 py-2.5">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
            {title}
          </div>
          {action}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

/** Tiny inline-SVG trend line. Color via currentColor (pass a text-* className). */
export function Sparkline({ data, className = "text-primary" }: { data: number[]; className?: string }) {
  if (!data.length) return null;
  const w = 80, h = 24, p = 2;
  const max = Math.max(...data, 1), min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = p + (i / Math.max(1, data.length - 1)) * (w - 2 * p);
    const y = h - p - ((v - min) / range) * (h - 2 * p);
    return [x, y] as const;
  });
  const line = pts.map((pt, i) => `${i ? "L" : "M"}${pt[0].toFixed(1)},${pt[1].toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${h} L${pts[0][0].toFixed(1)},${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true" className={`h-6 w-20 ${className}`}>
      <path d={area} className="fill-current opacity-[0.08]" stroke="none" />
      <motion.path
        d={line} fill="none" className="stroke-current" strokeWidth={1.5}
        strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
        viewport={{ once: true }} transition={{ duration: 0.8, ease: brandEase }}
      />
    </svg>
  );
}

/** ▲ up (success) / ▼ down (muted, never alarming) / — flat. Hidden when delta is null. */
export function DeltaBadge({ delta, suffix = "%" }: { delta: number | null | undefined; suffix?: string }) {
  if (delta == null) return null;
  const flat = delta === 0, up = delta > 0;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  const cls = up ? "text-[hsl(var(--intel-success))]" : "text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-0.5 font-mono text-[11px] ${cls}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {Math.abs(delta)}{suffix}
    </span>
  );
}

/** Pulsing live status dot (static under reduced motion). */
export function LiveDot({ className = "" }: { className?: string }) {
  const reduced = prefersReducedMotion();
  return (
    <span className={`relative flex h-1.5 w-1.5 ${className}`}>
      {!reduced && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />}
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
    </span>
  );
}

/** Mono kicker + sans title, standard section rhythm. */
export function SectionHeading({ kicker, title, action }: { kicker?: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        {kicker && <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">{kicker}</p>}
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      </div>
      {action}
    </div>
  );
}

/** Elevated KPI: mono label (+ optional DeltaBadge), big tabular value, optional Sparkline. */
export function MetricTile({
  label, value, delta, series, seriesClassName, hint, onClick,
}: {
  label: string; value: ReactNode; delta?: number | null; series?: number[];
  seriesClassName?: string; hint?: string; onClick?: () => void;
}) {
  const interactive = !!onClick;
  const Tag: "button" | "div" = interactive ? "button" : "div";
  return (
    <Tag
      {...(interactive ? { onClick, type: "button" as const } : {})}
      className={`flex h-full flex-col gap-1.5 ${PANEL} px-4 py-3.5 text-left transition-colors ${
        interactive ? "hover:bg-[hsl(var(--intel-card-hover))] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
        <DeltaBadge delta={delta} />
      </div>
      <span className="text-2xl font-semibold tabular-nums leading-none text-foreground">{value}</span>
      {series && series.length > 0 ? (
        <Sparkline data={series} className={seriesClassName || "text-primary"} />
      ) : hint ? (
        <span className="font-mono text-[11px] text-muted-foreground">{hint}</span>
      ) : null}
    </Tag>
  );
}

/** Back-compat alias — existing call sites importing StatTile keep working. */
export const StatTile = MetricTile;

/** Labelled progress meter (token track, mono value). */
export function Meter({
  label, value, pct, barColor, labelColor = "text-muted-foreground",
}: {
  label: string; value: ReactNode; pct: number; barColor: string; labelColor?: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className={`font-medium ${labelColor}`}>{label}</span>
        <span className="font-mono tabular-nums text-muted-foreground">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[hsl(var(--intel-gauge-track))]">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ scaleX: 0 }} whileInView={{ scaleX: Math.max(0, Math.min(100, pct)) / 100 }}
          viewport={{ once: true }} transition={{ duration: 0.7, ease: brandEase }}
          style={{ transformOrigin: "left", width: "100%" }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check.** Run: `npx tsc --noEmit` → Expected: no errors (note: `StatTile` alias keeps `DashboardOverview` valid until Task 5).
- [ ] **Step 3: Lint touched.** Run: `npx eslint src/components/careers/dashboard/primitives.tsx` → fix any errors.
- [ ] **Step 4: Preview smoke** — reload `/dashboard`, confirm Overview still renders (tiles now mono-labelled), console clean.
- [ ] **Step 5: Commit.**
```bash
git add src/components/careers/dashboard/primitives.tsx
git commit -m "feat(dashboard): elevate primitives + add Sparkline/DeltaBadge/LiveDot/SectionHeading/MetricTile"
```

---

## Phase 1 — Command Center Overview

### Task 4: Rebuild `DashboardOverview` as the Command Center

**Files:** Modify `src/components/careers/DashboardOverview.tsx`.

**Contract (build to this; verify in live HR preview):**
- **Data:** props `jobs`, `applicants`, `onNavigate`. Compute with `useMemo`: `now` once at render; `computeAttention(applicants, jobs, now)`; `appliedSeries = dailyCounts(applicants.map(a=>a.appliedDate), 14, now)`; per-KPI series where meaningful; `trendDeltaPct`/`hasTrend` gate deltas+sparklines.
- **§1 Command header:** greeting + full date (mono); operating line `<LiveDot/> LIVE · {inPipeline} in pipeline · {attentionTotal} need attention` (mono). `inPipeline` = applicants not in terminal states (`hired`/`rejected`).
- **§2 Hero metric row** (`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6`): 6 `MetricTile`s — Open Positions, Total Applicants (series=`appliedSeries`, delta=`trendDeltaPct(appliedSeries)` only if `hasTrend`), Avg AI Score, Avg Time-to-Hire, To-Interview %, To-Hired %. Numeric values use `AnimatedCounter` (with suffix where needed); "—" when null. Each `onClick` → `onNavigate`.
- **§3 Pipeline strip** (2-col `Panel`s): recruitment funnel (token fills) + Candidates-by-stage chart (existing recharts, `hsl(var(--primary))`). Add stage→stage conversion % to the funnel rows.
- **§4 Signals row** (3-col on lg): 
  - **Needs Attention** `Panel`: rows for unreviewed / stalled interviews / jobs closing / SLA breaches with counts + semantic tone + chevron; click → `onNavigate('applicants'|'pipeline'|'jobs')`. If all zero → "All clear" calm state.
  - **AI Pulse** `Panel`: Top AI matches (existing) condensed + recommendation `Meter`s.
  - **Momentum** `Panel`: `Sparkline` of `appliedSeries` ("applications · 14d") + hire velocity (hires last 30d) + avg time-to-hire.
- **§5 Activity feed** `Panel`: existing recent activity, mono timestamps, semantic status dots.
- **Style:** all surfaces via primitives (no ad-hoc `bg-card/50`); mono for every datum; one entry fade (keep `motion.div`).
- **Empty/thin states:** no applicants → KPIs show 0/"—", sparklines/deltas hidden, attention "All clear", panels show existing "No … yet" copy.
- **Acceptance:** reads as a command center; KPIs count up; sparklines draw where data exists and vanish when thin; attention rows deep-link; dark-mode correct; console clean.

**Steps:**
- [ ] Rebuild `DashboardOverview.tsx` per contract (import `MetricTile, Panel, Meter, Sparkline, LiveDot, SectionHeading` from primitives; `dailyCounts, trendDeltaPct, hasTrend, computeAttention` from `@/lib/dashboardMetrics`; reuse `AnimatedCounter`, `TONE_*`, `tierSoft`).
- [ ] `npx tsc --noEmit` → no errors.
- [ ] Preview `/dashboard` (overview): screenshot light+dark @1440 and @375; `preview_console_logs` clean; click a Needs-Attention row → navigates.
- [ ] Fix from source to match contract.
- [ ] Commit: `git add -A && git commit -m "feat(dashboard): rebuild Overview as Command Center (live KPIs, signals, attention queue)"`

---

## Phase 2 — Charts + shell polish

### Task 5: Fix `PipelineFunnel` chart colors (representative hex→token fix)

**Files:** Modify `src/components/careers/applicants/PipelineFunnel.tsx`.

- [ ] **Step 1:** Read the file; replace the hardcoded `FUNNEL_COLORS`/hex array (e.g. `["#3b82f6","#f59e0b","#10b981","#8b5cf6","#22c55e"]`) with `import { FUNNEL_FILLS } from "@/components/careers/statusColors"` and use `FUNNEL_FILLS[i]` for each stage fill. Remove the local hex array.
- [ ] **Step 2:** `npx tsc --noEmit` → no errors.
- [ ] **Step 3:** Preview the Applicants → funnel view in **dark mode**; confirm bars use brand/theme colors (not raw hex), readable.
- [ ] **Step 4:** Commit `feat(dashboard): theme-aware funnel colors (no hardcoded hex)`.

---

### Task 6: Dashboard shell + Jobs-tab polish

**Files:** Modify `src/pages/Dashboard.tsx`.

- [ ] **Step 1: Sidebar/header → system surfaces + mono labels.** Sidebar group labels: ensure `font-mono uppercase tracking-[0.12em]`. Sidebar container + mobile header: use `bg-[hsl(var(--intel-card))]`/`border-[hsl(var(--intel-border))]` to match panels (keep `dark:particles-bg`? — remove particles from the sidebar for tool restraint, replace with plain intel surface). Keep the `layoutId` active pill.
- [ ] **Step 2: Jobs tab header → mono + SectionHeading rhythm.** The "Manage Jobs" header keeps its icon; add a mono kicker `JOBS · {n} vacancies`. Job-row meta (location/type/applicants) → `font-mono text-[11px] uppercase tracking-wider`. Status chips keep `intel-success` tone (already correct). Surfaces → `bg-[hsl(var(--intel-card))] border-[hsl(var(--intel-border))]`.
- [ ] **Step 3:** `npx tsc --noEmit`; `npm run lint` (touched) clean.
- [ ] **Step 4:** Preview `/dashboard` across tabs (Overview, Jobs, Applicants, Pipeline) light+dark — surfaces consistent, sidebar refined, no regressions; console clean.
- [ ] **Step 5:** Commit `feat(dashboard): shell + Jobs-tab polish on the unified system`.

---

## Phase 3 — Verify & ship-ready

### Task 7: Full verification pass

**Files:** none (verify + fix from source).

- [ ] **Step 1:** `npm run test` → all green (incl. `dashboardMetrics`).
- [ ] **Step 2:** `npm run build` → succeeds.
- [ ] **Step 3:** `npx eslint` the touched files → no new errors in them.
- [ ] **Step 4:** Preview `/dashboard` HR-authed: Overview (light+dark, 1440+375) — KPIs count up; sparklines draw where data exists / hidden when thin; attention deep-links; Jobs/Applicants/Pipeline surfaces consistent; charts dark-mode-correct; reduced-motion (emulate) freezes animations; console clean. Capture screenshots.
- [ ] **Step 5:** Fix any issues from source; re-verify.
- [ ] **Step 6:** Final commit `chore(dashboard): lint/test/build green + verification pass`.
- [ ] **Step 7:** Present screenshots; **do NOT `git push`** until user approves.

---

## Self-Review (author checklist — completed)

**Spec coverage:** §5.1 surfaces → Task 3 (`PANEL` const) + Task 6. §5.2 mono type → Task 3 (primitives) + Tasks 4,6. §5.3 color/`CHART_SERIES` → Tasks 2,5. §5.4 motion → Task 3 (Sparkline/Meter/LiveDot) + Task 4. §5.5 components → Task 3. §6 Command Center (§1-§5) → Task 4. §7 honest intelligence → Task 1 (+ gating in Task 4). §8 shell → Task 6. §9 mobile / §10 a11y+perf → contracts + Task 7. §11-12 rationale → reflected in Task 4 (attention deep-links, deltas). §13 files → all tasks. §14 verify → Task 7. ✓

**Placeholder scan:** Deterministic code (metrics+tests, CHART_SERIES, full primitives) is complete in-plan; the Overview rebuild is a precise contract verified against the running app (per the stated verification model); no vague "style it nicely" without acceptance criteria. ✓

**Type consistency:** `dailyCounts/trendDeltaPct/hasTrend/computeAttention` signatures match between Task 1 def and Task 4 use; `MetricTile` props (`label,value,delta,series,seriesClassName,hint,onClick`) consistent between Task 3 def and Task 4 use; `StatTile = MetricTile` alias preserves existing imports until Task 4; `CHART_SERIES`/`FUNNEL_FILLS` names consistent (Tasks 2,5). ✓
