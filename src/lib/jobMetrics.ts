// Pure, testable derivations for the Jobs screen.
//
// Same contract as dashboardMetrics.ts / pipelineMetrics.ts: values come from real
// Job/Applicant fields and `now` is injected, so nothing here reads the clock.
import type { Applicant, Job } from "@/types/careers";

const DAY = 86_400_000;

/**
 * A role is starving when almost nobody has applied and it has had long enough
 * that "it's new" no longer explains it.
 *
 * Two applicants rather than zero, because one applicant is not a pipeline; a
 * fortnight because several roles here are only 6-8 days old and flagging those
 * would just be flagging "recently posted".
 */
export const SOURCING_MAX_APPLICANTS = 2;
export const SOURCING_MIN_DAYS = 14;

/**
 * A role has a backlog when this many applications have never been opened.
 *
 * A round number, deliberately: any unreviewed application is worth doing
 * something about, so this is not "the threshold at which it matters" but "the
 * threshold at which it has got away from you". The exact count is always shown
 * next to the flag, so nothing is hidden behind it.
 */
export const BACKLOG_MIN_UNREVIEWED = 20;

export type JobAttention = "starving" | "backlog" | "healthy";

export type JobRow = {
  job: Job;
  applicants: number;
  /** Applications still sitting in `new` — the work this role is actually creating. */
  unreviewed: number;
  /** Candidates already hired into this role — the outcome no other number here shows. */
  hired: number;
  daysOpen: number;
  attention: JobAttention;
};

/** Whole days since the job was posted. Never negative; 0 for an unparseable date. */
export function daysOpen(job: Job, now: number): number {
  const t = new Date(job.postedDate).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((now - t) / DAY));
}

/**
 * Which of the two problems (if either) this role has.
 *
 * Starving outranks backlog: a role nobody has applied to cannot also be
 * drowning, and if both somehow held, no-candidates is the harder problem.
 * Closed roles are never flagged — nothing is expected of them.
 */
export function jobAttention(job: Job, applicants: number, unreviewed: number, days: number): JobAttention {
  if (job.status !== "open") return "healthy";
  if (applicants <= SOURCING_MAX_APPLICANTS && days >= SOURCING_MIN_DAYS) return "starving";
  if (unreviewed >= BACKLOG_MIN_UNREVIEWED) return "backlog";
  return "healthy";
}

/**
 * One pass over the applicants, then one row per job.
 *
 * Counting into a Map first keeps this linear — the old screen called a
 * `getApplicantCount` helper per job that filtered the whole applicant array
 * each time.
 */
export function jobRows(jobs: Job[], applicants: Applicant[], now: number): JobRow[] {
  const total = new Map<string, number>();
  const fresh = new Map<string, number>();
  const hires = new Map<string, number>();
  for (const a of applicants) {
    total.set(a.jobId, (total.get(a.jobId) ?? 0) + 1);
    if (a.status === "new") fresh.set(a.jobId, (fresh.get(a.jobId) ?? 0) + 1);
    if (a.status === "hired") hires.set(a.jobId, (hires.get(a.jobId) ?? 0) + 1);
  }
  return jobs.map((job) => {
    const count = total.get(job.id) ?? 0;
    const unreviewed = fresh.get(job.id) ?? 0;
    const days = daysOpen(job, now);
    return {
      job,
      applicants: count,
      unreviewed,
      hired: hires.get(job.id) ?? 0,
      daysOpen: days,
      attention: jobAttention(job, count, unreviewed, days),
    };
  });
}

export type JobSort = "attention" | "applicants" | "newest" | "department";

export const JOB_SORT_LABELS: Record<JobSort, string> = {
  attention: "Needs attention",
  applicants: "Most applicants",
  newest: "Newest first",
  department: "Department",
};

const ATTENTION_RANK: Record<JobAttention, number> = { starving: 0, backlog: 1, healthy: 2 };

/**
 * Sort a copy — never the caller's array.
 *
 * Array.prototype.sort is stable, so ties keep their incoming order rather than
 * reshuffling between renders.
 */
export function sortJobs(rows: JobRow[], mode: JobSort): JobRow[] {
  const out = [...rows];
  if (mode === "attention") {
    out.sort((a, b) => {
      const rank = ATTENTION_RANK[a.attention] - ATTENTION_RANK[b.attention];
      if (rank !== 0) return rank;
      // Within starving, the ones that have been waiting longest are worst.
      if (a.attention === "starving") return b.daysOpen - a.daysOpen;
      // Within backlog and healthy alike, bigger piles first.
      return b.unreviewed - a.unreviewed || b.applicants - a.applicants;
    });
  } else if (mode === "applicants") {
    out.sort((a, b) => b.applicants - a.applicants);
  } else if (mode === "newest") {
    out.sort((a, b) => a.daysOpen - b.daysOpen);
  } else {
    out.sort((a, b) =>
      a.job.department.localeCompare(b.job.department) || b.applicants - a.applicants);
  }
  return out;
}

export type JobsSummary = {
  open: number;
  closed: number;
  starving: number;
  backlog: number;
  /** Applications across every listed role that nobody has opened. */
  unreviewed: number;
};

export function jobsSummary(rows: JobRow[]): JobsSummary {
  return {
    open: rows.filter((r) => r.job.status === "open").length,
    closed: rows.filter((r) => r.job.status === "closed").length,
    starving: rows.filter((r) => r.attention === "starving").length,
    backlog: rows.filter((r) => r.attention === "backlog").length,
    unreviewed: rows.reduce((n, r) => n + r.unreviewed, 0),
  };
}

export type JobFilter = "all" | "starving" | "backlog" | "closed";

export const JOB_FILTERS: Record<JobFilter, (r: JobRow) => boolean> = {
  all: () => true,
  starving: (r) => r.attention === "starving",
  backlog: (r) => r.attention === "backlog",
  closed: (r) => r.job.status === "closed",
};
