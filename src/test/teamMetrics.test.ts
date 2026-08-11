import { describe, it, expect } from "vitest";
import {
  activityOf, summarize, byLastActive, lastSignInStamp, DORMANT_DAYS, type TeamMember,
} from "@/lib/teamMetrics";

const NOW = new Date("2026-08-11T12:00:00Z").getTime();
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString();

const member = (over: Partial<TeamMember> = {}): TeamMember => ({
  id: over.id ?? Math.random().toString(36).slice(2),
  email: over.email ?? "a@lumofy.com",
  role: over.role ?? "admin",
  status: over.status ?? "active",
  created_at: over.created_at ?? daysAgo(100),
  last_sign_in_at: "last_sign_in_at" in over ? over.last_sign_in_at : daysAgo(1),
});

describe("activityOf", () => {
  it("separates 'never signed in' from 'activity unavailable'", () => {
    // The distinction the whole page hinges on: a failed lookup must never
    // read as an accusation that someone never used their account.
    expect(activityOf(member({ last_sign_in_at: null }), NOW).state).toBe("never");
    expect(activityOf(member({ last_sign_in_at: undefined }), NOW).state).toBe("unknown");
  });

  it("labels today and yesterday in words, older days as a count", () => {
    expect(activityOf(member({ last_sign_in_at: daysAgo(0) }), NOW).label).toBe("today");
    expect(activityOf(member({ last_sign_in_at: daysAgo(1) }), NOW).label).toBe("yesterday");
    expect(activityOf(member({ last_sign_in_at: daysAgo(5) }), NOW).label).toBe("5 days ago");
  });

  it("turns dormant exactly at the threshold, not before", () => {
    expect(activityOf(member({ last_sign_in_at: daysAgo(DORMANT_DAYS - 1) }), NOW).state).toBe("recent");
    expect(activityOf(member({ last_sign_in_at: daysAgo(DORMANT_DAYS) }), NOW).state).toBe("dormant");
  });

  it("clamps a future sign-in to today rather than reporting negative days", () => {
    const future = new Date(NOW + 60_000).toISOString();
    const a = activityOf(member({ last_sign_in_at: future }), NOW);
    expect(a.days).toBe(0);
    expect(a.label).toBe("today");
  });

  it("treats an unparseable stamp as unknown, not as day zero", () => {
    expect(activityOf(member({ last_sign_in_at: "not-a-date" }), NOW).state).toBe("unknown");
  });
});

describe("lastSignInStamp", () => {
  it("renders a real timestamp for a real sign-in", () => {
    const s = lastSignInStamp(member({ last_sign_in_at: "2026-08-04T07:13:01.899Z" }));
    expect(s).toBeTruthy();
    // Locale-dependent formatting, so assert the parts that must survive it.
    expect(s).toMatch(/2026/);
    expect(s).toMatch(/Aug/);
  });

  it("returns null when there is nothing real to cite", () => {
    expect(lastSignInStamp(member({ last_sign_in_at: null }))).toBeNull();
    expect(lastSignInStamp(member({ last_sign_in_at: undefined }))).toBeNull();
    expect(lastSignInStamp(member({ last_sign_in_at: "not-a-date" }))).toBeNull();
  });
});

describe("summarize", () => {
  it("counts roles and statuses across the whole roster", () => {
    const s = summarize([
      member({ role: "owner" }),
      member({ role: "owner" }),
      member({ role: "admin" }),
      member({ role: "viewer" }),
      member({ role: "viewer", status: "disabled" }),
    ], NOW);
    expect(s.total).toBe(5);
    expect(s.active).toBe(4);
    expect(s.disabled).toBe(1);
    expect(s.owners).toBe(2);
    expect(s.admins).toBe(1);
    expect(s.viewers).toBe(2);
  });

  it("never counts a disabled account as dormant", () => {
    // A disabled account already cannot sign in — counting it would pad the
    // idle number with people whose access was removed months ago.
    const s = summarize([
      member({ status: "disabled", last_sign_in_at: daysAgo(200) }),
      member({ status: "disabled", last_sign_in_at: null }),
    ], NOW);
    expect(s.dormant).toHaveLength(0);
  });

  it("does not count a never-signed-in account as dormant", () => {
    // "Never" is its own state — the Idle stat is time-since-last-use, and an
    // account with no last use has no elapsed time to report.
    const s = summarize([member({ last_sign_in_at: null })], NOW);
    expect(s.dormant).toHaveLength(0);
  });

  it("orders dormant accounts worst-first", () => {
    const s = summarize([
      member({ email: "mid@x.com", last_sign_in_at: daysAgo(40) }),
      member({ email: "worst@x.com", last_sign_in_at: daysAgo(90) }),
      member({ email: "edge@x.com", last_sign_in_at: daysAgo(31) }),
    ], NOW);
    expect(s.dormant.map((m) => m.email)).toEqual(["worst@x.com", "mid@x.com", "edge@x.com"]);
  });

  it("counts nobody as idle when sign-in data is unavailable", () => {
    // A non-owner receives no sign-in times at all, so every member arrives with
    // undefined. Reporting "2 idle admins" from that would be fabricated.
    const s = summarize([
      member({ last_sign_in_at: undefined }),
      member({ last_sign_in_at: undefined }),
    ], NOW);
    expect(s.dormant).toHaveLength(0);
    // The role and status counts still work without any activity data.
    expect(s.total).toBe(2);
    expect(s.active).toBe(2);
  });
});

describe("byLastActive", () => {
  it("sorts most recent first and sinks never/unknown to the bottom", () => {
    const sorted = byLastActive([
      member({ email: "never@x.com", last_sign_in_at: null }),
      member({ email: "old@x.com", last_sign_in_at: daysAgo(30) }),
      member({ email: "today@x.com", last_sign_in_at: daysAgo(0) }),
      member({ email: "unknown@x.com", last_sign_in_at: undefined }),
    ], NOW);
    expect(sorted.map((m) => m.email)).toEqual([
      "today@x.com", "old@x.com", "never@x.com", "unknown@x.com",
    ]);
  });

  it("does not mutate the input array", () => {
    const input = [member({ email: "b@x.com" }), member({ email: "a@x.com" })];
    const copy = [...input];
    byLastActive(input, NOW);
    expect(input).toEqual(copy);
  });
});
