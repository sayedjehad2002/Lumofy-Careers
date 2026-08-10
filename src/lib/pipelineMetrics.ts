// Pure, testable derivations for the Pipeline board.
//
// Same contract as dashboardMetrics.ts: every value comes from real Applicant
// fields and `now` is injected, so nothing here reads the clock and every
// helper is deterministic under test.
//
// This module owns the stage/SLA vocabulary (how long someone has sat in a
// stage, and whether that is too long). dashboardMetrics.ts imports
// `isStalledInterview` from here rather than keeping its own copy, so the
// Overview's "interviews with no movement for a week" row and the board's
// "Interviews stalled" chip can never drift apart and show two different
// numbers for the same question.
import type { Applicant, ApplicantStatus } from "@/types/careers";
import { APPLICANT_STATUSES, STAGE_SLA_DAYS } from "@/types/careers";

const DAY = 86_400_000;

/**
 * Stages nobody works out of. They stay on the board — you still need to drop
 * people into them and see the counts — but they default to slim rails so the
 * four active stages get the width. At 1920px six equal columns give each about
 * 258px, which truncates most real names.
 */
export const TERMINAL_STAGES: ReadonlySet<ApplicantStatus> = new Set<ApplicantStatus>(["rejected", "hired"]);

/**
 * Column order for the board.
 *
 * Deliberately derived from APPLICANT_STATUSES rather than hand-written, for
 * the same reason the Overview's status strip is: a status added to the type
 * must appear here automatically instead of being silently dropped off the
 * board. APPLICANT_STATUSES itself is left alone — dashboardMetrics'
 * statusBreakdown and its test depend on that array's order.
 */
export const BOARD_STAGES = APPLICANT_STATUSES;

/**
 * Whole days a candidate has sat in their current stage.
 *
 * Falls back to `appliedDate` when `stageEnteredAt` is missing. The card used
 * to return 0 in that case, which reads as "moved here today" — the opposite
 * of the truth for a months-old application, and it disagreed with
 * `isStalledInterview`, which has always used the fallback. Every row in
 * production currently has `stage_entered_at`, so this is latent rather than
 * active, but the two definitions should not have differed.
 */
export function daysInStage(a: Applicant, now: number): number {
  const t = new Date(a.stageEnteredAt || a.appliedDate).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((now - t) / DAY));
}

export type SlaState = "ok" | "over" | "critical";

/**
 * How a candidate's wait reads against *their own stage's* SLA.
 *
 * The card used to flag a flat 30 days regardless of stage, which is both too
 * slow for Interview (SLA 5) and meaningless for New (SLA 3, where the average
 * card is 29 days old). Terminal stages have no SLA and are always "ok" —
 * nothing is overdue once it is rejected or hired.
 *
 * Boundaries are strict (`>`), matching actionQueue's documented behaviour:
 * exactly 3.0 days in New is not yet over.
 */
export function slaState(status: ApplicantStatus, days: number): SlaState {
  const sla = STAGE_SLA_DAYS[status];
  if (sla === undefined) return "ok";
  if (days > sla * 2) return "critical";
  if (days > sla) return "over";
  return "ok";
}

/**
 * An interview stage with no movement for over a week.
 *
 * Moved here from dashboardMetrics.ts with the body unchanged. Note this is a
 * plain 7-day week, NOT the Interview SLA of 5 days — the Overview labels the
 * row "no movement for a week" and two tests lock the strict `> 7` boundary.
 * Per-stage SLA colouring on the card is a different question; that is
 * `slaState`.
 */
export function isStalledInterview(a: Applicant, now: number): boolean {
  return a.status === "interview" && (now - new Date(a.stageEnteredAt || a.appliedDate).getTime()) / DAY > 7;
}

/**
 * Bucket applicants by stage in a single pass.
 *
 * Replaces twelve separate `filter()` sweeps per render (six for the header
 * chips, six more for the columns). The point is correctness rather than speed
 * at this data size: the chip and the column badge now read the same object and
 * cannot disagree. Every stage gets a key, so a column never guards against
 * undefined.
 */
export function groupByStage(applicants: Applicant[]): Record<ApplicantStatus, Applicant[]> {
  const out = {} as Record<ApplicantStatus, Applicant[]>;
  for (const s of APPLICANT_STATUSES) out[s.value] = [];
  for (const a of applicants) {
    // A row with a status outside the union (bad data) would otherwise throw
    // on push; drop it rather than crash the board.
    if (out[a.status]) out[a.status].push(a);
  }
  return out;
}

/**
 * Which stages start as rails: the terminal ones, plus anything empty.
 *
 * Derived rather than stored, so only explicit user toggles need persisting.
 * That is what fixes the existing bug where a *manually* collapsed column stayed
 * a rail forever — the old `collapsedCols[status] ?? isEmpty` had no way to tell
 * "user chose this" from "defaulted to this".
 */
export function defaultCollapsedStages(counts: Record<ApplicantStatus, number>): ApplicantStatus[] {
  return APPLICANT_STATUSES.map((s) => s.value).filter((v) => TERMINAL_STAGES.has(v) || (counts[v] ?? 0) === 0);
}

export type TriageFactId = "fastTrack" | "stalledInterviews" | "unscoredNew" | "arrivedThisWeek";

/**
 * The predicate behind each triage chip.
 *
 * The chips are filters, not decoration: clicking one narrows the board to the
 * people it counted. Both the count and the filter read from this single map,
 * so a chip can never claim 47 and then show a different set. There is a test
 * that locks exactly that.
 */
export const TRIAGE_FILTERS: Record<TriageFactId, (a: Applicant, now: number) => boolean> = {
  fastTrack: (a) => a.status === "new" && a.aiAnalysis?.recommendation === "Fast-Track to Interview",
  stalledInterviews: (a, now) => isStalledInterview(a, now),
  // `!a.aiAnalysis` would treat a legitimate fitScore of 0 as unscored; the
  // presence of the analysis object is the question, not its contents.
  unscoredNew: (a) => a.status === "new" && a.aiAnalysis == null,
  arrivedThisWeek: (a, now) => {
    if (a.status !== "new") return false;
    const t = new Date(a.stageEnteredAt || a.appliedDate).getTime();
    if (Number.isNaN(t)) return false;
    const age = now - t;
    // `< 7 days`, matching dailyCounts' bucketing, so "this week" means the same
    // thing on both screens.
    return age >= 0 && age < 7 * DAY;
  },
};

export type TriageTone = "accent" | "warning" | "muted" | "neutral";

export type TriageFact = {
  id: TriageFactId;
  label: string;
  count: number;
  tone: TriageTone;
  /** Plain-language definition, surfaced as the chip's title so no number on the page is unexplained. */
  hint: string;
};

const TRIAGE_META: Record<TriageFactId, { label: string; tone: TriageTone; hint: string }> = {
  fastTrack: {
    label: "Fast-track waiting",
    tone: "accent",
    hint: "AI recommended fast-tracking them to interview, and nobody has opened them yet",
  },
  stalledInterviews: {
    label: "Interviews stalled",
    tone: "warning",
    hint: "At the interview stage with no movement for over a week",
  },
  unscoredNew: {
    label: "Unscored in New",
    tone: "muted",
    hint: "Still in New with no AI analysis, so there is no score to sort them by",
  },
  arrivedThisWeek: {
    label: "Arrived this week",
    tone: "neutral",
    hint: "Landed in New in the last 7 days",
  },
};

const TRIAGE_ORDER: TriageFactId[] = ["fastTrack", "stalledInterviews", "unscoredNew", "arrivedThisWeek"];

/**
 * The header facts, counted in one pass over the applicants.
 *
 * These deliberately overlap — a fast-track candidate is also unscored-or-not
 * and may have arrived this week. They are four ways into the board, not a
 * partition, and must never be summed into a headline.
 */
export function triageFacts(applicants: Applicant[], now: number): TriageFact[] {
  const counts: Record<TriageFactId, number> = {
    fastTrack: 0,
    stalledInterviews: 0,
    unscoredNew: 0,
    arrivedThisWeek: 0,
  };
  for (const a of applicants) {
    for (const id of TRIAGE_ORDER) {
      if (TRIAGE_FILTERS[id](a, now)) counts[id] += 1;
    }
  }
  return TRIAGE_ORDER.map((id) => ({ id, count: counts[id], ...TRIAGE_META[id] }));
}

export type SortMode = "score" | "waiting" | "newest";

export const SORT_LABELS: Record<SortMode, string> = {
  score: "Highest score",
  waiting: "Longest waiting",
  newest: "Most recent",
};

/**
 * Sort a column's cards. Returns a new array — never mutates the input, which
 * would corrupt the grouped map the whole board renders from.
 *
 * Array.prototype.sort is stable, so equal keys keep their input order. That
 * matters more than it looks: the columns render a growing prefix of this array,
 * and an unstable order would visibly reshuffle cards on every re-render.
 *
 * Unscored candidates sort last under "score" rather than being treated as 0,
 * so 109 unanalysed people don't bury the scored ones.
 */
export function sortColumn(list: Applicant[], mode: SortMode, now: number): Applicant[] {
  const out = [...list];
  if (mode === "score") {
    out.sort((a, b) => {
      const diff = (b.aiAnalysis?.fitScore ?? -1) - (a.aiAnalysis?.fitScore ?? -1);
      // Two candidates on 97 are not equally urgent — show the one who has been
      // waiting longer first.
      return diff !== 0 ? diff : daysInStage(b, now) - daysInStage(a, now);
    });
  } else if (mode === "waiting") {
    out.sort((a, b) => daysInStage(b, now) - daysInStage(a, now));
  } else {
    out.sort((a, b) => daysInStage(a, now) - daysInStage(b, now));
  }
  return out;
}

/**
 * Board search over name, email and the role applied for.
 *
 * Multi-token AND: "batool market" matches Batool on the Marketing role, which
 * is how people actually search a board this size.
 *
 * `jobTitle` is passed in because an applicant's own jobTitle snapshot is null
 * on most older rows and the board resolves it from the job lookup — the same
 * fallback every other screen uses.
 */
export function matchesSearch(a: Applicant, jobTitle: string, query: string): boolean {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = `${a.fullName} ${a.email ?? ""} ${jobTitle}`.toLowerCase();
  return tokens.every((t) => haystack.includes(t));
}
