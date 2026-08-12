// Pure derivations for the Applicants roster.
//
// Same contract as dashboardMetrics.ts / pipelineMetrics.ts: values come from
// real Applicant fields, `now` is injected, and nothing here reads the clock —
// so every helper is deterministic under test.
import type { Applicant, ApplicantStatus } from "@/types/careers";

export type FacetId = "all" | "unopened" | "unscored" | "top" | "noEmail";

const hasEmail = (a: Applicant) => !!a.email?.trim();

/**
 * The predicate behind each filter chip.
 *
 * Counts and filtering both read this one map, so a chip can never claim 119
 * and then show a different set — the invariant pipelineMetrics.TRIAGE_FILTERS
 * established, locked by a test here too.
 *
 * `aiAnalysis == null` rather than `!aiAnalysis`: a legitimate fitScore of 0 is
 * scored. The old row disagreed with itself about this and rendered such a
 * candidate as both "0" and "AI Pending".
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

/**
 * Counts for every chip in a single pass.
 *
 * Zero-count chips still render, unlike the Jobs page: these are standing
 * facets you filter by, not exceptions worth flagging, and "Unscored 0" is
 * genuinely good news worth seeing.
 */
export function rosterFacets(applicants: Applicant[], now: number): Facet[] {
  const counts: Record<FacetId, number> = { all: 0, unopened: 0, unscored: 0, top: 0, noEmail: 0 };
  for (const a of applicants) {
    for (const id of FACET_ORDER) {
      if (ROSTER_FACETS[id](a, now)) counts[id] += 1;
    }
  }
  return FACET_ORDER.map((id) => ({ id, label: FACET_LABELS[id], count: counts[id] }));
}

/**
 * Distinct people, by lowercased email.
 *
 * An estimate, deliberately: candidates with no email cannot be deduplicated at
 * all, so this counts only the ones that can be. Callers must say "about" —
 * 115 of 367 rows in production carry no address.
 */
export function distinctPeople(applicants: Applicant[]): number {
  const seen = new Set<string>();
  for (const a of applicants) {
    const email = a.email?.trim().toLowerCase();
    if (email) seen.add(email);
  }
  return seen.size;
}

export type RosterSummary = {
  applications: number;
  /** Distinct people among those we can identify by email. */
  people: number;
  /** Applications with no email — excluded from `people`, and the reason it is approximate. */
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
 *
 * The shipped version read `if (score != null && outOfRange) return false`, so
 * the guard short-circuited for unscored candidates and every one of them
 * satisfied every range. Dragging the filter to 85-100 returned all 119
 * unscored people alongside the genuine top matches — a shortlist that looked
 * authoritative and was not.
 */
export function applyScoreRange(applicants: Applicant[], min: number, max: number): Applicant[] {
  if (min <= 0 && max >= 100) return applicants;
  return applicants.filter((a) => {
    const score = a.aiAnalysis?.fitScore;
    if (score == null) return false;
    return score >= min && score <= max;
  });
}

/**
 * Scope a list to a set of jobs.
 *
 * An EMPTY selection means "all jobs", not "no jobs". That reading is the whole
 * contract of the control: the filter starts empty, and a filter nobody has
 * touched must never hide anything. Clearing the last checkbox therefore returns
 * to the full list rather than emptying the screen.
 */
export function filterByJobs(applicants: Applicant[], jobIds: readonly string[]): Applicant[] {
  if (jobIds.length === 0) return applicants;
  const wanted = new Set(jobIds);
  return applicants.filter((a) => wanted.has(a.jobId));
}

/**
 * The filters behind the popover — the ones the chips cannot express.
 *
 * Deliberately small. The old AdvancedFilters carried eight fields including a
 * tier filter that re-derived the same 85/70/50 cut as the score range, and a
 * nationality filter covering 87 of 367 records.
 */
export type RosterFilterState = {
  stage: ApplicantStatus | "all";
  scoreMin: number;
  scoreMax: number;
  /** ISO yyyy-mm-dd, inclusive. Empty means unbounded. */
  appliedFrom: string;
  appliedTo: string;
};

export const NO_FILTERS: RosterFilterState = {
  stage: "all",
  scoreMin: 0,
  scoreMax: 100,
  appliedFrom: "",
  appliedTo: "",
};

/** How many of the popover's filters are doing something — drives the button's badge. */
export function activeFilterCount(f: RosterFilterState): number {
  let n = 0;
  if (f.stage !== "all") n += 1;
  if (f.scoreMin > 0 || f.scoreMax < 100) n += 1;
  if (f.appliedFrom) n += 1;
  if (f.appliedTo) n += 1;
  return n;
}

export function applyRosterFilters(applicants: Applicant[], f: RosterFilterState): Applicant[] {
  let out = f.stage === "all" ? applicants : applicants.filter((a) => a.status === f.stage);
  out = applyScoreRange(out, f.scoreMin, f.scoreMax);
  if (f.appliedFrom) {
    const from = new Date(f.appliedFrom).getTime();
    if (!Number.isNaN(from)) out = out.filter((a) => new Date(a.appliedDate).getTime() >= from);
  }
  if (f.appliedTo) {
    // End of the chosen day, so "to 6 Aug" includes applications made on 6 Aug.
    const to = new Date(f.appliedTo).getTime() + 86_399_999;
    if (!Number.isNaN(to)) out = out.filter((a) => new Date(a.appliedDate).getTime() <= to);
  }
  return out;
}
