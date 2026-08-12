import { describe, it, expect } from "vitest";
import { buildTimeline, daysSpanned, relativeDay } from "@/lib/candidateTimeline";
import type { Applicant } from "@/types/careers";
import type { ApplicantEvent } from "@/hooks/use-applicant-events";

const NOW = new Date("2026-08-12T12:00:00Z").getTime();
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString();

const app = (o: Partial<Applicant> = {}): Applicant => ({
  id: "a1",
  jobId: "job1",
  fullName: "Amr Ayman",
  email: "amr@example.com",
  phone: "",
  location: "",
  cvFileName: "Amr_Ayman_CV.pdf",
  screeningAnswers: {},
  status: "new",
  appliedDate: daysAgo(2),
  notes: [],
  ...o,
});

const ev = (o: Partial<ApplicantEvent> = {}): ApplicantEvent => ({
  id: o.id ?? "e1",
  kind: o.kind ?? "stage_change",
  actor_email: "actor_email" in o ? o.actor_email! : "salfulaij@lumofy.com",
  from_status: "from_status" in o ? o.from_status! : "new",
  to_status: "to_status" in o ? o.to_status! : "shortlisted",
  note: o.note ?? null,
  created_at: o.created_at ?? daysAgo(0),
});

describe("buildTimeline", () => {
  it("always opens with the application, carrying the CV filename", () => {
    const t = buildTimeline(app(), []);
    expect(t).toHaveLength(1);
    expect(t[0].kind).toBe("applied");
    expect(t[0].detail).toBe("Amr_Ayman_CV.pdf");
  });

  it("renders a stage move as from → to and keeps the actor", () => {
    const [, move] = buildTimeline(app({ status: "shortlisted" }), [ev()]);
    expect(move.label).toBe("New → Shortlisted");
    expect(move.actor).toBe("salfulaij@lumofy.com");
    expect(move.to).toBe("shortlisted");
  });

  it("says 'Moved to' when the previous stage was never recorded", () => {
    const [, move] = buildTimeline(app(), [ev({ from_status: null })]);
    expect(move.label).toBe("Moved to Shortlisted");
  });

  it("infers a stage entry only when no real move exists", () => {
    // The rule that stops the timeline contradicting itself: a guessed entry and
    // a recorded one must never both claim to explain the same move.
    const withoutEvents = buildTimeline(
      app({ status: "interview", stageEnteredAt: daysAgo(1) }),
      [],
    );
    expect(withoutEvents.some((e) => e.inferred)).toBe(true);

    const withEvents = buildTimeline(
      app({ status: "interview", stageEnteredAt: daysAgo(1) }),
      [ev()],
    );
    expect(withEvents.some((e) => e.inferred)).toBe(false);
  });

  it("never infers a stage entry for a candidate still on New", () => {
    const t = buildTimeline(app({ status: "new", stageEnteredAt: daysAgo(1) }), []);
    expect(t.some((e) => e.inferred)).toBe(false);
  });

  it("adds the AI entry only when an analysis timestamp exists", () => {
    const none = buildTimeline(app(), []);
    expect(none.some((e) => e.kind === "ai")).toBe(false);

    const scored = buildTimeline(
      app({ aiAnalysis: { fitScore: 80, analyzedAt: daysAgo(1) } as never }),
      [],
    );
    expect(scored.some((e) => e.kind === "ai")).toBe(true);
  });

  it("drops entries whose timestamp cannot be parsed", () => {
    // A malformed stamp must not render as 1970 at the top of the history.
    const t = buildTimeline(app(), [ev({ created_at: "not-a-date" })]);
    expect(t).toHaveLength(1);
    expect(t[0].kind).toBe("applied");
  });

  it("orders oldest first regardless of the order events arrive in", () => {
    const t = buildTimeline(app(), [
      ev({ id: "late", created_at: daysAgo(0) }),
      ev({ id: "early", created_at: daysAgo(1) }),
    ]);
    expect(t.map((e) => e.id)).toEqual(["applied", "early", "late"]);
  });

  it("keeps a note's body and marks a missing author rather than crediting anyone", () => {
    const [, note] = buildTimeline(app(), [
      ev({ kind: "note", note: "Strong portfolio", actor_email: null }),
    ]);
    expect(note.kind).toBe("note");
    expect(note.detail).toBe("Strong portfolio");
    expect(note.actor).toBeUndefined();
  });
});

describe("daysSpanned", () => {
  it("measures first to last entry, not first to now", () => {
    // A candidate rejected months ago is not still "in the pipeline"; counting to
    // today would claim they were.
    const t = buildTimeline(app({ appliedDate: daysAgo(10) }), [ev({ created_at: daysAgo(6) })]);
    expect(daysSpanned(t)).toBe(4);
  });

  it("returns 0 for a single entry so the caller can hide the chip", () => {
    expect(daysSpanned(buildTimeline(app(), []))).toBe(0);
  });
});

describe("relativeDay", () => {
  it("uses words up close and an absolute date once they stop helping", () => {
    expect(relativeDay(new Date(NOW), NOW)).toBe("today");
    expect(relativeDay(new Date(NOW - 86_400_000), NOW)).toBe("yesterday");
    expect(relativeDay(new Date(NOW - 5 * 86_400_000), NOW)).toBe("5 days ago");
    expect(relativeDay(new Date(NOW - 60 * 86_400_000), NOW)).toMatch(/2026/);
  });

  it("clamps a future stamp to today rather than printing negative days", () => {
    expect(relativeDay(new Date(NOW + 60_000), NOW)).toBe("today");
  });
});
