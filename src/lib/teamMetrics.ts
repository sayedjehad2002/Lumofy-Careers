/**
 * Derivations for the HR Team page.
 *
 * Same shape as dashboardMetrics / pipelineMetrics / applicantMetrics: pure
 * functions taking `now` as an argument rather than reading the clock, so the
 * tests are deterministic and a stale render can never disagree with a fresh one.
 */

export interface TeamMember {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  /** From auth.users. `null` = account exists but has never signed in.
   *  `undefined` = the activity lookup failed, which is NOT the same as never. */
  last_sign_in_at?: string | null;
}

/** How long an account can sit unused before it is worth a second look. */
export const DORMANT_DAYS = 30;

export type ActivityState = "today" | "recent" | "dormant" | "never" | "unknown";

export interface Activity {
  state: ActivityState;
  /** Whole days since the last sign-in. Null when never or unknown. */
  days: number | null;
  /** Short human phrase for the row: "today", "3 days ago", "never signed in". */
  label: string;
}

const DAY = 86_400_000;

/**
 * Turn a raw last-sign-in stamp into something a person can act on.
 *
 * "unknown" and "never" are deliberately separate states. Collapsing them would
 * let a failed activity lookup accuse every member of never having signed in —
 * on a page whose whole job is deciding who keeps access to candidate data,
 * that is the one mistake worth designing against.
 */
export function activityOf(member: TeamMember, now: number): Activity {
  if (member.last_sign_in_at === undefined) {
    return { state: "unknown", days: null, label: "sign-in data unavailable" };
  }
  if (member.last_sign_in_at === null) {
    return { state: "never", days: null, label: "never signed in" };
  }

  const t = new Date(member.last_sign_in_at).getTime();
  if (Number.isNaN(t)) {
    return { state: "unknown", days: null, label: "sign-in data unavailable" };
  }

  // A clock skew between the browser and the server can put a sign-in a few
  // seconds in the future. Clamp rather than render "-1 days ago".
  const days = Math.max(0, Math.floor((now - t) / DAY));

  if (days === 0) return { state: "today", days, label: "today" };
  if (days === 1) return { state: "recent", days, label: "yesterday" };
  if (days < DORMANT_DAYS) return { state: "recent", days, label: `${days} days ago` };
  return { state: "dormant", days, label: `${days} days ago` };
}

export interface TeamSummary {
  total: number;
  active: number;
  disabled: number;
  owners: number;
  admins: number;
  viewers: number;
  /** Active accounts unused for DORMANT_DAYS+, worst first. */
  dormant: TeamMember[];
}

/**
 * One pass over the roster for every number the page reports.
 *
 * Hygiene counts consider ACTIVE accounts only. A disabled account cannot sign
 * in, so calling it "dormant" would pad the warning with people whose access was
 * already removed — the exact kind of un-actionable metric this dashboard has
 * been burned by before.
 */
export function summarize(members: TeamMember[], now: number): TeamSummary {
  const active = members.filter((m) => m.status === "active");
  const dormant = active.filter((m) => activityOf(m, now).state === "dormant");

  dormant.sort((a, b) => (activityOf(b, now).days ?? 0) - (activityOf(a, now).days ?? 0));

  return {
    total: members.length,
    active: active.length,
    disabled: members.length - active.length,
    owners: members.filter((m) => m.role === "owner").length,
    admins: members.filter((m) => m.role === "admin").length,
    viewers: members.filter((m) => m.role === "viewer").length,
    dormant,
  };
}

/**
 * Absolute stamp for the row: "11 Aug 2026, 15:04".
 *
 * The relative phrase ("3 days ago") answers "should I act?"; this answers
 * "when exactly?" — which is the one an access review has to be able to cite.
 * Returns null when there is no real timestamp to show.
 */
export function lastSignInStamp(member: TeamMember): string | null {
  if (!member.last_sign_in_at) return null;
  const t = new Date(member.last_sign_in_at);
  if (Number.isNaN(t.getTime())) return null;
  return t.toLocaleString(undefined, {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/** Most recently active first; never/unknown sink to the bottom. */
export function byLastActive(members: TeamMember[], now: number): TeamMember[] {
  return [...members].sort((a, b) => {
    const da = activityOf(a, now).days;
    const db = activityOf(b, now).days;
    if (da === null && db === null) return a.email.localeCompare(b.email);
    if (da === null) return 1;
    if (db === null) return -1;
    return da - db;
  });
}
