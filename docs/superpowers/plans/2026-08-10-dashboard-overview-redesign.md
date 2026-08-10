# Dashboard Overview Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/dashboard/overview` from 14 competing blocks into 8, where every number is derived from a tested pure function and the page opens with the one fact that should drive the next hour of work.

**Architecture:** All derivations move into `src/lib/dashboardMetrics.ts` as pure functions over the `Applicant[]`/`Job[]` already loaded by `CareersContext` — no new network calls. `DashboardOverview.tsx` becomes presentation only, composed from the existing `Panel`/`MetricTile` primitives. Small presentational pieces stay local to that file; they have no reuse elsewhere.

**Tech Stack:** React + TypeScript, Tailwind, shadcn/ui, Vitest + @testing-library/react.

**Spec:** [2026-08-10-dashboard-overview-redesign-design.md](../specs/2026-08-10-dashboard-overview-redesign-design.md)

> **Project convention — no commit steps in this plan.** `CLAUDE.md` states work is
> only committed and pushed when the user explicitly says "git push". Run the
> verification commands in each task, then leave the work in the tree.
> Gate after every task: `npm run typecheck && npm run test`.

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `src/lib/dashboardMetrics.ts` | Pure, testable derivations. Already holds `dailyCounts`, `trendDeltaPct`, `hasTrend`, `computeAttention` — keep all four, they have other callers. | Modify — add 6 exports |
| `src/test/dashboardMetrics.test.ts` | Unit tests for the derivations | Create |
| `src/components/careers/DashboardOverview.tsx` | Presentation only. Props stay `{ jobs, applicants, onNavigate }` so `Dashboard.tsx` needs no change. | Rewrite |
| `src/test/DashboardOverview.test.tsx` | Render tests | Create |

Existing types used throughout, from `src/types/careers.ts`:

```ts
type ApplicantStatus = "new" | "reviewing" | "shortlisted" | "interview" | "rejected" | "hired";

export const APPLICANT_STATUSES: { value: ApplicantStatus; label: string; color: string }[] = [
  { value: "new", label: "New", ... },
  { value: "reviewing", label: "Reviewing", ... },
  { value: "shortlisted", label: "Shortlisted", ... },
  { value: "interview", label: "Interview", ... },
  { value: "rejected", label: "Rejected", ... },
  { value: "hired", label: "Hired", ... },
];
```

---

## Task 1: `statusBreakdown` — the bug that hid 7 candidates

`DashboardOverview.tsx:41` currently hardcodes:

```ts
const STAGE_ORDER: ApplicantStatus[] = ["new", "reviewing", "shortlisted", "interview", "hired"];
```

`"rejected"` is missing, so 7 real candidates vanish from a panel captioned "Share of all 367 applicants". Deriving the order from `APPLICANT_STATUSES` makes that class of bug impossible.

**Files:**
- Modify: `src/lib/dashboardMetrics.ts`
- Test: `src/test/dashboardMetrics.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/test/dashboardMetrics.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { statusBreakdown } from "@/lib/dashboardMetrics";
import { APPLICANT_STATUSES, type Applicant, type ApplicantStatus } from "@/types/careers";

/** Minimal applicant — only the fields the metrics read. */
export const app = (o: Partial<Applicant> = {}): Applicant => ({
  id: Math.random().toString(36).slice(2),
  jobId: "job-1",
  fullName: "Test Person",
  email: "t@example.com",
  phone: "",
  location: "",
  cvFileName: "cv.pdf",
  screeningAnswers: {},
  status: "new",
  appliedDate: "2026-08-01T00:00:00.000Z",
  notes: [],
  ...o,
});

describe("statusBreakdown", () => {
  it("counts every status, including rejected", () => {
    const result = statusBreakdown([
      app({ status: "new" }),
      app({ status: "rejected" }),
      app({ status: "hired" }),
    ]);
    const rejected = result.find(s => s.status === "rejected");
    expect(rejected?.count).toBe(1);
  });

  it("sums to the applicant count", () => {
    const applicants = [
      ...Array.from({ length: 340 }, () => app({ status: "new" as ApplicantStatus })),
      ...Array.from({ length: 7 }, () => app({ status: "rejected" as ApplicantStatus })),
      app({ status: "hired" }),
    ];
    const total = statusBreakdown(applicants).reduce((sum, s) => sum + s.count, 0);
    expect(total).toBe(applicants.length);
  });

  it("lists every status in APPLICANT_STATUSES even at zero", () => {
    const result = statusBreakdown([app({ status: "new" })]);
    expect(result.map(s => s.status)).toEqual(APPLICANT_STATUSES.map(s => s.value));
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
npx vitest run src/test/dashboardMetrics.test.ts
```

Expected: FAIL — `statusBreakdown is not a function`.

- [ ] **Step 3: Implement**

Append to `src/lib/dashboardMetrics.ts`:

```ts
import { APPLICANT_STATUSES, type ApplicantStatus } from "@/types/careers";

export type StatusSlice = { status: ApplicantStatus; label: string; count: number };

/**
 * Count applicants by status, in pipeline order.
 *
 * Derived from APPLICANT_STATUSES rather than a local list: the previous local
 * list omitted "rejected", so 7 candidates disappeared from a panel that claimed
 * to show all of them. The slices must always sum to applicants.length.
 */
export function statusBreakdown(applicants: Applicant[]): StatusSlice[] {
  const counts = new Map<ApplicantStatus, number>();
  for (const a of applicants) counts.set(a.status, (counts.get(a.status) ?? 0) + 1);
  return APPLICANT_STATUSES.map(({ value, label }) => ({
    status: value,
    label,
    count: counts.get(value) ?? 0,
  }));
}
```

Note: `Applicant` is already imported at the top of the file. Add `APPLICANT_STATUSES` and `ApplicantStatus` to that existing import rather than adding a second import line.

- [ ] **Step 4: Run and confirm green**

```bash
npx vitest run src/test/dashboardMetrics.test.ts
```

Expected: PASS, 3 tests.

---

## Task 2: `qualityBands`

**Files:**
- Modify: `src/lib/dashboardMetrics.ts`
- Test: `src/test/dashboardMetrics.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/test/dashboardMetrics.test.ts`:

```ts
import { qualityBands } from "@/lib/dashboardMetrics";

const scored = (fitScore: number) =>
  app({ aiAnalysis: { fitScore } as Applicant["aiAnalysis"] });

describe("qualityBands", () => {
  it("bands scores at the documented boundaries", () => {
    const { bands } = qualityBands([scored(85), scored(84), scored(70), scored(69), scored(50), scored(49)]);
    const by = Object.fromEntries(bands.map(b => [b.band, b.count]));
    expect(by.Top).toBe(1);       // 85
    expect(by.Strong).toBe(2);    // 84, 70
    expect(by.Moderate).toBe(2);  // 69, 50
    expect(by.Weak).toBe(1);      // 49
  });

  it("ignores unscored applicants entirely", () => {
    const { bands, scored: n } = qualityBands([scored(90), app(), app()]);
    expect(n).toBe(1);
    expect(bands.reduce((s, b) => s + b.count, 0)).toBe(1);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
npx vitest run src/test/dashboardMetrics.test.ts -t qualityBands
```

Expected: FAIL — `qualityBands is not a function`.

- [ ] **Step 3: Implement**

Append to `src/lib/dashboardMetrics.ts`:

```ts
export type QualityBand = { band: "Top" | "Strong" | "Moderate" | "Weak"; count: number };

/**
 * Score distribution over SCORED applicants only. Unscored candidates are never
 * folded in as a band — a chart whose largest slice is "unknown" describes
 * missing data rather than the pool.
 */
export function qualityBands(applicants: Applicant[]): { bands: QualityBand[]; scored: number } {
  const scoredOnly = applicants
    .map((a) => a.aiAnalysis?.fitScore)
    .filter((s): s is number => typeof s === "number");

  const count = (test: (n: number) => boolean) => scoredOnly.filter(test).length;

  return {
    scored: scoredOnly.length,
    bands: [
      { band: "Top", count: count((n) => n >= 85) },
      { band: "Strong", count: count((n) => n >= 70 && n < 85) },
      { band: "Moderate", count: count((n) => n >= 50 && n < 70) },
      { band: "Weak", count: count((n) => n < 50) },
    ],
  };
}
```

- [ ] **Step 4: Run and confirm green**

```bash
npx vitest run src/test/dashboardMetrics.test.ts
```

Expected: PASS, 5 tests.

---

## Task 3: `actionQueue`

Five ways into the same population. They overlap on purpose — a fast-track candidate is also unreviewed — so they must never be summed. `computeAttention`'s existing comment records what happened last time someone did ("652 need attention" on a 348-person pipeline).

**Files:**
- Modify: `src/lib/dashboardMetrics.ts`
- Test: `src/test/dashboardMetrics.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/test/dashboardMetrics.test.ts`:

```ts
import { actionQueue } from "@/lib/dashboardMetrics";

const NOW = new Date("2026-08-10T12:00:00.000Z").getTime();
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString();
const rec = (recommendation: string, status: Applicant["status"] = "new") =>
  app({ status, aiAnalysis: { fitScore: 90, recommendation } as Applicant["aiAnalysis"] });

describe("actionQueue", () => {
  it("counts fast-track only while still unreviewed", () => {
    const rows = actionQueue([
      rec("Fast-Track to Interview", "new"),
      rec("Fast-Track to Interview", "interview"),  // already actioned
    ], NOW);
    expect(rows.find(r => r.id === "fastTrackNew")?.count).toBe(1);
  });

  it("treats an interview as stalled only after 7 full days", () => {
    const rows = actionQueue([
      app({ status: "interview", stageEnteredAt: daysAgo(8) }),
      app({ status: "interview", stageEnteredAt: daysAgo(6) }),
    ], NOW);
    expect(rows.find(r => r.id === "stalledInterviews")?.count).toBe(1);
  });

  it("omits rows with a zero count", () => {
    const rows = actionQueue([app({ status: "hired" })], NOW);
    expect(rows).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
npx vitest run src/test/dashboardMetrics.test.ts -t actionQueue
```

Expected: FAIL — `actionQueue is not a function`.

- [ ] **Step 3: Implement**

Append to `src/lib/dashboardMetrics.ts`:

```ts
export type ActionRow = {
  id: "fastTrackNew" | "unreviewed" | "awaitingAi" | "stalledInterviews" | "notRecommendedNew";
  count: number;
  label: string;
  verb: string;
  /** Highlighted row — the highest-value action on the page. */
  primary?: boolean;
};

/**
 * The five things worth doing right now.
 *
 * These buckets OVERLAP by design (a fast-track candidate is also unreviewed).
 * They are five entry points, not a partition — never sum them into a headline.
 */
export function actionQueue(applicants: Applicant[], now: number): ActionRow[] {
  const recommendationIs = (a: Applicant, value: string) =>
    a.aiAnalysis?.recommendation === value;
  const stalled = (a: Applicant) =>
    a.status === "interview" &&
    (now - new Date(a.stageEnteredAt || a.appliedDate).getTime()) / 86_400_000 > 7;

  const rows: ActionRow[] = [
    {
      id: "fastTrackNew",
      count: applicants.filter((a) => a.status === "new" && recommendationIs(a, "Fast-Track to Interview")).length,
      label: "Fast-track candidates never reviewed",
      verb: "Review",
      primary: true,
    },
    {
      id: "unreviewed",
      count: applicants.filter((a) => a.status === "new").length,
      label: "Applications never opened",
      verb: "Open",
    },
    {
      id: "awaitingAi",
      count: applicants.filter((a) => !a.aiAnalysis).length,
      label: "Waiting for AI analysis",
      verb: "Run",
    },
    {
      id: "stalledInterviews",
      count: applicants.filter(stalled).length,
      label: "Interviews with no movement for a week",
      verb: "Open",
    },
    {
      id: "notRecommendedNew",
      count: applicants.filter((a) => a.status === "new" && recommendationIs(a, "Not Recommended")).length,
      label: '"Not recommended", still sitting in New',
      verb: "Clear",
    },
  ];

  return rows.filter((r) => r.count > 0);
}
```

- [ ] **Step 4: Run and confirm green**

```bash
npx vitest run src/test/dashboardMetrics.test.ts
```

Expected: PASS, 8 tests.

---

## Task 4: `applicationsPerRole` and `oldestUnreviewed`

**Files:**
- Modify: `src/lib/dashboardMetrics.ts`
- Test: `src/test/dashboardMetrics.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/test/dashboardMetrics.test.ts`:

```ts
import { applicationsPerRole, oldestUnreviewed } from "@/lib/dashboardMetrics";
import type { Job } from "@/types/careers";

const job = (o: Partial<Job> = {}): Job => ({
  id: "job-1", title: "Role", department: "Engineering", location: "Remote",
  type: "Full-time", status: "open", summary: "", description: "",
  responsibilities: [], requirements: [], benefits: [],
  postedDate: "2026-01-01", screeningQuestions: [], ...o,
});

describe("applicationsPerRole", () => {
  it("includes open roles with zero applications and sorts descending", () => {
    const jobs = [job({ id: "a", title: "Busy" }), job({ id: "b", title: "Empty" })];
    const rows = applicationsPerRole([app({ jobId: "a" }), app({ jobId: "a" })], jobs);
    expect(rows.map(r => [r.title, r.count])).toEqual([["Busy", 2], ["Empty", 0]]);
  });

  it("excludes closed and archived roles", () => {
    const jobs = [
      job({ id: "a", title: "Open" }),
      job({ id: "b", title: "Closed", status: "closed" }),
      job({ id: "c", title: "Archived", archivedAt: "2026-08-01" }),
    ];
    expect(applicationsPerRole([], jobs).map(r => r.title)).toEqual(["Open"]);
  });
});

describe("oldestUnreviewed", () => {
  it("returns the earliest applied date among unreviewed only", () => {
    expect(oldestUnreviewed([
      app({ status: "new", appliedDate: "2026-06-23T00:00:00.000Z" }),
      app({ status: "new", appliedDate: "2026-08-01T00:00:00.000Z" }),
      app({ status: "hired", appliedDate: "2026-01-01T00:00:00.000Z" }),
    ])).toBe("2026-06-23T00:00:00.000Z");
  });

  it("returns null when nothing is unreviewed", () => {
    expect(oldestUnreviewed([app({ status: "hired" })])).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
npx vitest run src/test/dashboardMetrics.test.ts -t applicationsPerRole
```

Expected: FAIL — `applicationsPerRole is not a function`.

- [ ] **Step 3: Implement**

Append to `src/lib/dashboardMetrics.ts`:

```ts
export type RoleLoad = { jobId: string; title: string; count: number };

/**
 * Applications against every OPEN, non-archived role — including roles with zero.
 * Showing only the busiest roles hid the opposite problem: roles nobody is finding.
 */
export function applicationsPerRole(applicants: Applicant[], jobs: Job[]): RoleLoad[] {
  const counts = new Map<string, number>();
  for (const a of applicants) counts.set(a.jobId, (counts.get(a.jobId) ?? 0) + 1);

  return jobs
    .filter((j) => j.status === "open" && !j.archivedAt)
    .map((j) => ({ jobId: j.id, title: j.title, count: counts.get(j.id) ?? 0 }))
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));
}

/** Earliest applied date still sitting in "new", or null. Drives the header sentence. */
export function oldestUnreviewed(applicants: Applicant[]): string | null {
  const dates = applicants.filter((a) => a.status === "new").map((a) => a.appliedDate).filter(Boolean);
  if (dates.length === 0) return null;
  return dates.reduce((oldest, d) => (new Date(d) < new Date(oldest) ? d : oldest));
}
```

- [ ] **Step 4: Run and confirm green**

```bash
npx vitest run src/test/dashboardMetrics.test.ts
```

Expected: PASS, 12 tests.

---

## Task 5: `topUnreviewed`

**Files:**
- Modify: `src/lib/dashboardMetrics.ts`
- Test: `src/test/dashboardMetrics.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/test/dashboardMetrics.test.ts`:

```ts
import { topUnreviewed } from "@/lib/dashboardMetrics";

describe("topUnreviewed", () => {
  const pool = [
    app({ id: "a", jobId: "j1", status: "new", aiAnalysis: { fitScore: 90 } as Applicant["aiAnalysis"] }),
    app({ id: "b", jobId: "j2", status: "new", aiAnalysis: { fitScore: 95 } as Applicant["aiAnalysis"] }),
    app({ id: "c", jobId: "j1", status: "interview", aiAnalysis: { fitScore: 99 } as Applicant["aiAnalysis"] }),
    app({ id: "d", jobId: "j1", status: "new" }),  // unscored
  ];

  it("returns only scored, unreviewed candidates, highest score first", () => {
    expect(topUnreviewed(pool).map(a => a.id)).toEqual(["b", "a"]);
  });

  it("filters by job when given one", () => {
    expect(topUnreviewed(pool, "j1").map(a => a.id)).toEqual(["a"]);
  });

  it("respects the limit", () => {
    expect(topUnreviewed(pool, undefined, 1).map(a => a.id)).toEqual(["b"]);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
npx vitest run src/test/dashboardMetrics.test.ts -t topUnreviewed
```

Expected: FAIL — `topUnreviewed is not a function`.

- [ ] **Step 3: Implement**

Append to `src/lib/dashboardMetrics.ts`:

```ts
/**
 * Best candidates nobody has looked at yet. A "top matches" board that includes
 * people already hired or rejected is a trophy cabinet; this stays a queue.
 */
export function topUnreviewed(applicants: Applicant[], jobId?: string, limit = 6): Applicant[] {
  return applicants
    .filter((a) => a.status === "new" && typeof a.aiAnalysis?.fitScore === "number")
    .filter((a) => !jobId || a.jobId === jobId)
    .sort((a, b) => (b.aiAnalysis!.fitScore ?? 0) - (a.aiAnalysis!.fitScore ?? 0))
    .slice(0, limit);
}
```

- [ ] **Step 4: Run and confirm green**

```bash
npx vitest run src/test/dashboardMetrics.test.ts && npm run typecheck
```

Expected: PASS, 15 tests; typecheck clean.

---

## Task 6: Rewrite the Overview — header and tiles

Props stay `{ jobs, applicants, onNavigate }`, so `Dashboard.tsx:513` needs no change.

**Files:**
- Modify: `src/components/careers/DashboardOverview.tsx`

- [ ] **Step 1: Replace the header and tile section**

Keep the existing imports, the `now` memo and the live auto-refresh effect at the top of the component. Replace `STAGE_ORDER` (line 41) and the tile/panel JSX with:

```tsx
const breakdown = useMemo(() => statusBreakdown(applicants), [applicants]);
const quality = useMemo(() => qualityBands(applicants), [applicants]);
const actions = useMemo(() => actionQueue(applicants, now), [applicants, now]);
const roleLoad = useMemo(() => applicationsPerRole(applicants, jobs), [applicants, jobs]);

const unreviewed = breakdown.find((s) => s.status === "new")?.count ?? 0;
const oldest = useMemo(() => oldestUnreviewed(applicants), [applicants]);
const openRoles = roleLoad.length;
const starvedRoles = roleLoad.filter((r) => r.count <= 4).length;
const recent7d = applicants.filter(
  (a) => now - new Date(a.appliedDate).getTime() < 7 * 86_400_000
).length;
const pct = (n: number) => (applicants.length ? Math.round((n / applicants.length) * 100) : 0);
```

Header JSX:

```tsx
<div className="mb-5">
  <div className="flex items-center gap-2.5">
    <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
    <LiveDot />
  </div>
  <p className="mt-1.5 text-sm text-muted-foreground">
    {unreviewed > 0 ? (
      <>
        <strong className={TONE_TEXT.warning}>
          {unreviewed} application{unreviewed === 1 ? "" : "s"} {unreviewed === 1 ? "has" : "have"} never been opened.
        </strong>{" "}
        {oldest && `The oldest has been waiting since ${new Date(oldest).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}.`}
      </>
    ) : (
      "Everything received has been reviewed."
    )}
  </p>
</div>

<div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
  <MetricTile label="Open roles" value={openRoles}
    hint={starvedRoles > 0 ? `${starvedRoles} with almost no applicants` : undefined}
    onClick={() => onNavigate("jobs")} />
  <MetricTile label="Applications" value={applicants.length}
    hint={`${recent7d} in the last 7 days`}
    onClick={() => onNavigate("applicants")} />
  <MetricTile label="Never opened" value={unreviewed}
    hint={`${pct(unreviewed)}% of everything received`}
    onClick={() => onNavigate("applicants")} />
  <MetricTile label="Scored by AI" value={applicants.length - (actions.find(a => a.id === "awaitingAi")?.count ?? 0)}
    hint={`${actions.find(a => a.id === "awaitingAi")?.count ?? 0} still waiting`}
    onClick={() => onNavigate("applicants")} />
</div>
```

Add to the imports at the top of the file:

```tsx
import {
  statusBreakdown, qualityBands, actionQueue, applicationsPerRole,
  oldestUnreviewed, topUnreviewed,
} from "@/lib/dashboardMetrics";
```

Delete the now-unused `Avg AI score`, `Reached interview` and `Time to hire` tiles and any helper that only fed them.

- [ ] **Step 2: Verify**

```bash
npm run typecheck
```

Expected: clean. Remove any import left unused by the deleted tiles.

---

## Task 7: Pipeline and quality strips

**Files:**
- Modify: `src/components/careers/DashboardOverview.tsx`

- [ ] **Step 1: Add the local `Strip` component**

At the bottom of the file, above the default export:

```tsx
/** One horizontal bar split into proportional segments, with a legend beneath.
 *  Segments below ~1% still render 2px wide so a single candidate stays visible. */
function Strip({ rows, total, colours }: {
  rows: { label: string; count: number }[];
  total: number;
  colours: string[];
}) {
  if (total === 0) return null;
  return (
    <>
      <div className="flex h-3.5 overflow-hidden rounded-full bg-secondary/40" role="img"
        aria-label={rows.map(r => `${r.label} ${r.count}`).join(", ")}>
        {rows.map((r, i) => r.count > 0 && (
          <div key={r.label} title={`${r.label}: ${r.count}`}
            style={{ width: `${Math.max((r.count / total) * 100, 0.6)}%`, background: colours[i % colours.length] }} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        {rows.map((r, i) => (
          <span key={r.label} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ background: colours[i % colours.length] }} aria-hidden="true" />
            {r.label} <span className="font-medium text-foreground tabular-nums">{r.count}</span>
          </span>
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Render the combined panel**

```tsx
<Panel title="Where everyone stands" icon={Activity} className="mb-4">
  {applicants.length === 0 ? (
    <p className="py-6 text-center text-sm text-muted-foreground">No applications yet.</p>
  ) : (
    <>
      <Strip rows={breakdown.map(s => ({ label: s.label, count: s.count }))}
        total={applicants.length} colours={CHART_SERIES} />

      <div className="mt-5 mb-2 flex items-baseline justify-between">
        <h4 className="text-sm font-semibold">Candidate quality</h4>
        <span className="text-[11px] text-muted-foreground">of the {quality.scored} scored</span>
      </div>
      {quality.scored === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">No application has been scored yet.</p>
      ) : (
        <Strip rows={quality.bands.map(b => ({ label: b.band, count: b.count }))}
          total={quality.scored} colours={CHART_SERIES} />
      )}
    </>
  )}
</Panel>
```

`CHART_SERIES` is already imported from `./statusColors` in this file; confirm and add it if not.

- [ ] **Step 3: Verify**

```bash
npm run typecheck && npm run build
```

Expected: both clean.

---

## Task 8: "Act on these"

**Files:**
- Modify: `src/components/careers/DashboardOverview.tsx`

- [ ] **Step 1: Render the panel**

```tsx
<Panel title="Act on these" icon={AlertTriangle} className="mb-4" bodyClassName="p-2">
  {actions.length === 0 ? (
    <p className="py-6 text-center text-sm text-muted-foreground">Nothing needs attention right now.</p>
  ) : (
    <ul>
      {actions.map((row) => (
        <li key={row.id}>
          <button
            onClick={() => onNavigate("applicants")}
            className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left text-sm transition-colors hover:bg-secondary/60 ${
              row.primary ? "bg-primary/[0.06]" : ""
            }`}
          >
            <span className={`min-w-[42px] text-right text-base font-bold tabular-nums ${
              row.primary ? "text-primary" : "text-foreground"
            }`}>
              {row.count}
            </span>
            <span className="flex-1">{row.label}</span>
            <span className="text-xs text-muted-foreground">{row.verb} →</span>
          </button>
        </li>
      ))}
    </ul>
  )}
</Panel>
```

- [ ] **Step 2: Verify**

```bash
npm run typecheck
```

Expected: clean.

---

## Task 9: Applications per open role

**Files:**
- Modify: `src/components/careers/DashboardOverview.tsx`

- [ ] **Step 1: Render the bar list**

A pie was considered and rejected: with 16 roles the four that matter are slivers under 1% with colliding labels.

```tsx
<Panel title="Applications per open role" icon={Briefcase}>
  {roleLoad.length === 0 ? (
    <p className="py-6 text-center text-sm text-muted-foreground">No open roles.</p>
  ) : (
    <>
      <p className="mb-3 text-[11px] text-muted-foreground">All {roleLoad.length} open roles. The short bars are the point.</p>
      <ul className="space-y-1.5">
        {roleLoad.map((r) => {
          const colour = r.count <= 4 ? "hsl(var(--chart-4))"
            : r.count < 10 ? "hsl(var(--chart-5))" : "hsl(var(--chart-1))";
          return (
            <li key={r.jobId} className="flex items-center gap-2.5">
              <span className="w-[42%] truncate text-xs text-muted-foreground" title={r.title}>{r.title}</span>
              <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary/40">
                <span className="block h-full rounded-full"
                  style={{ width: `${Math.max((r.count / (roleLoad[0]?.count || 1)) * 100, 1.5)}%`, background: colour }} />
              </span>
              <span className="w-7 text-right text-xs font-medium tabular-nums">{r.count}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
        Pink under 5 applicants, amber under 10.
      </p>
    </>
  )}
</Panel>
```

- [ ] **Step 2: Verify**

```bash
npm run typecheck
```

Expected: clean.

---

## Task 10: Best candidates you haven't reviewed, with the job filter

**Files:**
- Modify: `src/components/careers/DashboardOverview.tsx`

- [ ] **Step 1: Add filter state and render**

Add near the other hooks:

```tsx
const [roleFilter, setRoleFilter] = useState<string>("all");
const shortlist = useMemo(
  () => topUnreviewed(applicants, roleFilter === "all" ? undefined : roleFilter),
  [applicants, roleFilter]
);
/** Only roles that actually have an unreviewed, scored candidate. */
const filterableRoles = useMemo(
  () => roleLoad.filter((r) => topUnreviewed(applicants, r.jobId, 1).length > 0),
  [roleLoad, applicants]
);
```

Render:

```tsx
<Panel
  title="Best candidates you haven't reviewed"
  icon={UserCheck}
  action={
    <Select value={roleFilter} onValueChange={setRoleFilter}>
      <SelectTrigger className="h-7 w-[170px] text-xs" aria-label="Filter by role">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All roles</SelectItem>
        {filterableRoles.map((r) => (
          <SelectItem key={r.jobId} value={r.jobId}>{r.title}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  }
>
  {shortlist.length === 0 ? (
    <p className="py-6 text-center text-sm text-muted-foreground">
      {roleFilter === "all" ? "Every scored candidate has been reviewed." : "No unreviewed candidates for this role."}
    </p>
  ) : (
    <ul className="divide-y divide-border/60">
      {shortlist.map((a) => (
        <li key={a.id}>
          <button onClick={() => onNavigate("applicants")}
            className="flex w-full items-center gap-2.5 py-2 text-left transition-colors hover:bg-secondary/40">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[10px] font-bold text-primary">
              {a.fullName.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{a.fullName}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{a.jobTitle || "Unknown role"}</span>
            </span>
            <span className="text-sm font-bold tabular-nums text-primary">{a.aiAnalysis?.fitScore}</span>
          </button>
        </li>
      ))}
    </ul>
  )}
</Panel>
```

Wrap Tasks 9 and 10 in `<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">`.

Add to imports:

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
```

Confirm `useState` is imported from React in this file; add it if not.

- [ ] **Step 2: Verify**

```bash
npm run typecheck && npm run build
```

Expected: both clean.

---

## Task 11: Render tests and final gate

**Files:**
- Create: `src/test/DashboardOverview.test.tsx`

- [ ] **Step 1: Write the tests**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardOverview from "@/components/careers/DashboardOverview";
import type { Applicant, Job } from "@/types/careers";

const app = (o: Partial<Applicant> = {}): Applicant => ({
  id: Math.random().toString(36).slice(2), jobId: "j1", fullName: "Test Person",
  email: "t@example.com", phone: "", location: "", cvFileName: "cv.pdf",
  screeningAnswers: {}, status: "new", appliedDate: "2026-06-23T00:00:00.000Z",
  notes: [], ...o,
});
const job = (o: Partial<Job> = {}): Job => ({
  id: "j1", title: "Full Stack Intern", department: "Engineering", location: "Remote",
  type: "Full-time", status: "open", summary: "", description: "",
  responsibilities: [], requirements: [], benefits: [],
  postedDate: "2026-01-01", screeningQuestions: [], ...o,
});

describe("DashboardOverview", () => {
  it("leads with the unreviewed count and the oldest wait", () => {
    render(<DashboardOverview jobs={[job()]} applicants={[app(), app()]} onNavigate={vi.fn()} />);
    expect(screen.getByText(/2 applications have never been opened/i)).toBeTruthy();
    expect(screen.getByText(/waiting since 23 June/i)).toBeTruthy();
  });

  it("shows rejected candidates in the pipeline strip", () => {
    // The old hardcoded stage list omitted "rejected" entirely.
    render(<DashboardOverview jobs={[job()]} applicants={[app({ status: "rejected" })]} onNavigate={vi.fn()} />);
    expect(screen.getByText("Rejected")).toBeTruthy();
  });

  it("says so when nothing needs attention", () => {
    render(<DashboardOverview jobs={[job()]} applicants={[app({ status: "hired" })]} onNavigate={vi.fn()} />);
    expect(screen.getByText(/Nothing needs attention/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run them**

```bash
npx vitest run src/test/DashboardOverview.test.tsx
```

Expected: PASS, 3 tests. If the component's auto-refresh effect causes act() warnings, wrap the render in `await waitFor(() => {})` rather than disabling the effect — the effect is real behaviour.

- [ ] **Step 3: Full gate**

```bash
npm run typecheck && npm run test && npm run build
```

Expected: typecheck clean, all tests pass (62 existing + 18 new = 80), build succeeds.

- [ ] **Step 4: Check both themes**

Start the dev server and view `/dashboard/overview` in light and dark. The two strips sit on `--card`, which inverts; confirm segment colours and the amber "Never opened" tile remain legible in both.

---

## Self-review

**Spec coverage**

| Spec requirement | Task |
|---|---|
| Header sentence + empty variant | 6, 11 |
| Four tiles, three removed | 6 |
| Pipeline strip summing to total, all six statuses | 1, 7, 11 |
| Quality strip over scored only | 2, 7 |
| Five action rows, zero rows hidden, primary row lifted | 3, 8 |
| Role bar chart, all open roles, colour thresholds | 4, 9 |
| Unreviewed shortlist + job filter | 5, 10 |
| Empty states for every panel | 7, 8, 9, 10 |
| Five metric unit tests + render tests | 1–5, 11 |
| Lumofy tokens, `tabular-nums`, both themes | 7–11 |

No gaps.

**Placeholders:** none — every code step carries complete code.

**Type consistency:** `statusBreakdown → StatusSlice{status,label,count}`, `qualityBands → {bands,scored}`, `actionQueue → ActionRow{id,count,label,verb,primary?}`, `applicationsPerRole → RoleLoad{jobId,title,count}`, `topUnreviewed → Applicant[]`. Names match between definition and use in Tasks 6–10.
