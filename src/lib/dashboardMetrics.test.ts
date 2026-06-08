import { describe, it, expect } from "vitest";
import { dailyCounts, trendDeltaPct, hasTrend } from "./dashboardMetrics";

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

describe("trendDeltaPct", () => {
  it("compares recent half vs prior half as a percent", () => {
    // prior 7 sum = 10, recent 7 sum = 15 → +50%
    expect(trendDeltaPct([2, 2, 2, 2, 1, 1, 0, 3, 3, 3, 2, 2, 1, 1])).toBe(50);
  });
  it("returns null when the prior half is empty (no baseline)", () => {
    expect(trendDeltaPct([0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 0, 0, 0, 0])).toBeNull();
  });
});

describe("hasTrend", () => {
  it("is true only with >= 3 non-zero days", () => {
    expect(hasTrend([0, 1, 0, 2, 0, 3, 0])).toBe(true);
    expect(hasTrend([0, 0, 1, 0, 1, 0, 0])).toBe(false);
  });
});
