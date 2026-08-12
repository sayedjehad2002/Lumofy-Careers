import { describe, it, expect } from "vitest";
import {
  ROSTER_FACETS, rosterFacets, rosterSummary, applyScoreRange, distinctPeople,
  applyRosterFilters, activeFilterCount, NO_FILTERS, filterByJobs,
} from "@/lib/applicantMetrics";
import type { AIAnalysis, Applicant } from "@/types/careers";

const NOW = 1_700_000_000_000;
const DAY = 86400000;
const daysAgo = (n: number) => new Date(NOW - n * DAY).toISOString();

function app(o: Partial<Applicant> = {}): Applicant {
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
    ...o,
  };
}

const ai = (o: Partial<AIAnalysis> = {}) => ({ fitScore: 70, ...o }) as AIAnalysis;

describe("rosterFacets", () => {
  it("counts exactly what clicking each chip would filter to", () => {
    // The whole point of the chips: one predicate map drives both the number and
    // the filtered set, so a chip cannot promise 119 and then show 40.
    const list = [
      app({ id: "1", status: "new", aiAnalysis: undefined }),
      app({ id: "2", status: "new", aiAnalysis: ai({ fitScore: 92 }) }),
      app({ id: "3", status: "hired", aiAnalysis: ai({ fitScore: 40 }), email: "  " }),
    ];
    for (const facet of rosterFacets(list, NOW)) {
      expect(list.filter((a) => ROSTER_FACETS[facet.id](a, NOW))).toHaveLength(facet.count);
    }
  });

  it("treats a fitScore of 0 as scored, not unscored", () => {
    // The old row contradicted itself here, rendering both "0" and "AI Pending".
    const list = [app({ id: "1", aiAnalysis: ai({ fitScore: 0 }) })];
    expect(rosterFacets(list, NOW).find((f) => f.id === "unscored")?.count).toBe(0);
  });

  it("counts a whitespace-only email as no email", () => {
    const list = [app({ id: "1", email: "   " }), app({ id: "2", email: "a@b.com" })];
    expect(rosterFacets(list, NOW).find((f) => f.id === "noEmail")?.count).toBe(1);
  });

  it("counts a top match at exactly 85", () => {
    const list = [app({ id: "1", aiAnalysis: ai({ fitScore: 85 }) }), app({ id: "2", aiAnalysis: ai({ fitScore: 84 }) })];
    expect(rosterFacets(list, NOW).find((f) => f.id === "top")?.count).toBe(1);
  });

  it("returns zeros rather than NaN for an empty roster", () => {
    for (const facet of rosterFacets([], NOW)) expect(facet.count).toBe(0);
  });
});

describe("applyScoreRange", () => {
  it("EXCLUDES unscored candidates instead of passing them through", () => {
    // Shipped bug: `if (score != null && outOfRange) return false` short-circuited
    // for unscored candidates, so 85-100 returned all 119 of them.
    const list = [
      app({ id: "scored", aiAnalysis: ai({ fitScore: 90 }) }),
      app({ id: "unscored", aiAnalysis: undefined }),
    ];
    expect(applyScoreRange(list, 85, 100).map((a) => a.id)).toEqual(["scored"]);
  });

  it("is a no-op at the full range, so unscored candidates are not hidden by default", () => {
    const list = [
      app({ id: "scored", aiAnalysis: ai({ fitScore: 90 }) }),
      app({ id: "unscored", aiAnalysis: undefined }),
    ];
    expect(applyScoreRange(list, 0, 100)).toHaveLength(2);
  });

  it("includes both boundaries", () => {
    const list = [
      app({ id: "lo", aiAnalysis: ai({ fitScore: 50 }) }),
      app({ id: "hi", aiAnalysis: ai({ fitScore: 70 }) }),
      app({ id: "out", aiAnalysis: ai({ fitScore: 71 }) }),
    ];
    expect(applyScoreRange(list, 50, 70).map((a) => a.id)).toEqual(["lo", "hi"]);
  });

  it("keeps a genuine score of 0 when the range allows it", () => {
    const list = [app({ id: "zero", aiAnalysis: ai({ fitScore: 0 }) })];
    expect(applyScoreRange(list, 0, 49)).toHaveLength(1);
  });
});

describe("distinctPeople", () => {
  it("dedupes on lowercased email and ignores blanks", () => {
    const list = [
      app({ id: "1", email: "A@x.com" }),
      app({ id: "2", email: "a@x.com" }),
      app({ id: "3", email: "" }),
      app({ id: "4", email: "b@x.com" }),
    ];
    expect(distinctPeople(list)).toBe(2);
  });
});

describe("rosterSummary", () => {
  it("reports applications, an approximate headcount, and the unopened count", () => {
    const list = [
      app({ id: "1", email: "a@x.com", status: "new" }),
      app({ id: "2", email: "a@x.com", status: "new" }),
      app({ id: "3", email: "", status: "hired" }),
    ];
    expect(rosterSummary(list)).toMatchObject({
      applications: 3,
      people: 1,
      unopened: 2,
      unknownIdentity: 1,
    });
  });

  it("flags that the headcount is approximate whenever anyone lacks an email", () => {
    // unknownIdentity is what licenses the word "about" in the header sentence.
    expect(rosterSummary([app({ email: "" })]).unknownIdentity).toBe(1);
    expect(rosterSummary([app({ email: "a@x.com" })]).unknownIdentity).toBe(0);
  });
});

describe("applyRosterFilters", () => {
  const list = [
    app({ id: "new-hi", status: "new", aiAnalysis: ai({ fitScore: 90 }), appliedDate: daysAgo(10) }),
    app({ id: "int-lo", status: "interview", aiAnalysis: ai({ fitScore: 40 }), appliedDate: daysAgo(2) }),
    app({ id: "new-unscored", status: "new", aiAnalysis: undefined, appliedDate: daysAgo(1) }),
  ];

  it("narrows by stage", () => {
    expect(applyRosterFilters(list, { ...NO_FILTERS, stage: "interview" }).map((a) => a.id)).toEqual(["int-lo"]);
  });

  it("applies the score range through the same fixed helper", () => {
    // Not a second implementation — unscored candidates must stay excluded here too.
    expect(applyRosterFilters(list, { ...NO_FILTERS, scoreMin: 85, scoreMax: 100 }).map((a) => a.id))
      .toEqual(["new-hi"]);
  });

  it("treats the 'applied to' date as inclusive of that whole day", () => {
    const day = new Date(NOW - 2 * DAY).toISOString().slice(0, 10);
    const ids = applyRosterFilters(list, { ...NO_FILTERS, appliedFrom: day, appliedTo: day }).map((a) => a.id);
    expect(ids).toContain("int-lo");
  });

  it("returns everything when nothing is set", () => {
    expect(applyRosterFilters(list, NO_FILTERS)).toHaveLength(3);
  });

  it("counts only the filters that are doing something", () => {
    expect(activeFilterCount(NO_FILTERS)).toBe(0);
    expect(activeFilterCount({ ...NO_FILTERS, stage: "new", scoreMin: 50 })).toBe(2);
  });
});

describe("filterByJobs", () => {
  const list = [
    app({ id: "1", jobId: "fullstack" }),
    app({ id: "2", jobId: "eng-intern" }),
    app({ id: "3", jobId: "senior-ai" }),
    app({ id: "4", jobId: "marketing" }),
  ];

  it("treats an empty selection as every job, not as none", () => {
    // The contract the whole control rests on. If this ever inverted, a filter
    // nobody had touched would blank the screen on first paint.
    expect(filterByJobs(list, [])).toHaveLength(4);
  });

  it("keeps candidates from every selected job", () => {
    const out = filterByJobs(list, ["fullstack", "eng-intern", "senior-ai"]);
    expect(out.map((a) => a.id)).toEqual(["1", "2", "3"]);
  });

  it("still narrows to a single job", () => {
    expect(filterByJobs(list, ["marketing"]).map((a) => a.id)).toEqual(["4"]);
  });

  it("ignores ids that match no candidate rather than throwing", () => {
    // A saved scope can outlive an archived job; a stale id must not break the page.
    expect(filterByJobs(list, ["deleted-job"])).toHaveLength(0);
    expect(filterByJobs(list, ["fullstack", "deleted-job"]).map((a) => a.id)).toEqual(["1"]);
  });

  it("does not mutate or reorder the input", () => {
    const copy = [...list];
    filterByJobs(list, ["senior-ai"]);
    expect(list).toEqual(copy);
  });
});
