// Pure helpers for the careers homepage role finder: location regions, filtering, team grouping,
// "new" marking and the hero's featured role. The finder's count and its list both come from
// matchesRole, so the number shown can never disagree with the rows shown.
import type { Job } from "@/types/careers";

export type Region = "bahrain" | "ksa" | "remote";
export interface RoleFilter {
  team: string; // "all" or a department name
  region: "any" | Region;
  q: string; // search text as typed (matched case-insensitively)
}
export const ALL_ROLES: RoleFilter = { team: "all", region: "any", q: "" };

/** Regions a free-text location covers. "Bahrain & Remote" is both; "Al Burhama, Manama" is Bahrain. */
export function regionsOf(location: string): Region[] {
  const r: Region[] = [];
  if (/bahrain|manama|sanabis|muharraq/i.test(location)) r.push("bahrain");
  if (/\bksa\b|saudi|riyadh|jeddah|dammam/i.test(location)) r.push("ksa");
  if (/remote/i.test(location)) r.push("remote");
  return r;
}

export const roleSearchText = (job: Job) => `${job.title} ${job.department} ${job.location} ${job.type}`.toLowerCase();

export function matchesRole(job: Job, f: RoleFilter): boolean {
  if (f.team !== "all" && job.department !== f.team) return false;
  if (f.region !== "any" && !regionsOf(job.location).includes(f.region)) return false;
  const q = f.q.trim().toLowerCase();
  if (q && !q.split(/\s+/).every((t) => roleSearchText(job).includes(t))) return false;
  return true;
}

const time = (iso: string | undefined) => {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(t) ? 0 : t;
};
export const newestFirst = (a: Job, b: Job) => time(b.postedDate) - time(a.postedDate);

/** Team names with counts: largest team first, then A–Z. */
export function teamCounts(jobs: Job[]): { team: string; count: number }[] {
  const c = new Map<string, number>();
  jobs.forEach((j) => c.set(j.department, (c.get(j.department) || 0) + 1));
  return Array.from(c, ([team, count]) => ({ team, count })).sort((a, b) => b.count - a.count || a.team.localeCompare(b.team));
}

/** Roles grouped by team (team order from teamCounts), newest first inside each team. */
export function groupRolesByTeam(jobs: Job[]): { team: string; roles: Job[] }[] {
  return teamCounts(jobs).map(({ team }) => ({ team, roles: jobs.filter((j) => j.department === team).sort(newestFirst) }));
}

/** Posted within the last `days` days. */
export function isNewRole(postedDate: string | undefined, now: Date = new Date(), days = 21): boolean {
  const t = time(postedDate);
  if (!t) return false;
  const age = (now.getTime() - t) / 864e5;
  return age >= 0 && age <= days;
}

/**
 * Where a role's "apply by" date stands today, by calendar day.
 *
 * "past" exists so a role HR has left open does not tell candidates to apply by a
 * date that has gone: the role still shows, the stale date does not. "soon" is the
 * last week, the only time the date deserves a warning colour.
 */
export type DeadlineState = "none" | "past" | "soon" | "open";
export function deadlineState(deadline: string | undefined, now: Date = new Date(), soonDays = 7): DeadlineState {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(deadline || "");
  if (!m) return "none";
  const due = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((due - today) / 864e5);
  return days < 0 ? "past" : days <= soonDays ? "soon" : "open";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2026-08-02" -> "2 Aug 2026" (date part only, so no time-zone drift). */
export function formatRoleDate(iso: string | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : "";
}

/** The hero's featured role: the newest Engineering role, else the newest role. */
export function pickHeroRole(jobs: Job[]): Job | undefined {
  const sorted = [...jobs].sort(newestFirst);
  return sorted.find((j) => j.department === "Engineering") || sorted[0];
}
