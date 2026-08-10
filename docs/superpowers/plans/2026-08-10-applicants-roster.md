# Applicants Roster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the eight-tab Applicants page with a single searchable roster — find any candidate or slice fast, judge them without opening anything, act on the whole slice at once.

**Architecture:** Pure derivations in `src/lib/applicantMetrics.ts` (`now` injected, unit-tested), a thin memoized row, and one screen component. Reuses `pipelineMetrics` and `statusColors` instead of adding a fifth copy of the 85/70/50 tier cut. Four analytics tabs (~1,320 lines) are deleted, not fixed — they depend on stage history and ratings that do not exist.

**Tech Stack:** Vite + React 18 + TypeScript, Tailwind, shadcn/ui (Radix), Vitest + Testing Library, Supabase edge functions.

**Spec:** `docs/superpowers/specs/2026-08-10-applicants-roster-design.md`

**Commit policy:** This repo's CLAUDE.md forbids committing unless the user says "git push". Treat every "Commit" step below as **staging complete, tested work** — run the gate, then stop. Do not run `git commit`.

---

## File Structure

**Create**
| File | Responsibility |
|---|---|
| `src/lib/applicantMetrics.ts` | Facet predicates + counts, roster summary, filter application. Pure, `now` injected. |
| `src/test/applicantMetrics.test.ts` | Locks the facet invariant and the shipped score-filter bug. |
| `src/components/careers/applicants/ApplicantRow.tsx` | One memoized row. Primitive props only. |
| `src/components/careers/applicants/ApplicantsRoster.tsx` | The screen: header, chips, toolbar, list, bulk bar. |
| `src/components/careers/applicants/RosterBulkBar.tsx` | Floating selection bar. |
| `src/components/careers/applicants/CompareDrawer.tsx` | Read-only side-by-side over a selection. |
| `src/components/careers/applicants/useBulkAnalysis.ts` | Sequential AI scoring runner with progress + cancel. |
| `src/test/ApplicantsRoster.test.tsx` | Render tests. |

**Modify**
- `src/pages/Dashboard.tsx` — render `ApplicantsRoster`; drop removed imports; add the `overview/sources` sub-route branch.
- `src/components/careers/applicants/AdvancedFilters.tsx` — fix the score bug; drop fields with no data.
- `src/test/candidateUrls.test.tsx:51-53` — the mock targets `ApplicantsListView`; repoint at `ApplicantsRoster`.

**Delete**
- `src/components/careers/ApplicantsListView.tsx`
- `src/components/careers/applicants/PipelineFunnel.tsx`
- `src/components/careers/applicants/TimeToHire.tsx`
- `src/components/careers/applicants/ActivityFeed.tsx`
- `src/components/careers/applicants/SmartRankingRefresh.tsx`
- `src/components/careers/applicants/BulkComparison.tsx`
- `src/components/careers/applicants/BatchActions.tsx`
- `src/components/careers/applicants/ContactRecoveryBanner.tsx` (folded into the "No email" chip)

---

## Task 1: applicantMetrics — facets, summary, filters

**Files:**
- Create: `src/lib/applicantMetrics.ts`
- Test: `src/test/applicantMetrics.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from "vitest";
import {
  ROSTER_FACETS, rosterFacets, rosterSummary, applyScoreRange, distinctPeople,
  type FacetId,
} from "@/lib/applicantMetrics";
import type { AIAnalysis, Applicant } from "@/types/careers";

const NOW = 1_700_000_000_000;
const DAY = 86400000;
const daysAgo = (n: number) => new Date(NOW - n * DAY).toISOString();

function app(o: Partial<Applicant> = {}): Applicant {
  return {
    id: "a1", jobId: "job1", fullName: "Jane Doe", email: "jane@example.com",
    phone: "", location: "", cvFileName: "cv.pdf", screeningAnswers: {},
    status: "new", appliedDate: daysAgo(1), notes: [], ...o,
  };
}
const ai = (o: Partial<AIAnalysis> = {}) => ({ fitScore: 70, ...o } as AIAnalysis);

describe("rosterFacets", () => {
  it("every count equals the length of what its filter returns", () => {
    const list = [
      app({ id: "1", status: "new", aiAnalysis: undefined }),
      app({ id: "2", status: "new", aiAnalysis: ai({ fitScore: 92 }) }),
      app({ id: "3", status: "hired", aiAnalysis: ai({ fitScore: 40 }), email: "  " }),
    ];
    for (const f of rosterFacets(list, NOW)) {
      expect(list.filter((a) => ROSTER_FACETS[f.id](a, NOW))).toHaveLength(f.count);
    }
  });

  it("treats a fitScore of 0 as scored", () => {
    const list = [app({ id: "1", aiAnalysis: ai({ fitScore: 0 }) })];
    const unscored = rosterFacets(list, NOW).find((f) => f.id === "unscored");
    expect(unscored?.count).toBe(0);
  });

  it("counts a blank email as no email", () => {
    const list = [app({ id: "1", email: "   " }), app({ id: "2", email: "a@b.com" })];
    const noEmail = rosterFacets(list, NOW).find((f) => f.id === "noEmail");
    expect(noEmail?.count).toBe(1);
  });
});

describe("applyScoreRange", () => {
  it("EXCLUDES unscored candidates instead of passing them through", () => {
    // Shipped bug: `if (score != null && out-of-range) return false` let every
    // unscored candidate satisfy 85-100.
    const list = [app({ id: "scored", aiAnalysis: ai({ fitScore: 90 }) }), app({ id: "unscored" })];
    expect(applyScoreRange(list, 85, 100).map((a) => a.id)).toEqual(["scored"]);
  });

  it("is a no-op at the full range, including for unscored", () => {
    const list = [app({ id: "scored", aiAnalysis: ai({ fitScore: 90 }) }), app({ id: "unscored" })];
    expect(applyScoreRange(list, 0, 100)).toHaveLength(2);
  });
});

describe("distinctPeople", () => {
  it("dedupes on lowercased email and ignores blanks", () => {
    const list = [
      app({ id: "1", email: "A@x.com" }), app({ id: "2", email: "a@x.com" }),
      app({ id: "3", email: "" }), app({ id: "4", email: "b@x.com" }),
    ];
    expect(distinctPeople(list)).toBe(2);
  });
});

describe("rosterSummary", () => {
  it("reports applications, an approximate headcount, and the unopened count", () => {
    const list = [
      app({ id: "1", email: "a@x.com", status: "new" }),
      app({ id: "2", email: "a@x.com", status: "new" }),
      app({ id: "3", email: "", status: "hired" }),
    ];
    expect(rosterSummary(list)).toMatchObject({
      applications: 3, people: 1, unopened: 2, unknownIdentity: 1,
    });
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run src/test/applicantMetrics.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/applicantMetrics"`.

- [ ] **Step 3: Implement**

```ts
// src/lib/applicantMetrics.ts
// Pure derivations for the Applicants roster. Same contract as
// dashboardMetrics.ts / pipelineMetrics.ts: real fields only, `now` injected,
// nothing here reads the clock.
import type { Applicant } from "@/types/careers";

export type FacetId = "all" | "unopened" | "unscored" | "top" | "noEmail";

const hasEmail = (a: Applicant) => !!a.email?.trim();

/**
 * The predicate behind each chip.
 *
 * Counts and filtering both read this map, so a chip cannot claim 119 and then
 * show a different set — the invariant pipelineMetrics.TRIAGE_FILTERS
 * established and a test locks here too.
 *
 * `aiAnalysis == null` rather than `!aiAnalysis`: a legitimate fitScore of 0 is
 * scored, and the old row rendered such a candidate as both "0" and "AI Pending".
 */
export const ROSTER_FACETS: Record<FacetId, (a: Applicant, now: number) => boolean> = {
  all: () => true,
  unopened: (a) => a.status === "new",
  unscored: (a) => a.aiAnalysis == null,
  top: (a) => (a.aiAnalysis?.fitScore ?? -1) >= 85,
  noEmail: (a) => !hasEmail(a),
};

export type Facet = { id: FacetId; label: string; count: number };

const FACET_LABELS: Record<FacetId, string> = {
  all: "All",
  unopened: "Never opened",
  unscored: "Unscored",
  top: "Top match",
  noEmail: "No email",
};

const FACET_ORDER: FacetId[] = ["all", "unopened", "unscored", "top", "noEmail"];

/** Counts for every chip in one pass. Zero-count chips still render — these are standing facets, not exceptions. */
export function rosterFacets(applicants: Applicant[], now: number): Facet[] {
  const counts = { all: 0, unopened: 0, unscored: 0, top: 0, noEmail: 0 } as Record<FacetId, number>;
  for (const a of applicants) {
    for (const id of FACET_ORDER) if (ROSTER_FACETS[id](a, now)) counts[id] += 1;
  }
  return FACET_ORDER.map((id) => ({ id, label: FACET_LABELS[id], count: counts[id] }));
}

/**
 * Distinct people, by lowercased email.
 *
 * Only an estimate, and deliberately so: candidates with no email cannot be
 * deduplicated at all, so this counts the ones that can. The header says "about".
 */
export function distinctPeople(applicants: Applicant[]): number {
  const seen = new Set<string>();
  for (const a of applicants) {
    const e = a.email?.trim().toLowerCase();
    if (e) seen.add(e);
  }
  return seen.size;
}

export type RosterSummary = {
  applications: number;
  /** Distinct people among those we can identify. */
  people: number;
  /** Applications with no email — not counted in `people`, and the reason it is approximate. */
  unknownIdentity: number;
  unopened: number;
};

export function rosterSummary(applicants: Applicant[]): RosterSummary {
  return {
    applications: applicants.length,
    people: distinctPeople(applicants),
    unknownIdentity: applicants.filter((a) => !hasEmail(a)).length,
    unopened: applicants.filter((a) => a.status === "new").length,
  };
}

/**
 * Score-range filter.
 *
 * An unscored candidate is EXCLUDED from any range narrower than the full one.
 * The shipped version guarded on `score != null` before comparing, so dragging
 * the range to 85-100 returned every unscored candidate as though they qualified.
 */
export function applyScoreRange(applicants: Applicant[], min: number, max: number): Applicant[] {
  if (min <= 0 && max >= 100) return applicants;
  return applicants.filter((a) => {
    const score = a.aiAnalysis?.fitScore;
    if (score == null) return false;
    return score >= min && score <= max;
  });
}
```

- [ ] **Step 4: Run and watch it pass**

Run: `npx vitest run src/test/applicantMetrics.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Gate and stage**

```bash
npx tsc --noEmit -p tsconfig.app.json
```

---

## Task 2: ApplicantRow — the memoized two-line row

**Files:**
- Create: `src/components/careers/applicants/ApplicantRow.tsx`

Depends on Task 1 only for types. The stage pill **is** the control (spec correction).

- [ ] **Step 1: Implement the row**

```tsx
import { memo } from "react";
import { Link } from "react-router-dom";
import { Clock, MoreVertical, ChevronRight, MailWarning } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { APPLICANT_STATUSES, type Applicant, type ApplicantStatus } from "@/types/careers";
import type { SlaState } from "@/lib/pipelineMetrics";
import { STATUS_COLORS, TONE_SOFT, TONE_TEXT, scoreTone } from "../statusColors";

export interface ApplicantRowProps {
  applicant: Applicant;
  jobTitle: string;
  profileHref: string;
  /** Computed by the screen so the row never reads the clock and stays memoizable. */
  days: number;
  sla: SlaState;
  selected: boolean;
  selectionActive: boolean;
  onToggleSelect: (id: string) => void;
  onStatusChange: (id: string, status: ApplicantStatus) => void;
  onDelete: (id: string) => void;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

const SLA_TEXT: Record<SlaState, string> = {
  ok: "text-muted-foreground",
  over: TONE_TEXT.warning,
  critical: TONE_TEXT.danger,
};

function ApplicantRowInner({
  applicant, jobTitle, profileHref, days, sla, selected, selectionActive,
  onToggleSelect, onStatusChange, onDelete,
}: ApplicantRowProps) {
  const score = applicant.aiAnalysis?.fitScore;
  const stage = APPLICANT_STATUSES.find((s) => s.value === applicant.status) ?? APPLICANT_STATUSES[0];
  const noEmail = !applicant.email?.trim();
  const applied = new Date(applicant.appliedDate);
  const appliedLabel = Number.isNaN(applied.getTime())
    ? "date unknown"
    : applied.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div
      className={`group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2 transition-colors ${
        selected ? "bg-[hsl(var(--intel-accent-subtle))]" : "hover:bg-[hsl(var(--intel-card-hover))]"
      }`}
    >
      {/* Avatar and checkbox share one slot, so selecting costs no row width. */}
      <div className="relative h-8 w-8 shrink-0">
        <div
          className={`absolute inset-0 flex items-center justify-center rounded-lg bg-primary/10 text-[10px] font-bold text-primary transition-opacity ${
            selectionActive || selected ? "opacity-0" : "opacity-100 group-hover:opacity-0"
          }`}
          aria-hidden="true"
        >
          {getInitials(applicant.fullName)}
        </div>
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity ${
            selectionActive || selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
          }`}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggleSelect(applicant.id)}
            aria-label={`Select ${applicant.fullName || "candidate"}`}
            className="h-4 w-4"
          />
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {/* A real anchor: right-click "open in new tab" and Cmd-click work. */}
          <Link
            to={profileHref}
            className="truncate text-sm font-semibold text-foreground transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {applicant.fullName || "Name not captured"}
          </Link>

          {/* The stage pill IS the control — one element that shows the stage and
              changes it. The old row had a badge and a 128px Select two lines
              apart, saying the same thing in two visual languages. */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`${applicant.fullName || "Candidate"} is ${stage.label}. Change stage.`}
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{
                  backgroundColor: `color-mix(in srgb, ${STATUS_COLORS[applicant.status]} 15%, transparent)`,
                  color: STATUS_COLORS[applicant.status],
                }}
              >
                {stage.label}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Move to stage
              </DropdownMenuLabel>
              {APPLICANT_STATUSES.filter((s) => s.value !== applicant.status).map((s) => (
                <DropdownMenuItem
                  key={s.value}
                  className="gap-2 text-xs"
                  onClick={() => onStatusChange(applicant.id, s.value)}
                >
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: STATUS_COLORS[s.value] }} />
                  {s.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {noEmail && (
            <span className={`flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] ${TONE_SOFT.warning}`} title="No email address was captured, so this candidate cannot be contacted">
              <MailWarning className="h-2.5 w-2.5" aria-hidden="true" />
              No email
            </span>
          )}
        </div>

        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          <span className="text-foreground/70">{jobTitle}</span>
          {" · applied "}{appliedLabel}
          {" · "}
          <span className={SLA_TEXT[sla]}>
            <Clock className="mr-0.5 inline h-3 w-3 align-[-2px]" aria-hidden="true" />
            {days}d waiting
          </span>
        </p>
      </div>

      <div className="flex items-center gap-2">
        {/* One score element. It used to appear three times - the number, a tier
            badge, and a rank medal - all derived from the same value. */}
        {score != null ? (
          <span
            className={`rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums ${TONE_SOFT[scoreTone(score, { strongAsAccent: true })]}`}
            title={`AI fit score ${score} of 100`}
          >
            {score}
          </span>
        ) : (
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground" title="Not scored yet">
            —
          </span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Actions for ${applicant.fullName || "candidate"}`}
              className="rounded-md p-1.5 text-muted-foreground/60 transition-colors hover:bg-[hsl(var(--intel-card-hover))] hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MoreVertical className="h-4 w-4" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem asChild>
              <Link to={profileHref}>Open profile</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(applicant.id)}
            >
              Delete candidate
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Link
          to={profileHref}
          aria-label={`Open ${applicant.fullName || "candidate"}`}
          className="rounded-md text-muted-foreground/30 transition-colors group-hover:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

/**
 * Memoized: the roster mounts up to 367 of these, each with two Radix dropdown
 * roots. Without it every keystroke in search re-renders all of them, which is
 * why the old list felt sluggish. Every prop above is a primitive or a stable
 * hoisted callback — pass an inline closure and this does nothing.
 */
export default memo(ApplicantRowInner);
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: exit 0.

> **Note on `color-mix`:** used so one token drives both the pill's tint and its text. Supported in all browsers this app targets (Chrome 111+, Safari 16.2+). If the project ever needs older support, swap to two tokens from `TONE_SOFT`.

---

## Task 3: ApplicantsRoster — header, chips, toolbar, list

**Files:**
- Create: `src/components/careers/applicants/ApplicantsRoster.tsx`

- [ ] **Step 1: Implement the screen**

Key decisions, all load-bearing:

- `now` is `useMemo(() => Date.now(), [applicants])` — recomputed when data lands, not pinned at mount (the Overview froze its clock this way and silently defeated its own live refresh).
- Search uses `useDeferredValue` so typing stays responsive while the list re-renders at low priority.
- `matchesSearch(a, jobTitle, query)` and `sortColumn(list, mode, now)` come from `@/lib/pipelineMetrics` — do not reimplement.
- Windowing: render a prefix, grow by `IntersectionObserver`, hard cap 200, then an explicit "Show all N".

```tsx
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Users, Search, X, Check, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Applicant, ApplicantStatus, Job } from "@/types/careers";
import { daysInStage, matchesSearch, slaState, sortColumn, SORT_LABELS, type SortMode } from "@/lib/pipelineMetrics";
import { ROSTER_FACETS, rosterFacets, rosterSummary, type FacetId } from "@/lib/applicantMetrics";
import ApplicantRow from "./ApplicantRow";
import RosterBulkBar from "./RosterBulkBar";

const WINDOW_INITIAL = 60;
const WINDOW_STEP = 60;
const WINDOW_CAP = 200;
const SHOW_ALL = Number.MAX_SAFE_INTEGER;

export interface ApplicantsRosterProps {
  applicants: Applicant[];      // already job-scoped by Dashboard
  jobs: Job[];
  selectedJobId: string;
  onJobChange: (id: string) => void;
  applicantHref: (id: string) => string;
  onStatusUpdate: (id: string, status: ApplicantStatus) => Promise<void>;
  onBulkStatusUpdate: (ids: string[], status: ApplicantStatus) => Promise<{ updated: string[] }>;
  onDeleteApplicant: (id: string) => Promise<void>;
  getJobTitle: (jobId: string) => string;
  sessionToken: string | null;
}
```

The body composes, in order:

1. **Header** — `<h1>Applicants</h1>` plus the sentence built from `rosterSummary`:
   `"{applications} applications from about {people} people. {unopened} have never been opened."`
   When `unknownIdentity > 0`, append a `title` on "about" explaining that candidates with no email cannot be deduplicated.
2. **Facet chips** from `rosterFacets(applicants, now)`, `aria-pressed`, active = `border-primary bg-primary/10`. Clicking toggles back to `all`.
3. **Toolbar** — search `Input` (aria-label "Search candidates"), job `Select`, sort `DropdownMenu` over `SORT_LABELS`, and a Filters button opening `AdvancedFilters`.
4. **List** — `divide-y` inside `rounded-xl border border-[hsl(var(--intel-border))] bg-[hsl(var(--intel-card))]`, mapping `visible` to `ApplicantRow`.
5. **`RosterBulkBar`** when `selectedIds.size > 0`.

Derivation chain (each its own `useMemo`):

```tsx
const now = useMemo(() => Date.now(), [applicants]);
const titleFor = useCallback((a: Applicant) => a.jobTitle || getJobTitle(a.jobId), [getJobTitle]);
const deferredSearch = useDeferredValue(search);

const faceted = useMemo(
  () => (facet === "all" ? applicants : applicants.filter((a) => ROSTER_FACETS[facet](a, now))),
  [applicants, facet, now]
);
const searched = useMemo(
  () => (deferredSearch.trim() ? faceted.filter((a) => matchesSearch(a, titleFor(a), deferredSearch)) : faceted),
  [faceted, deferredSearch, titleFor]
);
const sorted = useMemo(() => sortColumn(searched, sort, now), [searched, sort, now]);
const visible = useMemo(() => (sorted.length > limit ? sorted.slice(0, limit) : sorted), [sorted, limit]);
```

Selection is a `Set<string>` in state, pruned whenever `applicants` changes so the count can never lie:

```tsx
useEffect(() => {
  const live = new Set(applicants.map((a) => a.id));
  setSelectedIds((prev) => {
    if (prev.size === 0) return prev;
    const next = new Set([...prev].filter((id) => live.has(id)));
    return next.size === prev.size ? prev : next;
  });
}, [applicants]);
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: exit 0 (`RosterBulkBar` lands in Task 4 — stub it as `() => null` to keep this task green, then replace).

---

## Task 4: RosterBulkBar + bulk stage move

**Files:**
- Create: `src/components/careers/applicants/RosterBulkBar.tsx`

Mirror `src/components/careers/pipeline/BulkActionBar.tsx` — same floating placement, same visual language. Props:

```tsx
interface RosterBulkBarProps {
  count: number;
  hiddenCount: number;          // selected but filtered out of view
  running: boolean;
  progress: { done: number; total: number } | null;
  onMove: (status: ApplicantStatus) => void;
  onAnalyze: () => void;
  onCompare: () => void;
  onCancel: () => void;
  onClear: () => void;
}
```

- [ ] **Step 1: Wire the move through the batch endpoint**

`onBulkStatusUpdate` is `updateApplicantStatusBulk` from `CareersContext` — **one** request via the `applicantIds` branch of `update-applicant`, already deployed. Do not loop.

On partial success keep the failed ids selected as a retry queue:

```tsx
const { updated } = await onBulkStatusUpdate(ids, target);
if (updated.length === ids.length) {
  toast.success(`Moved ${updated.length} candidates to ${label}`);
  clearSelection();
} else {
  const missed = ids.filter((id) => !updated.includes(id));
  setSelectedIds(new Set(missed));
  toast.error(`Moved ${updated.length} of ${ids.length}. ${missed.length} did not move — still selected.`);
}
```

- [ ] **Step 2: Confirm terminal moves**

Reuse the AlertDialog pattern from `PipelineBoard.tsx` — moving a selection to `hired` or `rejected` asks once for the batch, not once per candidate.

- [ ] **Step 3: Typecheck + manual check** — select 3, move to Reviewing, confirm one network request in devtools.

---

## Task 5: useBulkAnalysis — sequential AI scoring

**Files:**
- Create: `src/components/careers/applicants/useBulkAnalysis.ts`

119 candidates are unscored and therefore unrankable. This is the page's biggest unlock.

- [ ] **Step 1: Implement the runner**

**Strictly sequential.** CLAUDE.md: "Call AI sequentially. Concurrent Gemini calls on this key cause sustained overload 5xx." Commit `c196237` learned this again.

```ts
export interface BulkAnalysisProgress {
  total: number; done: number;
  current: { id: string; name: string } | null;
  failures: { id: string; name: string; message: string }[];
  running: boolean;
}

export function useBulkAnalysis(
  sessionToken: string | null,
  jobFor: (jobId: string) => Job | undefined,
  onScored: (applicantId: string, analysis: AIAnalysis) => void,
) { /* run(items), cancel(), reset() */ }
```

The per-item call mirrors `AIAnalysisPanel.tsx:31-45` exactly:

```ts
const { data, error } = await supabase.functions.invoke("analyze-cv", {
  body: {
    cvStoragePath: a.cvStoragePath, cvFileName: a.cvFileName,
    candidateName: a.fullName, jobTitle: job.title,
    jobDescription: job.description, responsibilities: job.responsibilities,
    requirements: job.requirements, screeningAnswers: a.screeningAnswers,
    sessionToken, aiScoringWeights: job.aiScoringWeights,
  },
});
if (error) throw error;
if (data?.error) throw new Error(data.error);
onScored(a.id, { ...data.analysis, analyzedAt: data.analyzedAt });
```

Rules:
- `try/catch` **per item**; a failure records `{id, name, message}` and the loop continues.
- A cancel flag is checked between items. Completed items stay committed — report "Stopped. 40 scored, 79 not."
- Skip candidates with no `cvStoragePath`, and `.doc/.docx` (Gemini cannot read Word — CLAUDE.md). Count them as skipped, not failed, and say so.
- Determinate progress in the bulk bar: "Scoring 12 of 119 — Batool Isa".

- [ ] **Step 2: Test the sequencing**

Create `src/test/useBulkAnalysis.test.ts` with a mocked invoke that records call start order and asserts no two calls overlap, plus a cancel test asserting the loop stops and reports committed work.

---

## Task 6: CompareDrawer

**Files:**
- Create: `src/components/careers/applicants/CompareDrawer.tsx`

- [ ] **Step 1: Wrap the surviving comparison view**

Reuse `CandidateCompareView.tsx`, fed by the current selection instead of ephemeral pin state. **Drop its three permanently-blank rows**: Overall Rating (0 of 367 have one), Nationality (87 of 367 — too sparse for a comparison grid), Ranking Tier (duplicates the score).

Open in a `Sheet` (`@/components/ui/sheet`) from the bulk bar. Read-only: no writes, no risk.

- [ ] **Step 2: Typecheck.**

---

## Task 7: Fix AdvancedFilters

**Files:**
- Modify: `src/components/careers/applicants/AdvancedFilters.tsx:175-190`

- [ ] **Step 1: Route the score range through the tested helper**

Replace the buggy line:

```ts
// BEFORE — unscored candidates satisfy every range
if (score != null && (score < filters.scoreMin || score > filters.scoreMax)) return false;
```

with a call to `applyScoreRange` from Task 1, applied to the list rather than per-item, so the fix is the tested one and not a second implementation.

- [ ] **Step 2: Drop fields with no data behind them**

Remove the `tierFilter` block entirely — it re-derives the 85/70/50 cut a fourth time and duplicates the score range. Keep status, score range, has-AI and date. Keep nationality but label it: `Nationality (87 of 367 recorded)`.

- [ ] **Step 3: Run the Task 1 tests** — `npx vitest run src/test/applicantMetrics.test.ts`. Expected: PASS.

---

## Task 8: Sources → /dashboard/overview/sources

**Files:**
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Add the sub-route branch**

`/dashboard/:tab/:sub` already exists. Inside the overview branch, when `subParam === "sources"` render `SourceAnalytics` instead of `DashboardOverview`, with a Back link to `/dashboard/overview`.

- [ ] **Step 2: Link from the Overview header** — a small "Where candidates come from →" link. Do **not** add a ninth block; the Overview was deliberately cut to eight.

- [ ] **Step 3: Typecheck.**

---

## Task 9: Delete the dead tabs and rewire Dashboard

**Files:**
- Delete the eight files listed in File Structure
- Modify: `src/pages/Dashboard.tsx:559-580`
- Modify: `src/test/candidateUrls.test.tsx:51-53`

- [ ] **Step 1: Swap the render**

Replace the `ContactRecoveryBanner` + `ApplicantsListView` pair with `<ApplicantsRoster … />`. The banner is folded into the "No email" chip, so it is not rendered separately.

- [ ] **Step 2: Delete the files, then let the compiler find the wreckage**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Fix every unresolved import it reports. Sweep any lucide icons and `@/components/ui/*` imports in `Dashboard.tsx` left unused — check each with `grep -o "<IconName[ /]"` before removing.

- [ ] **Step 3: Repoint the routing test mock**

`src/test/candidateUrls.test.tsx` mocks `@/components/careers/ApplicantsListView`. Change the path to `ApplicantsRoster` or its six routing tests will keep passing against a module that no longer exists.

- [ ] **Step 4: Full gate**

```bash
npx tsc --noEmit -p tsconfig.app.json
npm run test
npx eslint src
npm run build
```
Expected: tsc 0; tests all pass; lint **71 errors / 19 warnings or fewer** (the baseline — do not add errors); build succeeds.

---

## Task 10: Windowing and memo verification

**Files:**
- Modify: `src/components/careers/applicants/ApplicantsRoster.tsx`

- [ ] **Step 1: Add the sentinel**

`IntersectionObserver` with `rootMargin: "240px"` at the end of the list; grow `limit` by `WINDOW_STEP` to `WINDOW_CAP`, then render "Showing 200 of N" plus a "Show all N" button. Never truncate silently.

- [ ] **Step 2: Prove the memo holds**

In the browser with React DevTools Profiler: type one character in search and confirm the commit does not re-render every mounted row. If it does, a callback is being recreated inline — hoist it with `useCallback`.

---

## Task 11: Render tests + final gate

**Files:**
- Create: `src/test/ApplicantsRoster.test.tsx`

- [ ] **Step 1: Write the tests**

Wrap in `<MemoryRouter>` — rows render `<Link>`. Use `fireEvent.pointerDown(trigger, { button: 0, pointerType: "mouse" })` for Radix menus; `fireEvent.click` leaves them closed.

Cover:
1. The header sentence reports applications, approximate people, and unopened.
2. Clicking a facet chip narrows the list to exactly that chip's count.
3. Search matches across name, email and role (multi-token).
4. The stage pill opens the stage menu and calls `onStatusUpdate` with the chosen stage.
5. Selecting rows reveals the bulk bar with the right count.
6. A `fitScore` of 0 renders "0" and **not** an unscored dash.
7. Empty state when filters match nobody, with a working reset.

- [ ] **Step 2: Final gate**

```bash
npx tsc --noEmit -p tsconfig.app.json
npm run test
npx eslint src
npm run build
```

- [ ] **Step 3: Browser verification** at 1366×768 and 1920×1080, light and dark:
search, each chip, sort, stage change from the pill, select + bulk move, and one bulk AI run on 2 candidates (restore their `ai_analysis` afterwards if testing against production).

---

## Self-review

**Spec coverage.** Header sentence → T3. Facet chips → T1/T3. Row incl. single score, stage-pill-as-control, `fitScore: 0`, STATUS_COLORS, a11y → T2. Bulk move → T4. Bulk AI → T5. Compare → T6. Filters + score bug → T1/T7. Sources sub-route → T8. Deletions + rewiring → T9. Performance → T2/T3/T10. Testing → T1/T5/T11. **No gaps.**

**Placeholder scan.** None. Task 3 describes composition prose-first with the full derivation chain in code — deliberate, because the JSX is long and the ordering is what matters.

**Type consistency.** `FacetId`, `ROSTER_FACETS`, `rosterFacets`, `rosterSummary`, `applyScoreRange`, `distinctPeople` are used identically in T1, T3, T7. `SortMode`/`SORT_LABELS`/`sortColumn`/`matchesSearch`/`daysInStage`/`slaState` match the real `pipelineMetrics` exports verified on disk. `onBulkStatusUpdate` matches `CareersContext.updateApplicantStatusBulk`'s `Promise<{ updated: string[] }>`.

**One risk to carry:** `ApplicantsListView` has zero test coverage today and `candidateUrls.test.tsx` stubs it out, so nothing existing will fail when it is deleted. Task 11 is the only safety net — do not skip it.
