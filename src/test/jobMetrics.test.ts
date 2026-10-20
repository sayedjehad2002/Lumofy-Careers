import { describe, it, expect } from "vitest";
import {
  daysOpen, jobAttention, jobRows, sortJobs, jobsSummary, JOB_FILTERS,
  jobFilterGroups, jobFilterLabel, hasTitleTwin,
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
    mix: { fresh: unreviewed, inProcess: applicants - unreviewed, hired: 0, rejected: 0 },
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

describe("job filter", () => {
  // The case that prompted this: two openings with the same title in different teams.
  const salesIntern = job({ id: "fs-sales", title: "Full Stack Intern", department: "Sales" });
  const engIntern = job({ id: "fs-eng", title: "Full stack Intern", department: "Engineering" });
  const pm = job({ id: "pm", title: "Product Manager", department: "Product" });
  const oldEng = job({ id: "old", title: "Backend Developer", department: "Engineering", archivedAt: daysAgo(3) });
  const jobs = [salesIntern, pm, oldEng, engIntern];

  it("groups roles under their department, departments alphabetical", () => {
    const groups = jobFilterGroups(jobs);
    expect(groups.map((g) => g.department)).toEqual(["Engineering", "Product", "Sales"]);
    expect(groups[2].jobs.map((j) => j.id)).toEqual(["fs-sales"]);
  });

  it("puts live roles before archived ones inside a department", () => {
    const eng = jobFilterGroups(jobs).find((g) => g.department === "Engineering")!;
    expect(eng.jobs.map((j) => j.id)).toEqual(["fs-eng", "old"]);
  });

  it("searches the department as well as the title", () => {
    expect(jobFilterGroups(jobs, "sales").flatMap((g) => g.jobs.map((j) => j.id))).toEqual(["fs-sales"]);
    expect(jobFilterGroups(jobs, "full stack").flatMap((g) => g.jobs.map((j) => j.id))).toEqual(["fs-eng", "fs-sales"]);
    expect(jobFilterGroups(jobs, "nothing like this")).toEqual([]);
  });

  it("files a role with no department under a named group, not a blank one", () => {
    const groups = jobFilterGroups([job({ id: "x", department: "  " })]);
    expect(groups[0].department).toBe("No department");
  });

  it("treats titles that differ only in case or spacing as twins", () => {
    expect(hasTitleTwin(jobs, salesIntern)).toBe(true);
    expect(hasTitleTwin(jobs, pm)).toBe(false);
  });

  it("names the department on the button only when the title is ambiguous", () => {
    expect(jobFilterLabel(jobs, [])).toBe("All jobs");
    expect(jobFilterLabel(jobs, ["fs-sales"])).toBe("Full Stack Intern · Sales");
    expect(jobFilterLabel(jobs, ["pm"])).toBe("Product Manager");
    expect(jobFilterLabel(jobs, ["pm", "fs-eng"])).toBe("2 jobs");
    expect(jobFilterLabel(jobs, ["gone"])).toBe("1 job");
  });
});

describe("jobRows stage mix", () => {
  it("splits every applicant into exactly one bucket, summing to the total", () => {
    const applicants = [
      app({ id: "1", status: "new" }),
      app({ id: "2", status: "new" }),
      app({ id: "3", status: "reviewing" }),
      app({ id: "4", status: "shortlisted" }),
      app({ id: "5", status: "interview" }),
      app({ id: "6", status: "hired" }),
      app({ id: "7", status: "rejected" }),
      app({ id: "8", jobId: "other", status: "new" }),
    ];
    const [row] = jobRows([job()], applicants, NOW);
    expect(row.mix).toEqual({ fresh: 2, inProcess: 3, hired: 1, rejected: 1 });
    const { fresh, inProcess, hired, rejected } = row.mix;
    expect(fresh + inProcess + hired + rejected).toBe(row.applicants);
  });

  it("is all zeros for a role nobody has applied to", () => {
    const [row] = jobRows([job()], [], NOW);
    expect(row.mix).toEqual({ fresh: 0, inProcess: 0, hired: 0, rejected: 0 });
  });
});
