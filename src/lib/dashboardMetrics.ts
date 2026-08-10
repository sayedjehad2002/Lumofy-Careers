// Pure, testable derivations for the dashboard's "live intelligence" widgets.
// Every value comes from real Applicant/Job fields. `now` is injected so the
// helpers are deterministic under test (no Date.now() inside).
import type { AIAnalysis, Applicant, ApplicantStatus, Job } from "@/types/careers";
import { APPLICANT_STATUSES } from "@/types/careers";
import { isStalledInterview } from "./pipelineMetrics";

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

// Stage/SLA vocabulary lives in pipelineMetrics.ts. Importing rather than
// keeping a second copy is what stops the Overview's "interviews with no
// movement for a week" row and the Pipeline board's "Interviews stalled" chip
// from answering the same question with two different numbers.
export { isStalledInterview };

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
    status: value, label, count: counts.get(value) ?? 0,
  }));
}

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
  const recommendationIs = (a: Applicant, value: AIAnalysis["recommendation"]) =>
    a.aiAnalysis?.recommendation === value;

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
      count: applicants.filter((a) => isStalledInterview(a, now)).length,
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
  const dates = applicants
    .filter((a) => a.status === "new")
    .map((a) => a.appliedDate)
    .filter((d) => Boolean(d) && !Number.isNaN(new Date(d).getTime()));
  if (dates.length === 0) return null;
  return dates.reduce((oldest, d) => (new Date(d) < new Date(oldest) ? d : oldest));
}

/**
 * Best candidates nobody has looked at yet. A "top matches" board that includes
 * people already hired or rejected is a trophy cabinet; this stays a queue.
 */
export function topUnreviewed(applicants: Applicant[], jobId?: string, limit = 6): Applicant[] {
  return applicants
    .filter((a) => a.status === "new" && typeof a.aiAnalysis?.fitScore === "number")
    .filter((a) => !jobId || a.jobId === jobId)
    .sort((a, b) => b.aiAnalysis!.fitScore - a.aiAnalysis!.fitScore)
    .slice(0, limit);
}
