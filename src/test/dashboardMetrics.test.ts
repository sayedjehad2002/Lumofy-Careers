import { describe, it, expect } from "vitest";
import {
  dailyCounts,
  statusBreakdown,
  qualityBands,
  actionQueue,
  applicationsPerRole,
  oldestUnreviewed,
  topUnreviewed,
} from "@/lib/dashboardMetrics";
import { APPLICANT_STATUSES } from "@/types/careers";
import type { Applicant, Job, ApplicantStatus } from "@/types/careers";

const DAY = 86400000;
const NOW = 1_700_000_000_000; // fixed reference for deterministic tests

describe("dailyCounts", () => {
  it("buckets ISO dates into the last N day-slots, newest last", () => {
    const dates = [
      new Date(NOW).toISOString(), // age 0 → last slot
      new Date(NOW - 1 * DAY).toISOString(), // age 1
      new Date(NOW - 1 * DAY).toISOString(), // age 1 (two same day)
      new Date(NOW - 13 * DAY).toISOString(), // age 13 → first slot
      new Date(NOW - 99 * DAY).toISOString(), // out of window → ignored
    ];
    const out = dailyCounts(dates, 14, NOW);
    expect(out).toHaveLength(14);
    expect(out[13]).toBe(1); // today
    expect(out[12]).toBe(2); // yesterday
    expect(out[0]).toBe(1); // 13 days ago
    expect(out.reduce((a, b) => a + b, 0)).toBe(4); // 99d one excluded
  });
  it("ignores invalid dates", () => {
    expect(dailyCounts(["nope", ""], 7, NOW).reduce((a, b) => a + b, 0)).toBe(0);
  });
});

// Minimal Applicant factory — every field a real applicant carries, with sane
// defaults so each test only overrides what it cares about.
function app(overrides: Partial<Applicant> = {}): Applicant {
  return {
    id: "a1",
    jobId: "job1",
    fullName: "Jane Doe",
    email: "jane@example.com",
    phone: "+973 1234 5678",
    location: "Manama, Bahrain",
    cvFileName: "jane-doe-cv.pdf",
    screeningAnswers: {},
    status: "new",
    appliedDate: "2026-01-01T00:00:00.000Z",
    notes: [],
    ...overrides,
  };
}

function job(overrides: Partial<Job> = {}): Job {
  return {
    id: "job1",
    title: "Software Engineer",
    department: "Engineering",
    location: "Manama, Bahrain",
    type: "Full-time",
    status: "open",
    summary: "",
    description: "",
    responsibilities: [],
    requirements: [],
    benefits: [],
    postedDate: "2026-01-01T00:00:00.000Z",
    screeningQuestions: [],
    ...overrides,
  };
}

describe("statusBreakdown", () => {
  it("counts every status including rejected", () => {
    const applicants = [
      app({ id: "1", status: "new" }),
      app({ id: "2", status: "rejected" }),
      app({ id: "3", status: "hired" }),
    ];
    const result = statusBreakdown(applicants);
    const rejected = result.find((s) => s.status === "rejected");
    expect(rejected?.count).toBe(1);
  });

  it("slices sum to applicants.length", () => {
    const applicants: Applicant[] = [
      ...Array.from({ length: 340 }, (_, i) => app({ id: `new-${i}`, status: "new" })),
      ...Array.from({ length: 7 }, (_, i) => app({ id: `rej-${i}`, status: "rejected" })),
      app({ id: "hired-1", status: "hired" }),
    ];
    const result = statusBreakdown(applicants);
    const total = result.reduce((sum, s) => sum + s.count, 0);
    expect(total).toBe(applicants.length);
    expect(applicants.length).toBe(348);
  });

  it("includes every status present even at zero count", () => {
    const applicants = [app({ id: "1", status: "new" })];
    const result = statusBreakdown(applicants);
    expect(result.map((s) => s.status)).toEqual(APPLICANT_STATUSES.map((s) => s.value));
  });
});

describe("qualityBands", () => {
  const withScore = (id: string, fitScore: number) =>
    app({ id, aiAnalysis: { fitScore } as Applicant["aiAnalysis"] });

  it("places boundary scores into the correct bands", () => {
    const applicants = [
      withScore("top-85", 85),
      withScore("strong-84", 84),
      withScore("strong-70", 70),
      withScore("moderate-69", 69),
      withScore("moderate-50", 50),
      withScore("weak-49", 49),
    ];
    const { bands } = qualityBands(applicants);
    const byBand = Object.fromEntries(bands.map((b) => [b.band, b.count]));
    expect(byBand.Top).toBe(1);
    expect(byBand.Strong).toBe(2);
    expect(byBand.Moderate).toBe(2);
    expect(byBand.Weak).toBe(1);
  });

  it("excludes unscored applicants entirely and reflects scored count", () => {
    const applicants = [
      withScore("scored-1", 90),
      app({ id: "unscored-1" }),
      app({ id: "unscored-2" }),
    ];
    const { bands, scored } = qualityBands(applicants);
    expect(scored).toBe(1);
    const total = bands.reduce((sum, b) => sum + b.count, 0);
    expect(total).toBe(1);
  });

  it("treats fitScore 0 as scored, not absent", () => {
    const applicants = [withScore("zero", 0)];
    const { bands, scored } = qualityBands(applicants);
    expect(scored).toBe(1);
    const weak = bands.find((b) => b.band === "Weak");
    expect(weak?.count).toBe(1);
  });
});

describe("actionQueue", () => {
  const now = new Date("2026-08-09T00:00:00.000Z").getTime();

  it("counts fast-track only while status is new", () => {
    const applicants = [
      app({
        id: "1",
        status: "new",
        aiAnalysis: { recommendation: "Fast-Track to Interview" } as Applicant["aiAnalysis"],
      }),
      app({
        id: "2",
        status: "reviewing",
        aiAnalysis: { recommendation: "Fast-Track to Interview" } as Applicant["aiAnalysis"],
      }),
    ];
    const rows = actionQueue(applicants, now);
    const fastTrack = rows.find((r) => r.id === "fastTrackNew");
    expect(fastTrack?.count).toBe(1);
  });

  it("counts one fast-track candidate toward both fastTrackNew and unreviewed (documented overlap)", () => {
    const applicants = [
      app({
        id: "1",
        status: "new",
        aiAnalysis: { recommendation: "Fast-Track to Interview" } as Applicant["aiAnalysis"],
      }),
    ];
    const rows = actionQueue(applicants, now);
    expect(rows.find((r) => r.id === "fastTrackNew")?.count).toBe(1);
    expect(rows.find((r) => r.id === "unreviewed")?.count).toBe(1);
  });

  it("counts applicants awaiting AI analysis", () => {
    const applicants = [app({ id: "1", status: "reviewing" })]; // no aiAnalysis
    const rows = actionQueue(applicants, now);
    expect(rows.find((r) => r.id === "awaitingAi")?.count).toBe(1);
  });

  it("counts not-recommended candidates still sitting in New", () => {
    const applicants = [
      app({
        id: "1",
        status: "new",
        aiAnalysis: { recommendation: "Not Recommended" } as Applicant["aiAnalysis"],
      }),
    ];
    const rows = actionQueue(applicants, now);
    expect(rows.find((r) => r.id === "notRecommendedNew")?.count).toBe(1);
  });

  it("flags an interview as stalled only after more than 7 full days", () => {
    const eightDaysAgo = new Date(now - 8 * 86_400_000).toISOString();
    const sixDaysAgo = new Date(now - 6 * 86_400_000).toISOString();
    const applicants = [
      app({ id: "stalled", status: "interview", stageEnteredAt: eightDaysAgo }),
      app({ id: "fresh", status: "interview", stageEnteredAt: sixDaysAgo }),
    ];
    const rows = actionQueue(applicants, now);
    const stalledRow = rows.find((r) => r.id === "stalledInterviews");
    expect(stalledRow?.count).toBe(1);
  });

  it("does not flag an interview as stalled at exactly 7.0 days (strict >)", () => {
    const exactlySevenDaysAgo = new Date(now - 7 * 86_400_000).toISOString();
    const applicants = [app({ id: "borderline", status: "interview", stageEnteredAt: exactlySevenDaysAgo })];
    const rows = actionQueue(applicants, now);
    expect(rows.find((r) => r.id === "stalledInterviews")).toBeUndefined();
  });

  it("omits rows with a zero count — a hired-only pool returns []", () => {
    // Already analyzed, so it doesn't also trip awaitingAi — a hired candidate
    // should not surface on any of the five action rows.
    const applicants = [
      app({ id: "1", status: "hired", aiAnalysis: { fitScore: 90 } as Applicant["aiAnalysis"] }),
    ];
    const rows = actionQueue(applicants, now);
    expect(rows).toEqual([]);
  });
});

describe("applicationsPerRole", () => {
  it("includes open roles with zero applications and sorts descending", () => {
    const jobs = [
      job({ id: "busy", title: "Busy Role" }),
      job({ id: "empty", title: "Empty Role" }),
    ];
    const applicants = [
      app({ id: "1", jobId: "busy" }),
      app({ id: "2", jobId: "busy" }),
    ];
    const result = applicationsPerRole(applicants, jobs);
    expect(result).toEqual([
      { jobId: "busy", title: "Busy Role", count: 2 },
      { jobId: "empty", title: "Empty Role", count: 0 },
    ]);
  });

  it("excludes closed and archived roles", () => {
    const jobs = [
      job({ id: "open1", title: "Open Role", status: "open" }),
      job({ id: "closed1", title: "Closed Role", status: "closed" }),
      job({ id: "archived1", title: "Archived Role", status: "open", archivedAt: "2026-01-01T00:00:00.000Z" }),
    ];
    const applicants = [app({ id: "1", jobId: "closed1" }), app({ id: "2", jobId: "archived1" })];
    const result = applicationsPerRole(applicants, jobs);
    expect(result.map((r) => r.jobId)).toEqual(["open1"]);
  });
});

describe("oldestUnreviewed", () => {
  it("returns the earliest appliedDate among status new only", () => {
    const applicants = [
      app({ id: "1", status: "new", appliedDate: "2026-03-01T00:00:00.000Z" }),
      app({ id: "2", status: "new", appliedDate: "2026-01-15T00:00:00.000Z" }),
      app({ id: "3", status: "reviewing", appliedDate: "2025-01-01T00:00:00.000Z" }),
    ];
    expect(oldestUnreviewed(applicants)).toBe("2026-01-15T00:00:00.000Z");
  });

  it("returns null when nothing is unreviewed", () => {
    const applicants = [app({ id: "1", status: "hired" }), app({ id: "2", status: "rejected" })];
    expect(oldestUnreviewed(applicants)).toBeNull();
  });

  it("skips a malformed appliedDate rather than letting it poison the reduce seed", () => {
    // The reduce used to seed on dates[0] with no NaN guard: `validDate < NaN` is
    // always false, so a garbage first value silently beat a genuinely earlier one.
    const applicants = [
      app({ id: "bad", status: "new", appliedDate: "not-a-date" }),
      app({ id: "good", status: "new", appliedDate: "2026-01-01T00:00:00.000Z" }),
    ];
    expect(oldestUnreviewed(applicants)).toBe("2026-01-01T00:00:00.000Z");
  });
});

describe("topUnreviewed", () => {
  const scored = (id: string, jobId: string, fitScore: number, status: ApplicantStatus = "new") =>
    app({ id, jobId, status, aiAnalysis: { fitScore } as Applicant["aiAnalysis"] });

  it("returns only scored and unreviewed candidates, highest score first", () => {
    const applicants = [
      scored("low", "job1", 60),
      scored("high", "job1", 95),
      scored("hired-high", "job1", 99, "hired"),
      app({ id: "unscored", jobId: "job1", status: "new" }),
    ];
    const result = topUnreviewed(applicants);
    expect(result.map((a) => a.id)).toEqual(["high", "low"]);
  });

  it("filters by job when a jobId is given", () => {
    const applicants = [
      scored("a", "job1", 90),
      scored("b", "job2", 95),
    ];
    const result = topUnreviewed(applicants, "job1");
    expect(result.map((a) => a.id)).toEqual(["a"]);
  });

  it("respects the limit", () => {
    const applicants = Array.from({ length: 10 }, (_, i) => scored(`c-${i}`, "job1", 50 + i));
    const result = topUnreviewed(applicants, undefined, 3);
    expect(result).toHaveLength(3);
  });
});
