import { describe, expect, it } from "vitest";
import type { Job } from "@/types/careers";
import { ALL_ROLES, formatRoleDate, groupRolesByTeam, isNewRole, matchesRole, pickHeroRole, regionsOf, teamCounts } from "@/lib/roleFinder";

const job = (p: Partial<Job>): Job => ({
  id: p.id || "j", title: "Role", department: "Engineering", location: "Bahrain", type: "Full-time", status: "open",
  summary: "", description: "", responsibilities: [], requirements: [], benefits: [], postedDate: "2026-08-01", screeningQuestions: [], ...p,
});

const jobs = [
  job({ id: "a", title: "Senior AI Engineer", department: "Engineering", location: "Remote", postedDate: "2026-08-02" }),
  job({ id: "b", title: "Backend Developer", department: "Engineering", location: "Al Burhama, Manama", postedDate: "2026-08-02" }),
  job({ id: "c", title: "RevOps Analyst", department: "Sales", location: "Bahrain & Remote", postedDate: "2026-07-08" }),
  job({ id: "d", title: "Account Executive", department: "Sales", location: "KSA", postedDate: "2026-06-23" }),
  job({ id: "e", title: "Finance Intern", department: "Finance", location: "Bahrain", postedDate: "2026-09-14" }),
];

describe("roleFinder", () => {
  it("maps free-text locations to regions", () => {
    expect(regionsOf("Bahrain & Remote")).toEqual(["bahrain", "remote"]);
    expect(regionsOf("Al Burhama, Manamate")).toEqual(["bahrain"]);
    expect(regionsOf("KSA")).toEqual(["ksa"]);
    expect(regionsOf("Riyadh, Saudi Arabia")).toEqual(["ksa"]);
  });

  it("filters by team, region and every search word", () => {
    const ids = (f = ALL_ROLES) => jobs.filter((j) => matchesRole(j, f)).map((j) => j.id);
    expect(ids()).toEqual(["a", "b", "c", "d", "e"]);
    expect(ids({ ...ALL_ROLES, team: "Sales" })).toEqual(["c", "d"]);
    expect(ids({ ...ALL_ROLES, region: "remote" })).toEqual(["a", "c"]);
    expect(ids({ ...ALL_ROLES, team: "Engineering", region: "remote" })).toEqual(["a"]);
    expect(ids({ ...ALL_ROLES, q: "ENGINEER remote" })).toEqual(["a"]);
    expect(ids({ ...ALL_ROLES, q: "zzz" })).toEqual([]);
  });

  it("orders teams by size then name, and roles newest first", () => {
    expect(teamCounts(jobs)).toEqual([{ team: "Engineering", count: 2 }, { team: "Sales", count: 2 }, { team: "Finance", count: 1 }]);
    const groups = groupRolesByTeam(jobs);
    expect(groups.map((g) => g.team)).toEqual(["Engineering", "Sales", "Finance"]);
    expect(groups[1].roles.map((r) => r.id)).toEqual(["c", "d"]);
  });

  it("marks roles posted in the last three weeks as new", () => {
    const now = new Date("2026-09-30T12:00:00Z");
    expect(isNewRole("2026-09-14", now)).toBe(true);
    expect(isNewRole("2026-08-02", now)).toBe(false);
    expect(isNewRole("", now)).toBe(false);
  });

  it("formats dates and picks the hero role", () => {
    expect(formatRoleDate("2026-08-02")).toBe("2 Aug 2026");
    expect(formatRoleDate("2026-08-02T10:00:00Z")).toBe("2 Aug 2026");
    expect(formatRoleDate(undefined)).toBe("");
    expect(pickHeroRole(jobs)?.department).toBe("Engineering");
    expect(pickHeroRole([jobs[4]])?.id).toBe("e");
    expect(pickHeroRole([])).toBeUndefined();
  });
});
