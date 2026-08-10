# Applicants page redesign — design

**Date:** 2026-08-10
**Status:** approved (design signed off in conversation; visual direction chosen from mockups)
**Surface:** `/dashboard/applicants` — `src/components/careers/ApplicantsListView.tsx` and `src/components/careers/applicants/*`

## Goal

Turn the Applicants page into one thing it does well — **the searchable roster** — so it
stops competing with Pipeline (moving people through stages) and Overview (daily state
of play).

Success looks like: you can find any candidate or slice of candidates in a few seconds,
see enough to judge them without opening anything, and act on the whole slice at once.

## Why

The page is 2,143 lines across 10 files with **zero test coverage**. It carries eight
tabs, six of which do not survive contact with the data. Measured against production on
2026-08-10 (367 applications):

| Problem | Evidence |
|---|---|
| **The score filter returns a confidently wrong shortlist** | `AdvancedFilters.tsx:178` guards on `score != null`, so all **119 unscored** candidates pass every score range. Set 85–100 and they are all still listed. |
| "Avg time to hire" measures something else | `TimeToHire.tsx:37-42` computes `now − appliedDate` for hired candidates. With 1 hire ever, it reports one record's age and grows by a day, every day. |
| "SLA breaches" resurrects a deleted alarm | `TimeToHire.tsx:31,53` flags `new` past 3 days; the real average is 27, so it renders ~340 in red. `ApplicantsListView.tsx:121-125` is a written-down decision to kill exactly this signal for firing on ~86% of rows. |
| Re-Rank's headline feature cannot execute | `SmartRankingRefresh.tsx:338` filters to one job, so `wasAnalyzedForDifferentJob` (`:65`) is always false. 696 lines; results held in state and discarded on tab switch. |
| Activity invents timestamps | `ActivityFeed.tsx:72` stamps note #1 as "the day after they applied" and renders a precise clock time. `notes` is a bare `string[]` with no timestamps. |
| Funnel restates six numbers as twenty-one | `PipelineFunnel.tsx:19-33`. Its "drop-off" (`:102`) is arithmetically just the count in each stage, printed as **−340** in red. |
| Tabs are silently job-scoped | `Dashboard.tsx:569` passes pre-filtered applicants; the job selector lives only inside the list tab. |
| Nothing is memoized or virtualized | 367 rows, each with a Radix `Select` and 6 items, all re-animating on every keystroke. |

Data reality that shaped the scope: **0** of 367 have a rating, **2** have a source,
and **13** of 305 notes are human-written (the other 292 are "Added from CV Library on …").
Three tabs were built on data that does not exist.

## Decisions taken

| Question | Decision |
|---|---|
| What is this page for? | **The searchable roster** — find people and act on them. Analytics live on Overview; stage-moving lives on Pipeline. |
| The two surviving tabs | **No tab strip at all.** Compare becomes an action on a selection; Sources moves to Overview. |
| Bulk actions | **Move to stage** and **Run AI analysis**, plus **Compare** as a read-only selection action. |
| Layout | **Two-line rows** (mockup option B) — the same language as the Jobs list and Pipeline cards. |
| Inline status control | **Kept.** See the correction below. |

### Correction: the status control stays on the row

The design as first presented moved stage changes into the `⋮` menu, on the grounds that
the status badge and the 128px `Select` two lines apart were duplicate vocabulary. The user
uses that control daily and asked to keep it.

The duplication complaint was still valid, so the resolution is to **merge the two rather
than delete one**: the status pill *is* the control. It displays the current stage and opens
the stage menu on click. One element, both jobs, one click to change — and the badge/dropdown
pair is gone.

## Layout

Top to bottom, one column, no tabs:

1. **Header** — title and one measured sentence.
2. **Filter chips** — five, each a real filter.
3. **Toolbar** — search, job filter, sort.
4. **The list** — one bordered container, divided two-line rows.
5. **Bulk bar** — floating, appears on selection.

### Header sentence

> "367 applications from about 237 people. 303 have never been opened."

"About" is deliberate and must not be made precise: 115 candidates have no email and
cannot be deduplicated, so 237 is the distinct count among the 252 who do have one.
Printing an exact headcount would be a number we cannot stand behind.

### Filter chips

Counts and filtering read from **one predicate map**, the pattern established by
`pipelineMetrics.TRIAGE_FILTERS` — so a chip can never claim 119 and then show a different
set. A test locks this.

| Chip | Definition |
|---|---|
| All | everything in scope |
| Never opened | `status === "new"` |
| Unscored | `aiAnalysis == null` |
| Top match | `fitScore >= 85` |
| No email | `!email?.trim()` |

The "No email" chip absorbs the `ContactRecoveryBanner`, which currently renders *above*
the `<h1>` and shouts over the page title. Same recovery action, reachable from the chip.

Chips with a zero count still render (unlike the Jobs page) because these are standing
facets rather than exceptions — a zero here is informative.

### The row

```
[✓] [avatar]  Name                    [Stage ▾]              97   [⋮]
              Full Stack Intern · applied 6 Aug · 32d waiting
```

- **Name** is a real `<a href>` to `/dashboard/applicants/<id>?from=applicants`, so
  right-click "open in new tab" works.
- **Stage pill doubles as the control** (see the correction above).
- **Score renders once.** Today it appears three times — the number, the tier badge, and
  the rank medal — all derived from `fitScore` by the same 85/70/50 cuts. One pill,
  coloured by `scoreTone()`, which already exists in `statusColors.ts:115` and is unused.
- **`fitScore: 0` currently renders both "0" and "AI Pending"** — the pill guards on
  `score != null` (`:456`) and the badge on `!score` (`:480`). One guard, on presence.
- **Days waiting** tinted by `slaState` against the stage's own SLA, not a flat rule.
- Status colours come from `STATUS_COLORS`, not the raw `bg-blue-500/20 text-blue-400`
  literals in `APPLICANT_STATUSES` — `text-blue-400` on a light card fails contrast.
- The row is `role="button"` with `tabIndex` and an `onKeyDown`, and carries an explicit
  `aria-label`; today it is a bare `div` with an `onClick`, unreachable by keyboard.

### Bulk actions

Checkbox per row; floating bar on selection, same component pattern as the Pipeline board.

- **Move to stage** — one request through the `applicantIds` batch branch of
  `update-applicant` (already deployed), not N sequential calls.
- **Run AI analysis** — the unlock. 119 candidates cannot be ranked, sorted or filtered by
  score until they are scored. **Strictly sequential** with determinate progress and a Stop:
  concurrent Gemini calls on this key cause sustained overload (documented in CLAUDE.md and
  learned again in commit `c196237`).
- **Compare selected** — read-only drawer reusing `CandidateCompareView`, minus its three
  permanently-blank rows (rating, nationality, ranking tier).

Partial failure keeps the failed ids selected as a retry queue. Today
`ApplicantsListView.tsx:140-144` loops with `await` over a function that rethrows
(`Dashboard.tsx:194`), so the first failure aborts the rest while earlier ones have already
been written, and `BatchActions.tsx:41` reports a flat "Batch update failed".

### Filters popover

Only fields with data behind them: status, score range, has-AI, date range. Nationality is
kept but labelled with its coverage — 87 of 367, across 15 values. The score-range bug is
fixed: an unscored candidate is excluded from a score range rather than passed through it.

## Components

| File | Change |
|---|---|
| `src/lib/applicantMetrics.ts` | **New.** Pure `(applicants, now) => …`, `now` injected, no `Date.now()` inside. |
| `src/components/careers/applicants/ApplicantsRoster.tsx` | **New.** The screen. |
| `src/components/careers/applicants/ApplicantRow.tsx` | **New.** `React.memo`, primitive props, id-based callbacks. |
| `src/components/careers/applicants/RosterBulkBar.tsx` | **New.** |
| `src/components/careers/applicants/CompareDrawer.tsx` | **New.** Wraps the surviving comparison view. |
| `src/components/careers/ApplicantsListView.tsx` | **Deleted**, replaced by the above. |
| `PipelineFunnel · TimeToHire · ActivityFeed · SmartRankingRefresh · BulkComparison` | **Deleted** (~1,320 lines). |
| `SourceAnalytics.tsx` | **Moved** to `/dashboard/overview/sources` — see below. |
| `AdvancedFilters.tsx` | Rebuilt around fields with data; score bug fixed. |
| `ContactRecoveryBanner.tsx` | Folded into the "No email" chip. |
| `src/pages/Dashboard.tsx` | Renders `ApplicantsRoster`; drops the removed imports. |

### Where Sources actually lands

"Move it to Overview" is ambiguous, and the obvious reading is wrong. The Overview was
deliberately cut from 14 blocks to 8 on 2026-08-10
(`2026-08-10-dashboard-overview-redesign-design.md`); bolting Sources on as a ninth block
would undo that in the same week.

Instead it becomes a **sub-route**: `/dashboard/overview/sources`, reached from a small
link in the Overview header. The `:tab/:sub` route already exists and CV Library already
uses it, so this costs one branch and no new routing. The eight-block Overview is untouched,
and Sources gets a real URL for the first time.

Worth stating plainly: with **2 of 367** candidates carrying a source, this page shows its
honest explainer and little else today. The move is about putting analytics where analytics
live, not about unlocking value now. If that trade reads badly, parking `SourceAnalytics`
where it is until source coverage grows is a defensible alternative.

### Reuse, not reinvention

Nothing in the Applicants subtree currently imports the shared derivations. The redesign
builds on what exists:

- `pipelineMetrics.matchesSearch` — multi-token AND over name/email/role
- `pipelineMetrics.sortColumn`, `SORT_LABELS` — non-mutating, unscored last, stable ties
- `pipelineMetrics.daysInStage`, `slaState`
- `dashboardMetrics.qualityBands` + `statusColors.scoreTone`/`tierSoft` — the 85/70/50 cut
  currently has **four** implementations (`ApplicantsListView.tsx:34-39`,
  `AdvancedFilters.tsx:185`, `SourceAnalytics.tsx:28-33`, and the row's tier badge)
- `statusColors.STATUS_COLORS` — keyed, so a missing status is a TypeScript error
- `dashboard/primitives.tsx` — `Panel`, `MetricTile`

New in `applicantMetrics.ts`: `rosterFacets` (the chip predicate map + counts),
`rosterSummary` (header sentence inputs, including the distinct-people estimate), and
`applyFilters`.

## Performance

367 rows, none memoized, none windowed; every keystroke re-renders and re-animates all of
them. The fix is the same one the Pipeline board already uses: `React.memo` on the row with
primitive props and hoisted id-based callbacks, a prefix window grown by `IntersectionObserver`
with a hard cap and an explicit "show all", and `useDeferredValue` on the search term.

## Edge cases

| Case | Behaviour |
|---|---|
| No applicants at all | Empty state with a link to the careers page |
| Filter matches nobody | "Nothing matches these filters" + a one-click reset |
| Candidate has no name | Render the empty state the profile already uses; never invent "Unknown" |
| Candidate has no email | Row still fully usable; surfaced by the chip, not by disabling the row |
| `fitScore` of 0 | A real score — renders as 0, not as "AI Pending" |
| Bulk run stopped midway | Completed items stay committed and are reported as such |
| Job filter active | Chip counts describe the filtered scope, and the header says so |

## Testing

Unit tests on `applicantMetrics.ts`, matching the existing suites:

1. Every facet count equals the length of what its filter returns — the invariant that
   makes a chip trustworthy.
2. A score range **excludes** unscored candidates (locks the shipped bug).
3. `fitScore: 0` counts as scored, not unscored.
4. The distinct-people estimate ignores blank emails and is case-insensitive.
5. Search matches across name, email and resolved role, multi-token AND.

Render tests on the roster: chips filter the list; selecting rows reveals the bulk bar;
the stage pill opens the stage menu; the row is reachable and activatable by keyboard.

Gate: `tsc --noEmit -p tsconfig.app.json`, `npm run test`, lint at baseline (71 errors),
`npm run build`.

## Out of scope

- Deduplicating candidates into people. 115 have no email; a "people" view would be
  partial and misleading.
- Stage-history / true funnel conversion — needs an `applicant_stage_events` table that
  does not exist. This is why Funnel and Metrics are deleted rather than fixed.
- Reviving ratings. Nothing in the app writes one; the UI for it is dead across every screen.
