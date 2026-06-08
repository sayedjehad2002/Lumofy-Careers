# HR Dashboard — "Intelligence in Motion, Tool-Tuned" Elevation

**Date:** 2026-06-08
**Status:** Approved blueprint → spec
**Owner:** Careers Experience Task Force (Product Design · UX Research · Creative · Employer Brand · Conversion/Ops)
**Scope (this pass):** A cohesive dashboard **design system** + the **Overview "Command Center"** + **shell polish**. Other tabs inherit the elevated primitives; their bespoke redesigns are a documented later phase.

---

## 1. Objective

Elevate the internal HR/admin Dashboard from a competent admin panel to a **world-class workforce-intelligence product** — Linear/Stripe-grade — that speaks the same language as the newly redesigned public site, while respecting *tool* ergonomics (density, scannability, speed). The dashboard is ~80% there functionally; this is an **elevation and unification**, not a teardown. All existing functionality, data, and flows are preserved (decision: "Polish + new intelligence").

## 2. Direction — "Intelligence in Motion, tool-tuned"

Same DNA as the home page, **restraint dialed up**:
1. **One accent** — Sirius blue. Semantic color (`intel-success/warning/danger`) for *status only*. The cosmic palette (chart tokens) for *categorical data series only*. Never decoration.
2. **Mono for all data** — Space Mono on every datum (KPI labels, units, counts, axis ticks, table headers, timestamps, IDs). Sans (Source Sans 3) for prose/headings. This is the precision signal.
3. **Motion signals liveness, not flash** — count-ups, sparkline draw-ins, a calm LIVE pulse, bar-grow on load. No aurora/particles inside the tool. Reduced-motion safe.
4. **Clarity is the premium** — a dashboard earns "premium" through hierarchy and confidence, not spectacle.

## 3. Competitive benchmark

| Product | Borrow | Improve |
|---|---|---|
| **Linear** | calm surfaces, hairline borders, dense rows, keyboard-first | add a live data layer (deltas, sparklines) Linear doesn't have |
| **Stripe Dashboard** | mono numerics, trend deltas on metrics, restrained charts | unify into one semantic token system |
| **Vercel** | dark-first depth, crisp typography | warmer human signals (AI pulse, attention queue) |
| **Ramp** | action-oriented metrics, "what needs attention now" | tie every signal to a deep-linked action |
| **Retool/Notion** | dense information design | a real design system instead of ad-hoc surfaces |

## 4. Audit (what holds it back today)

- **Inconsistent system:** `Panel`/`StatTile`/`Meter` primitives + `intel-*` tokens exist but are applied unevenly — surfaces drift (`bg-card` vs `/50` vs `bg-secondary/30` vs `intel-surface`), borders drift (`/50` vs `/70` vs `intel-border`).
- **No shared data language:** generic sans everywhere; no mono for data.
- **Charts break the system:** hardcoded hex (`#3b82f6`, `#f59e0b`…) in `PipelineFunnel` and others — wrong in dark mode, ignores the semantic palette.
- **Static, not alive:** KPI tiles are flat numbers — no trend, no count-up, no "this is updating."
- **Overview is a summary, not a command center:** plain header, no actionable signal hierarchy.

## 5. Design system foundation

### 5.1 Surface ladder (strict)
One rule set, replacing all drift:
- **App background:** `hsl(var(--intel-surface))`
- **Panel / card:** `hsl(var(--intel-card))` + hairline `border-[hsl(var(--intel-border))]`, `rounded-xl`
- **Hover / raised:** `hsl(var(--intel-card-hover))`
- **Inset / track:** `hsl(var(--intel-gauge-track))`
The `Panel`/`MetricTile` primitives encode these so call sites never hand-pick surfaces.

### 5.2 Typography
- **Data → `font-mono` (Space Mono):** KPI labels (`text-[11px] uppercase tracking-[0.12em]`), values (`tabular-nums`), units, axis ticks, table headers, timestamps.
- **Prose/headings → Source Sans 3.**
- **Scale:** KPI value `text-2xl`→`text-3xl` tabular; section heading `text-sm` mono kicker + `text-lg` sans title; dense body `text-[13px]`.

### 5.3 Color discipline
- Add a single source of truth `CHART_SERIES` (ordered theme-aware HSL refs from `--chart-1..5` + `--intel-success`) in `statusColors.ts`.
- **Replace every hardcoded hex** in dashboard charts with `CHART_SERIES` / `FUNNEL_FILLS` / token refs (start with `PipelineFunnel.tsx`; sweep others touched this pass).
- Status = semantic tones only; categories = `CHART_SERIES`; accent = Sirius.

### 5.4 Motion (tool-tuned, reduced-motion safe)
- KPI **count-up** (reuse `AnimatedCounter`).
- **Sparkline draw-in** (SVG `pathLength` 0→1).
- **LIVE pulse** (the ping dot, used once in the command header).
- Bar/meter **grow** on first in-view.
- Keep the existing tab blur/slide transition. All inherit `MotionConfig reducedMotion="user"`.

### 5.5 Component system
**Elevate existing** (`src/components/careers/dashboard/primitives.tsx`):
- `Panel` — intel-card surface, intel-border, optional mono kicker in header, optional `action`.
- `MetricTile` (evolves `StatTile`) — mono label · big tabular value (count-up) · optional `delta` (`DeltaBadge`) · optional `series` (`Sparkline`) · optional accent · clickable.
- `Meter` — refined (mono value, token track).

**New primitives** (same file or `dashboard/`):
- `Sparkline` — lightweight inline SVG trend (no chart lib); props `{ data: number[], className?, strokeClass? }`; draws a normalized polyline + soft area; draw-in animation; `aria-hidden`.
- `DeltaBadge` — `{ delta: number, suffix?: "%" }` → ▲ green / ▼ neutral-red / "—" flat; never alarming red flashes (gentle).
- `LiveDot` — the pulsing status dot (reduced-motion → static).
- `SectionHeading` — mono kicker + sans title + optional action; standardizes section rhythm.

## 6. Flagship: Overview → Command Center

`src/components/careers/DashboardOverview.tsx` rebuilt. IA top→bottom:

### §1 Command header
- Greeting + full date (mono).
- **Live operating line:** `<LiveDot/> LIVE · {pipelineCount} in pipeline · {attentionTotal} need attention` (mono).
- Keeps/upgrades the attention chips into the Signals queue (below) — header stays clean.
- **Why:** orientation + "mission control" tone. **Outcome:** immediate situational awareness.

### §2 Hero metric row
- 6 `MetricTile`s: Open Positions · Total Applicants · Avg AI Score · Avg Time-to-Hire · To-Interview % · To-Hired %.
- Each: mono label, **count-up** value, and **where a real series exists**, a 14-day `Sparkline` + `DeltaBadge` (this-7d vs prior-7d).
- **Why superior:** static numbers → living, trend-aware intelligence.

### §3 Pipeline command strip
- Recruitment funnel + Candidates-by-stage, on the unified palette, with **stage→stage conversion %** deltas. Refined Panels.

### §4 Signals row (NEW intelligence)
- **Needs Attention** — actionable queue: unreviewed (`status=new`), stalled interviews (`interview` > 7d via `stageEnteredAt`), jobs closing ≤7d (`deadline`), SLA breaches (`stageEnteredAt` > `STAGE_SLA_DAYS`). Each row **deep-links** (`onNavigate` + sets filter). Empty → "All clear."
- **AI Pulse** — Top AI matches + recommendation distribution (refined `Meter`s, `tierSoft`).
- **Momentum** — applications over last 14 days (real, from `appliedDate`) as a `Sparkline` + hire velocity (hires last 30d).

### §5 Activity feed
- Refined recent activity: mono timestamps, semantic status dots, hover rows.

## 7. "New intelligence" — honest derivations (no fabrication)

All from real fields on `Applicant`/`Job`:
- **Daily applications series:** bucket `applicants` by `appliedDate` per day over the last N days → real counts. Powers Total-Applicants sparkline + Momentum.
- **Trend delta:** `sum(last 7d) vs sum(prior 7d)` on the daily series → % change. Shown only where the series is meaningful (≥ some data); otherwise the tile shows the value alone.
- **Open Positions delta:** compare jobs opened in last 7d vs prior 7d (from `postedDate`) when available; else omit.
- **Attention counts:** exactly the real conditions in §4.
- **Thin-data rule:** if a series has < 3 non-zero days, **hide** the sparkline/delta and show the clean metric (never invent a trend). Empty states everywhere read as intentional ("All clear", "No AI analyses yet").

## 8. Shell polish (`src/pages/Dashboard.tsx`)
- Sidebar: mono group labels (`uppercase tracking` already partial → standardize), intel surfaces, refined active pill (keep `layoutId`), search affordance polish.
- Mobile header/tab strip: intel surfaces, mono labels.
- Jobs tab (inline): header + job cards adopt the system (mono meta, intel surfaces, consistent status tones) so no screen looks half-dressed. (Light pass.)

## 9. Mobile
Tool-tuned mobile: KPI grid reflows 2-col; Command header stacks; Signals queue full-width; charts keep min-heights; horizontal tab strip retained (`scrollbar-none`); ≥44px targets.

## 10. Accessibility & performance
- WCAG AA contrast for mono-on-surface and all tones (intel tokens are AA-tuned both themes).
- Sparklines/decorative motion `aria-hidden`; metrics readable as text; no `aria-live` spam on count-ups.
- Reduced-motion freezes count-ups/draw-ins/pulse to final state.
- Sparkline = inline SVG (no recharts) — cheap; charts keep ResponsiveContainer; derivations `useMemo`'d.

## 11. Conversion / ops rationale
Clearer hierarchy + mono data → faster scanning; the **Needs Attention** queue converts "looking" into "acting" (more candidates processed/session); trend deltas build trust the tool is intelligent — the same narrative the careers page sells, now proven internally.

## 12. Why each decision beats today
- Surface ladder → visual coherence (vs drift). 
- Mono data → instant "intelligence" read (vs generic sans). 
- `CHART_SERIES` → dark-mode-correct, on-brand charts (vs broken hex). 
- `MetricTile` w/ delta+sparkline → living KPIs (vs static). 
- Command Center + Signals → action-oriented daily landing (vs passive summary).

## 13. Technical implementation

**Edit:**
- `src/components/careers/dashboard/primitives.tsx` — elevate `Panel`, add `MetricTile`, refine `Meter`.
- `src/components/careers/DashboardOverview.tsx` — rebuild as Command Center.
- `src/components/careers/statusColors.ts` — add `CHART_SERIES`; (no breaking changes to existing exports).
- `src/components/careers/PipelineFunnel.tsx` — replace hardcoded hex with tokens (representative chart fix).
- `src/pages/Dashboard.tsx` — shell + Jobs-tab polish (surfaces, mono labels).
- `src/index.css` — only if a surface utility/token is genuinely missing (prefer existing `intel-*`).

**Create:**
- `src/components/careers/dashboard/Sparkline.tsx`
- `src/components/careers/dashboard/DeltaBadge.tsx`
- `src/components/careers/dashboard/LiveDot.tsx`
- `src/components/careers/dashboard/SectionHeading.tsx`
- `src/lib/dashboardMetrics.ts` — pure helpers (daily series, trend delta, attention items) — unit-tested.

**Reuse:** `AnimatedCounter`, `motion.ts`, recharts (existing charts), `TONE_*`/`tierSoft`/`scoreTone`, `CareersContext`.

## 14. Verification
HR-authorized preview at `/dashboard` (session is HR). Light + dark, desktop (1440) + mobile (375): console clean, Command Center renders, KPIs count up, sparklines/deltas show where data exists and hide when thin, Needs-Attention deep-links work, charts correct in dark mode. `npm run build` + `npm run test` (incl. new `dashboardMetrics` tests) green. **Do not `git push` until approved** (auto-deploys to Vercel).

## 15. Out of scope (later phases)
Bespoke per-tab redesigns of Applicants, Pipeline (kanban), CV Library (10 widgets), EOS Calculator, HR Team — they inherit the elevated primitives now; full redesigns are separate specs. No backend/edge-function/auth changes. No data-model changes.
