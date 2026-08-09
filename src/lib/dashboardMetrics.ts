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
  /**
   * DISTINCT candidates matching at least one candidate-level condition.
   *
   * The buckets above overlap heavily (an unreviewed applicant is usually also
   * past its stage SLA), and `jobsClosingSoon` counts JOBS, not people. Adding
   * them produced a headline larger than the entire applicant population —
   * "652 need attention" out of 348 candidates. Always use this for a total.
   */
  candidatesNeedingAction: number;
  /** Analyzed / total — surfaces how much of the pipeline the AI has actually read. */
  awaitingAnalysis: number;
};

/** The actionable "Needs attention" counts — all real conditions. */
export function computeAttention(applicants: Applicant[], jobs: Job[], now: number): Attention {
  const ageDays = (iso?: string) => (now - new Date(iso || 0).getTime()) / DAY;
  const isStalledInterview = (a: Applicant) =>
    a.status === "interview" && ageDays(a.stageEnteredAt || a.appliedDate) > 7;
  const isSlaBreach = (a: Applicant) => {
    const sla = (STAGE_SLA_DAYS as Record<string, number>)[a.status];
    return sla ? ageDays(a.stageEnteredAt || a.appliedDate) > sla : false;
  };
  const needsAction = (a: Applicant) =>
    a.status === "new" || isStalledInterview(a) || isSlaBreach(a);

  return {
    unreviewed: applicants.filter((a) => a.status === "new").length,
    stalledInterviews: applicants.filter(isStalledInterview).length,
    jobsClosingSoon: jobs.filter((j) => {
      if (j.status !== "open" || !j.deadline) return false;
      const d = (new Date(j.deadline).getTime() - now) / DAY;
      return d >= 0 && d <= 7;
    }).length,
    slaBreaches: applicants.filter(isSlaBreach).length,
    candidatesNeedingAction: applicants.filter(needsAction).length,
    awaitingAnalysis: applicants.filter((a) => !a.aiAnalysis).length,
  };
}
