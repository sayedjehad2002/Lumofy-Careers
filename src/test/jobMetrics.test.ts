import { describe, it, expect } from "vitest";
import {
  daysOpen, jobAttention, jobRows, sortJobs, jobsSummary, JOB_FILTERS,
  SOURCING_MAX_APPLICANTS, SOURCING_MIN_DAYS, BACKLOG_MIN_UNREVIEWED,
  type JobRow,
} from "@/lib/jobMetrics";
import type { Applicant, Job } from "@/types/careers";

const DAY = 86400000;
const NOW = 1_700_000_000_000;
const daysAgo = (n: number) => new Date(NOW - n * DAY).toISOString();

function job(overrides: Partial<Job> = {}): Job {
  return {
    id: "job1",
    title: "Software Engineer",
    department: "Engineering",
    location: "Bahrain",
    type: "Full-time",
    status: "open",
    summary: "",
    description: "",
    responsibilities: [],
    requirements: [],
    benefits: [],
    postedDate: daysAgo(30),
    screeningQuestions: [],
    ...overrides,
  };
}

function app(overrides: Partial<Applicant> = {}): Applicant {
  return {
    id: "a1",
    jobId: "job1",
    fullName: "Jane Doe",
    email: "jane@example.com",
    phone: "",
    location: "",
    cvFileName: "cv.pdf",
    screeningAnswers: {},
    status: "new",
    appliedDate: daysAgo(1),
    notes: [],
    ...overrides,
  };
}

describe("daysOpen", () => {
  it("floors to whole days and never goes negative", () => {
    expect(daysOpen(job({ postedDate: daysAgo(30) }), NOW)).toBe(30);
    expect(daysOpen(job({ postedDate: new Date(NOW + 5 * DAY).toISOString() }), NOW)).toBe(0);
  });

  it("returns 0 rather than NaN for an unparseable date", () => {
    expect(daysOpen(job({ postedDate: "not-a-date" }), NOW)).toBe(0);
  });
});

describe("jobAttention", () => {
  it("flags a role nobody is applying to, once it is old enough to matter", () => {
    expect(jobAttention(job(), SOURCING_MAX_APPLICANTS, 1, SOURCING_MIN_DAYS)).toBe("starving");
  });

  it("does not flag a brand new role for having few applicants", () => {
    // Several real roles are 6-8 days old; flagging those would just be flagging
    // "recently posted".
    expect(jobAttention(job(), 1, 1, SOURCING_MIN_DAYS - 1)).toBe("healthy");
  });

  it("does not flag a busy role as starving", () => {
    expect(jobAttention(job(), SOURCING_MAX_APPLICANTS + 1, 0, 90)).toBe("healthy");
  });

  it("flags an unreviewed pile that has got away from you", () => {
    expect(jobAttention(job(), 100, BACKLOG_MIN_UNREVIEWED, 40)).toBe("backlog");
    expect(jobAttention(job(), 100, BACKLOG_MIN_UNREVIEWED - 1, 40)).toBe("healthy");
  });

  it("puts starving ahead of backlog when both could apply", () => {
    // Not reachable with real data, but the ordering should be deliberate:
    // no-candidates is the harder problem than unopened-candidates.
    expect(jobAttention(job(), 1, 999, 60)).toBe("starving");
  });

  it("never flags a closed role", () => {
    expect(jobAttention(job({ status: "closed" }), 0, 0, 500)).toBe("healthy");
  });
});

describe("jobRows", () => {
  it("counts applicants and unreviewed per job in one pass", () => {
    const jobs = [job({ id: "j1" }), job({ id: "j2" })];
    const applicants = [
      app({ id: "1", jobId: "j1", status: "new" }),
      app({ id: "2", jobId: "j1", status: "hired" }),
      app({ id: "3", jobId: "j2", status: "new" }),
    ];
    const rows = jobRows(jobs, applicants, NOW);
    expect(rows[0]).toMatchObject({ applicants: 2, unreviewed: 1 });
    expect(rows[1]).toMatchObject({ applicants: 1, unreviewed: 1 });
  });

  it("gives a job with no applicants zeros rather than undefined", () => {
    const rows = jobRows([job({ id: "empty" })], [], NOW);
    expect(rows[0]).toMatchObject({ applicants: 0, unreviewed: 0 });
  });

  it("surfaces hires, which a 1-in-98 sliver would hide", () => {
    const rows = jobRows(
      [job({ id: "csm" })],
      [
        app({ id: "h", jobId: "csm", status: "hired" }),
        ...Array.from({ length: 97 }, (_, i) => app({ id: `n${i}`, jobId: "csm", status: "new" })),
      ],
      NOW,
    );
    expect(rows[0].hired).toBe(1);
    expect(rows[0].applicants).toBe(98);
  });

  it("row count always matches job count", () => {
    const jobs = [job({ id: "a" }), job({ id: "b" }), job({ id: "c" })];
    // An applicant pointing at a job that is not listed must not create a row.
    expect(jobRows(jobs, [app({ jobId: "ghost" })], NOW)).toHaveLength(3);
  });
});

describe("sortJobs", () => {
  const row = (
    id: string, applicants: number, unreviewed: number, daysOpen: number, attention: JobRow["attention"],
  ): JobRow => ({
    job: job({ id }),
    applicants,
    unreviewed,
    hired: 0,
    daysOpen,
    attention,
  });

  const starvingOld = row("s-old", 1, 1, 49, "starving");
  const starvingNew = row("s-new", 1, 1, 33, "starving");
  const backlogBig = row("b-big", 98, 95, 48, "backlog");
  const healthy = row("ok", 8, 2, 60, "healthy");
  const rows = [healthy, backlogBig, starvingNew, starvingOld];

  it("leads with starving roles, longest-waiting first", () => {
    expect(sortJobs(rows, "attention").map((r) => r.job.id)).toEqual(["s-old", "s-new", "b-big", "ok"]);
  });

  it("orders by volume, recency and department on the other modes", () => {
    expect(sortJobs(rows, "applicants")[0].job.id).toBe("b-big");
    expect(sortJobs(rows, "newest")[0].job.id).toBe("s-new");
    expect(sortJobs(rows, "department").map((r) => r.job.department)[0]).toBe("Engineering");
  });

  it("does not mutate the caller's array", () => {
    const original = rows.map((r) => r.job.id);
    sortJobs(rows, "applicants");
    expect(rows.map((r) => r.job.id)).toEqual(original);
  });
});

describe("jobsSummary and filters", () => {
  const rows = jobRows(
    [
      job({ id: "starve", postedDate: daysAgo(40) }),
      job({ id: "busy", postedDate: daysAgo(40) }),
      job({ id: "shut", status: "closed" }),
    ],
    [
      app({ id: "x", jobId: "starve", status: "new" }),
      ...Array.from({ length: BACKLOG_MIN_UNREVIEWED }, (_, i) =>
        app({ id: `b${i}`, jobId: "busy", status: "new" })),
    ],
    NOW,
  );

  it("counts what the header sentence claims", () => {
    const s = jobsSummary(rows);
    expect(s).toMatchObject({ open: 2, closed: 1, starving: 1, backlog: 1 });
    expect(s.unreviewed).toBe(BACKLOG_MIN_UNREVIEWED + 1);
  });

  it("each filter returns exactly what its count promised", () => {
    const s = jobsSummary(rows);
    expect(rows.filter(JOB_FILTERS.starving)).toHaveLength(s.starving);
    expect(rows.filter(JOB_FILTERS.backlog)).toHaveLength(s.backlog);
    expect(rows.filter(JOB_FILTERS.closed)).toHaveLength(s.closed);
    expect(rows.filter(JOB_FILTERS.all)).toHaveLength(rows.length);
  });
});
