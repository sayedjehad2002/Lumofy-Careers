# Dashboard Overview redesign — design

**Date:** 2026-08-10
**Status:** approved (visual mockup signed off)
**Surface:** `/dashboard/overview` — `src/components/careers/DashboardOverview.tsx`

## Goal

Turn the Overview from a wall of 14 competing blocks into 8, where every number
is provable from the database and the page opens with the one fact that should
drive the next hour of work.

Success looks like: within ten seconds of landing, an HR user knows what is
waiting for them, and a hiring manager can see how the pool is doing without
opening anything.

## Why

Measured against the live database on 2026-08-10 (367 applications):

| Problem | Evidence |
|---|---|
| Too many blocks | 6 metric tiles + 8 panels, none dominant |
| The funnel is one bar | 340 of 367 (93%) sit in `new`, so 5 stacked bars carry one signal |
| **Rejected candidates were missing** | Pipeline listed New/Reviewing/Shortlisted/Interview/Hired and dropped 7 `rejected`, while captioned "share of all 367" |
| KPIs built on 1–9 records | "Time to hire 8d" is one hire (the tile said so itself); "Reached interview 2%" is 9 people |
| Duplicated numbers | Momentum repeated "367 total applicants" from a tile two blocks above; "0 hired · 30d" is permanent given 1 hire ever |
| A firehose | Recent Activity showed identical "X applied" rows — 82 arrived in 7 days — duplicating the Applicants list's default sort |
| The best fact was hidden | **58 fast-track candidates have never been reviewed.** Not shown anywhere |
| Top-5 role list hid the urgent half | 4 open roles have exactly 1 applicant (GTM Manager, QC Assurance, Sales Intern, ELearning Developer) |
| Score compression | Only 19 candidates score ≥95, so a "Top matches" board ranking 99 vs 97 is noise |

## Layout

Four tiles and four panels — eight blocks, down from six tiles and eight panels.
Top to bottom:

1. **Header** — title, live indicator, and a one-sentence state of play.
2. **Four metric tiles** — Open roles · Applications · Never opened · Scored by AI.
3. **Where everyone stands + Candidate quality** — one panel, two horizontal strips.
4. **Act on these** — five action rows, full width.
5. **Applications per open role** — horizontal bar chart (left, half width).
6. **Best candidates you haven't reviewed** — filterable list (right, half width).

Blocks 5 and 6 sit side by side on `lg` and stack below it.

## Metric definitions

All derivations are pure functions over the `Applicant[]` / `Job[]` already in
`CareersContext`. No new network calls. `now` is injected so they stay testable.

### Header sentence

> "{unreviewed} applications have never been opened. The oldest has been waiting since {date}."

- `unreviewed` = `status === "new"`
- oldest = `min(appliedDate)` among those, formatted `d MMMM`
- If `unreviewed === 0`, the sentence becomes "Everything received has been
  reviewed." and the amber tile styling drops away.

### Tiles

| Tile | Definition | Sub-line |
|---|---|---|
| Open roles | `jobs.filter(status === "open" && !archivedAt)` | count of those with ≤4 applications |
| Applications | `applicants.length` | applications in the last 7 days |
| Never opened | `status === "new"` | share of total, rounded |
| Scored by AI | `aiAnalysis != null` | count still awaiting |

"Never opened" is the only tile with emphasis styling (amber border + amber
value) and only while the count is above zero.

**Removed:** Avg AI score, Reached interview, Time to hire. Each was derived from
too few records to mean anything, and the page already reports quality in the
strip below.

### Where everyone stands (pipeline strip)

A single horizontal bar segmented by **all six** statuses, in pipeline order:
`new → reviewing → shortlisted → interview → rejected → hired`.

**Invariant: the segments must sum to `applicants.length`.** This is the bug that
was there before — any status missing from the map silently shrinks the bar while
the caption still claims to cover everyone. Implementation counts by iterating
`APPLICANT_STATUSES` from `src/types/careers.ts` rather than a hand-written list,
so a new status can never be dropped.

Legend below the bar lists every status with its count. Segments narrower than
~1% still render at a 2px minimum so a status with 1 candidate is visible.

### Candidate quality (quality strip)

Same treatment, over **scored applications only**:

| Band | Range |
|---|---|
| Top | `fitScore >= 85` |
| Strong | `70–84` |
| Moderate | `50–69` |
| Weak | `< 50` |

Caption states the population: "of the {scored} scored". Unscored candidates are
never folded in as a band — that was the mistake the CV Library Insights donut
made with its "Unknown" slice.

### Act on these

Five rows, each `count · label · verb →`, each navigating somewhere useful.

| Row | Definition |
|---|---|
| Fast-track never reviewed | `aiAnalysis.recommendation === "Fast-Track to Interview" && status === "new"` |
| Applications never opened | `status === "new"` |
| Waiting for AI analysis | `aiAnalysis == null` |
| Interviews with no movement for a week | `status === "interview" && stageEnteredAt older than 7 days` |
| "Not recommended", still in New | `aiAnalysis.recommendation === "Not Recommended" && status === "new"` |

**Navigation is unfiltered, and this spec previously claimed otherwise.** Every row — and
every tile — calls `onNavigate("applicants")`, which switches tab and nothing more: the
prop signature `(tab: string) => void` carries no filter. So clicking "58 fast-track never
reviewed" lands on the same undifferentiated list as clicking "340 never opened".

That is a pre-existing limitation of the callback, not something this redesign introduced,
but the page now makes the gap obvious by naming five precise populations and then
delivering one generic destination. Passing a filter through is a genuine follow-up: it
means widening `onNavigate` and teaching the Applicants view to accept an incoming filter.
Out of scope here, and deliberately no longer promised above.

Rows with a zero count are hidden — an empty action list means nothing is
waiting, which is the correct thing to show. If every row is zero, the panel
renders a single "Nothing needs attention" line.

The first row is visually lifted (tinted background) because it is the highest-value
action on the page.

These counts deliberately overlap (a fast-track candidate is also unreviewed).
They are five different ways in, not a partition, and must never be summed into a
headline — the existing `candidatesNeedingAction` comment in `dashboardMetrics.ts`
records why.

### Applications per open role

Horizontal bars, one per open non-archived job, sorted by count descending.
All roles are shown, not a top-5 — the short bars are the reason the chart exists.

Colour by volume:

| Applications | Colour |
|---|---|
| ≤ 4 | `--chart-4` (pink) — needs sourcing |
| 5–9 | `--chart-5` (amber) |
| ≥ 10 | `--chart-1` (blue) — healthy |

Rejected as an option: a pie/donut. With 16 roles the four that matter are slivers
under 1% with colliding labels — the same failure mode the Sources donut had.

Role names get a fixed-width column and ellipsis with a `title` tooltip; bars have
a 1.5% minimum width so a 1-applicant role is still visible.

### Best candidates you haven't reviewed

Candidates with `status === "new"` **and** an `aiAnalysis`, sorted by `fitScore`
descending, capped at 6 rows.

- **Job filter**: a `<Select>` in the panel's `action` slot listing "All roles"
  plus every open role that has at least one matching candidate. Filtering is
  client-side over data already loaded.
- Each row: initials avatar, name, role applied for, score.
- Clicking a row opens that candidate.
- Empty state (filter matches nobody): "No unreviewed candidates for this role."

The filter selection is component state, not URL state — it is a browsing aid, not
a destination worth linking to.

## Components

| File | Change |
|---|---|
| `src/components/careers/DashboardOverview.tsx` | Rewritten around the new layout |
| `src/lib/dashboardMetrics.ts` | Extend with the new derivations; keep `dailyCounts`, `trendDeltaPct`, `hasTrend`, `computeAttention` |
| `src/components/careers/dashboard/primitives.tsx` | Reused unchanged — `Panel`, `MetricTile` |

New pure helpers in `dashboardMetrics.ts`, all `(applicants, jobs, now) => …`:

- `statusBreakdown(applicants)` → ordered `{ status, label, count }[]` covering every status
- `qualityBands(applicants)` → `{ band, count }[]` plus `scored`
- `actionQueue(applicants, now)` → the five rows with counts
- `applicationsPerRole(applicants, jobs)` → `{ jobId, title, count }[]`, open roles only
- `topUnreviewed(applicants, jobId?)` → sorted, capped list

Keeping these pure and out of the component is what makes them testable without
rendering, matching the existing file's stated intent.

Small presentational pieces stay local to `DashboardOverview.tsx` (`StatusStrip`,
`ActionRow`, `RoleBars`, `UnreviewedList`) — they have no reuse outside this screen,
and a file per 20-line component would cost more than it saves.

## Design tokens

Lumofy tokens only, no raw hex:

- Blue `--chart-1` / `--primary`, green `--chart-2`, purple `--chart-3`,
  pink `--chart-4`, amber `--chart-5`
- Surfaces `--card`, borders `--border`, text `--foreground` / `--muted-foreground`
- Warning emphasis `--intel-warning`, success `--intel-success`
- Numerals use `tabular-nums` so counts don't jitter between refreshes
- Both light and dark must be checked — the strips sit on `--card`, which inverts

## Edge cases

| Case | Behaviour |
|---|---|
| No applicants at all | Tiles read 0; strips replaced by "No applications yet"; action list shows the nothing-waiting line |
| No scored applicants | Quality strip replaced by "No application has been scored yet" |
| No open roles | Role chart replaced by "No open roles" |
| Every applicant reviewed | Header sentence flips positive; amber tile styling drops |
| A single status holds 100% | Bar renders as one segment; legend still lists all six with zeros |
| Very long role titles | Ellipsis + `title` tooltip |

## Testing

Unit tests against `dashboardMetrics.ts` (Vitest, matching the existing suite):

1. `statusBreakdown` **sums to the applicant count** and includes every status in
   `APPLICANT_STATUSES` even at zero — the regression that hid 7 rejected candidates.
2. `qualityBands` counts only scored applicants and sums to `scored`.
3. `actionQueue` — fast-track row counts only `status === "new"`; stalled interviews
   respect the 7-day boundary; zero-count rows are omitted.
4. `applicationsPerRole` excludes closed and archived jobs, and includes open roles
   with zero applications.
5. `topUnreviewed` excludes anything not `new`, excludes unscored, sorts descending,
   and honours the job filter.

Render test on the component: the header sentence reflects the unreviewed count,
and the role filter narrows the candidate list.

## Out of scope

- Stage-history / true funnel conversion — needs an `applicant_stage_events` table
  that does not exist. Time-to-hire stays out until it does.
- Changing any other dashboard tab.
## Correction: `computeAttention` had no other callers

This spec and its plan both asserted that `computeAttention`, `hasTrend` and
`trendDeltaPct` should be kept because "they have other callers". A repo-wide search
after the rewrite proved that false — the old Overview was their only consumer, so this
change orphaned all three. They are deleted rather than left as an unused "attention"
concept sitting beside the `actionQueue` that replaced it, which is exactly the kind of
duplicate-vocabulary confusion this redesign set out to remove.

The assumption should have been verified with a search before it was written down.
