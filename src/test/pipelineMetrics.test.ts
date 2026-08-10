import { describe, it, expect } from "vitest";
import {
  BOARD_STAGES,
  TERMINAL_STAGES,
  daysInStage,
  slaState,
  isStalledInterview,
  groupByStage,
  defaultCollapsedStages,
  TRIAGE_FILTERS,
  triageFacts,
  sortColumn,
  matchesSearch,
} from "@/lib/pipelineMetrics";
import { actionQueue } from "@/lib/dashboardMetrics";
import { APPLICANT_STATUSES } from "@/types/careers";
import type { AIAnalysis, Applicant, ApplicantStatus } from "@/types/careers";

const DAY = 86400000;
const NOW = 1_700_000_000_000; // fixed reference for deterministic tests

// Same minimal-factory pattern as src/test/dashboardMetrics.test.ts.
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
    appliedDate: new Date(NOW).toISOString(),
    notes: [],
    ...overrides,
  };
}

/** Only the AIAnalysis fields these derivations read; the rest is noise here. */
function ai(overrides: Partial<AIAnalysis> = {}): AIAnalysis {
  return { fitScore: 70, recommendation: "Hold for Review", ...overrides } as AIAnalysis;
}

const daysAgo = (n: number) => new Date(NOW - n * DAY).toISOString();

function zeroCounts(): Record<ApplicantStatus, number> {
  return { new: 0, reviewing: 0, shortlisted: 0, interview: 0, rejected: 0, hired: 0 };
}

describe("BOARD_STAGES", () => {
  it("covers every status so a new one cannot fall off the board", () => {
    expect(BOARD_STAGES.map((s) => s.value)).toEqual(APPLICANT_STATUSES.map((s) => s.value));
  });
});

describe("daysInStage", () => {
  it("floors the wait to whole days", () => {
    expect(daysInStage(app({ stageEnteredAt: new Date(NOW - 2.9 * DAY).toISOString() }), NOW)).toBe(2);
  });

  it("falls back to appliedDate when stageEnteredAt is missing", () => {
    // The card used to return 0 here, reading as "moved here today" for an
    // application that is actually six weeks old.
    const a = app({ stageEnteredAt: undefined, appliedDate: daysAgo(42) });
    expect(daysInStage(a, NOW)).toBe(42);
  });

  it("never returns a negative number for a future date", () => {
    expect(daysInStage(app({ stageEnteredAt: new Date(NOW + 5 * DAY).toISOString() }), NOW)).toBe(0);
  });

  it("returns 0 rather than NaN for an unparseable date", () => {
    expect(daysInStage(app({ stageEnteredAt: "not-a-date", appliedDate: "also-bad" }), NOW)).toBe(0);
  });
});

describe("slaState", () => {
  it("uses each stage's own SLA rather than one flat threshold", () => {
    // New SLA 3, Interview SLA 5. Ten days means very different things.
    expect(slaState("new", 10)).toBe("critical");
    expect(slaState("interview", 10)).toBe("over");
  });

  it("treats the boundary as strict, matching actionQueue", () => {
    expect(slaState("new", 3)).toBe("ok");
    expect(slaState("new", 4)).toBe("over");
    expect(slaState("interview", 5)).toBe("ok");
    expect(slaState("interview", 6)).toBe("over");
  });

  it("escalates to critical past double the SLA", () => {
    expect(slaState("new", 6)).toBe("over");
    expect(slaState("new", 7)).toBe("critical");
  });

  it("never flags a terminal stage, which has no SLA", () => {
    for (const s of TERMINAL_STAGES) expect(slaState(s, 500)).toBe("ok");
  });
});

describe("isStalledInterview", () => {
  // Behaviour moved verbatim out of dashboardMetrics.ts; these mirror the two
  // tests already guarding it there, so the move cannot have changed anything.
  it("flags an interview only after more than 7 full days", () => {
    expect(isStalledInterview(app({ status: "interview", stageEnteredAt: daysAgo(8) }), NOW)).toBe(true);
    expect(isStalledInterview(app({ status: "interview", stageEnteredAt: daysAgo(6) }), NOW)).toBe(false);
  });

  it("does not flag at exactly 7.0 days (strict >)", () => {
    expect(isStalledInterview(app({ status: "interview", stageEnteredAt: daysAgo(7) }), NOW)).toBe(false);
  });

  it("ignores candidates in other stages", () => {
    expect(isStalledInterview(app({ status: "new", stageEnteredAt: daysAgo(40) }), NOW)).toBe(false);
  });
});

describe("groupByStage", () => {
  it("returns a key for every stage, even at zero", () => {
    const groups = groupByStage([]);
    for (const s of APPLICANT_STATUSES) expect(groups[s.value]).toEqual([]);
  });

  it("sums to the applicant count so no one can be silently dropped", () => {
    // The lesson statusBreakdown already learned: a hand-written stage list
    // once hid every rejected candidate on the Overview.
    const applicants = [
      app({ id: "1", status: "new" }),
      app({ id: "2", status: "rejected" }),
      app({ id: "3", status: "hired" }),
      app({ id: "4", status: "interview" }),
      app({ id: "5", status: "new" }),
    ];
    const groups = groupByStage(applicants);
    const total = APPLICANT_STATUSES.reduce((n, s) => n + groups[s.value].length, 0);
    expect(total).toBe(applicants.length);
    expect(groups.rejected).toHaveLength(1);
  });

  it("preserves input order within a stage, so prefix windows are stable", () => {
    const groups = groupByStage([app({ id: "a" }), app({ id: "b" }), app({ id: "c" })]);
    expect(groups.new.map((a) => a.id)).toEqual(["a", "b", "c"]);
  });
});

describe("defaultCollapsedStages", () => {
  it("rails the terminal stages even when they hold candidates", () => {
    const counts = { ...zeroCounts(), new: 300, rejected: 25, hired: 1 };
    const collapsed = defaultCollapsedStages(counts);
    expect(collapsed).toContain("rejected");
    expect(collapsed).toContain("hired");
  });

  it("rails empty working stages but never busy ones", () => {
    const counts = { ...zeroCounts(), new: 300, reviewing: 8 };
    const collapsed = defaultCollapsedStages(counts);
    expect(collapsed).toContain("shortlisted");
    expect(collapsed).not.toContain("new");
    expect(collapsed).not.toContain("reviewing");
  });
});

describe("triageFacts", () => {
  it("counts fast-track candidates only while they are still in New", () => {
    const applicants = [
      app({ id: "1", status: "new", aiAnalysis: ai({ recommendation: "Fast-Track to Interview" }) }),
      app({ id: "2", status: "reviewing", aiAnalysis: ai({ recommendation: "Fast-Track to Interview" }) }),
    ];
    const fact = triageFacts(applicants, NOW).find((f) => f.id === "fastTrack");
    expect(fact?.count).toBe(1);
  });

  it("treats a fitScore of 0 as scored, not unscored", () => {
    const applicants = [
      app({ id: "1", status: "new", aiAnalysis: ai({ fitScore: 0 }) }),
      app({ id: "2", status: "new", aiAnalysis: undefined }),
    ];
    const fact = triageFacts(applicants, NOW).find((f) => f.id === "unscoredNew");
    expect(fact?.count).toBe(1);
  });

  it("bounds 'this week' at under 7 days, matching dailyCounts", () => {
    const applicants = [
      app({ id: "in", status: "new", stageEnteredAt: daysAgo(6) }),
      app({ id: "edge", status: "new", stageEnteredAt: daysAgo(7) }),
    ];
    const fact = triageFacts(applicants, NOW).find((f) => f.id === "arrivedThisWeek");
    expect(fact?.count).toBe(1);
  });

  it("returns zeros rather than NaN for an empty board", () => {
    for (const fact of triageFacts([], NOW)) expect(fact.count).toBe(0);
  });

  it("counts exactly what clicking the chip would filter to", () => {
    // The whole point of the chips: the number and the filtered set come from
    // one predicate map, so a chip can never claim 47 and then show 40.
    const applicants = [
      app({ id: "1", status: "new", aiAnalysis: ai({ recommendation: "Fast-Track to Interview" }) }),
      app({ id: "2", status: "new", aiAnalysis: undefined }),
      app({ id: "3", status: "interview", stageEnteredAt: daysAgo(20) }),
      app({ id: "4", status: "hired", stageEnteredAt: daysAgo(2) }),
    ];
    for (const fact of triageFacts(applicants, NOW)) {
      const filtered = applicants.filter((a) => TRIAGE_FILTERS[fact.id](a, NOW));
      expect(filtered).toHaveLength(fact.count);
    }
  });

  it("agrees with the Overview on stalled interviews", () => {
    // Two screens, one definition. If these ever diverge the user sees the same
    // question answered two ways on two tabs.
    const applicants = [
      app({ id: "1", status: "interview", stageEnteredAt: daysAgo(20) }),
      app({ id: "2", status: "interview", stageEnteredAt: daysAgo(3) }),
    ];
    const chip = triageFacts(applicants, NOW).find((f) => f.id === "stalledInterviews");
    const row = actionQueue(applicants, NOW).find((r) => r.id === "stalledInterviews");
    expect(chip?.count).toBe(row?.count);
  });
});

describe("sortColumn", () => {
  it("sorts unscored candidates last instead of treating them as zero", () => {
    const applicants = [
      app({ id: "unscored", aiAnalysis: undefined }),
      app({ id: "low", aiAnalysis: ai({ fitScore: 12 }) }),
      app({ id: "high", aiAnalysis: ai({ fitScore: 91 }) }),
    ];
    expect(sortColumn(applicants, "score", NOW).map((a) => a.id)).toEqual(["high", "low", "unscored"]);
  });

  it("breaks equal scores by who has waited longer", () => {
    const applicants = [
      app({ id: "fresh", stageEnteredAt: daysAgo(1), aiAnalysis: ai({ fitScore: 97 }) }),
      app({ id: "waiting", stageEnteredAt: daysAgo(30), aiAnalysis: ai({ fitScore: 97 }) }),
    ];
    expect(sortColumn(applicants, "score", NOW).map((a) => a.id)).toEqual(["waiting", "fresh"]);
  });

  it("orders by longest and most recent wait", () => {
    const applicants = [
      app({ id: "mid", stageEnteredAt: daysAgo(10) }),
      app({ id: "old", stageEnteredAt: daysAgo(40) }),
      app({ id: "new", stageEnteredAt: daysAgo(1) }),
    ];
    expect(sortColumn(applicants, "waiting", NOW).map((a) => a.id)).toEqual(["old", "mid", "new"]);
    expect(sortColumn(applicants, "newest", NOW).map((a) => a.id)).toEqual(["new", "mid", "old"]);
  });

  it("does not mutate the array the board renders from", () => {
    const applicants = [app({ id: "a" }), app({ id: "b", aiAnalysis: ai({ fitScore: 99 }) })];
    sortColumn(applicants, "score", NOW);
    expect(applicants.map((a) => a.id)).toEqual(["a", "b"]);
  });
});

describe("matchesSearch", () => {
  it("matches name, email or role, case-insensitively", () => {
    const a = app({ fullName: "Batool Jalal", email: "Batool@Example.com" });
    expect(matchesSearch(a, "Customer Marketing Intern", "batool")).toBe(true);
    expect(matchesSearch(a, "Customer Marketing Intern", "EXAMPLE.COM")).toBe(true);
    expect(matchesSearch(a, "Customer Marketing Intern", "marketing")).toBe(true);
    expect(matchesSearch(a, "Customer Marketing Intern", "engineer")).toBe(false);
  });

  it("requires every token to match, across fields", () => {
    const a = app({ fullName: "Batool Jalal" });
    expect(matchesSearch(a, "Customer Marketing Intern", "batool market")).toBe(true);
    expect(matchesSearch(a, "Customer Marketing Intern", "batool engineer")).toBe(false);
  });

  it("treats an empty or whitespace-only query as no filter", () => {
    const a = app();
    expect(matchesSearch(a, "Any Role", "")).toBe(true);
    expect(matchesSearch(a, "Any Role", "   ")).toBe(true);
  });
});
