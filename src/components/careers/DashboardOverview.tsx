import { useCallback, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion, type Variants } from "framer-motion";
import type { Job, Applicant } from "@/types/careers";
import {
  statusBreakdown,
  qualityBands,
  actionQueue,
  applicationsPerRole,
  oldestUnreviewed,
  topUnreviewed,
  dailyCounts,
  type ActionRow,
} from "@/lib/dashboardMetrics";
import { brandEase } from "@/lib/motion";
import { useCareers } from "@/contexts/CareersContext";
import { useLiveRefresh } from "@/hooks/use-live-refresh";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
// The public site's own glyphs (Phosphor) and brand sparkle, so the first screen HR
// sees after sign-in speaks the same visual language as the careers pages.
import { CxIcon, type CxIconName } from "./cx/icons";
import { AiStar, Spark } from "./cx/parts";
import "./dashboard/overview.css";

// Auto-refresh cadence while the Overview is open and the tab is visible.
const LIVE_INTERVAL_MS = 30_000;

// A role at or under this many applications is flagged as needing more reach.
// One source for the readout hint, the row flag and the caption, so they can't drift.
const LOW_VOLUME_MAX = 4;

interface DashboardOverviewProps {
  jobs: Job[];
  applicants: Applicant[];
  onNavigate: (tab: string) => void;
  /** A candidate's own page, so the unreviewed list can link straight to them. */
  applicantHref: (applicantId: string) => string;
  /** Opens the Sources sub-route. Kept as a link out rather than a ninth block on this screen. */
  onOpenSources?: () => void;
}

/** First letters of up to two name parts, uppercase — for the shortlist avatar. */
function initialsFor(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Share of a whole as a whole-number percent; a non-zero sliver reads "<1%", never "0%". */
function pctLabel(count: number, total: number): string {
  if (total === 0) return "0%";
  const pct = Math.round((count / total) * 100);
  return count > 0 && pct === 0 ? "<1%" : `${pct}%`;
}

const ACTION_ICON: Record<ActionRow["id"], CxIconName | "ai"> = {
  fastTrackNew: "rocket-launch",
  unreviewed: "file-text",
  awaitingAi: "ai",
  stalledInterviews: "clock",
  notRecommendedNew: "x",
};

// Quality ramp: one hue, intensity = quality. Colours live in overview.css (--ov-q1..4).
const QUALITY_COLOR = ["var(--ov-q1)", "var(--ov-q2)", "var(--ov-q3)", "var(--ov-q4)"];
const QUALITY_RANGE: Record<string, string> = {
  Top: "85+",
  Strong: "70–84",
  Moderate: "50–69",
  Weak: "under 50",
};

// Sections arrive in sequence: transform/opacity only, and MotionConfig in App.tsx
// turns this off for reduced-motion users.
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const rise: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: brandEase } },
};

const DashboardOverview = ({ jobs, applicants, onNavigate, applicantHref, onOpenSources }: DashboardOverviewProps) => {
  // Recomputed whenever fresh data lands (not just on mount) — otherwise this
  // goes stale across the 30s live refresh below and silently defeats it: the
  // stalled-interview check in actionQueue and the last-7-days count would
  // keep judging "now" against the moment the tab was opened. applicants/jobs
  // are deliberately used only as recompute triggers, not referenced in the
  // factory — exhaustive-deps can't tell that apart from a mistake.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = useMemo(() => Date.now(), [applicants, jobs]);

  // ── Live auto-refresh ── silent background refetch every 30s while the Overview
  // is mounted + visible (and instantly on tab-return), so the dashboard reflects
  // what's actually happening without a reload. Mounting/unmounting with the tab
  // scopes it to Overview, so it never refetches mid-drag on the Pipeline.
  const { silentRefresh } = useCareers();
  useLiveRefresh(silentRefresh, LIVE_INTERVAL_MS);

  // ── Single source of truth for every number on this screen ──
  const statusRows = useMemo(() => statusBreakdown(applicants), [applicants]);
  const unreviewedCount = statusRows.find((s) => s.status === "new")?.count ?? 0;
  const unreviewedPct = applicants.length > 0 ? Math.round((unreviewedCount / applicants.length) * 100) : 0;
  const oldestDate = useMemo(() => oldestUnreviewed(applicants), [applicants]);
  const oldestFormatted = oldestDate
    ? new Date(oldestDate).toLocaleDateString("en-GB", { day: "numeric", month: "long" })
    : null;

  const quality = useMemo(() => qualityBands(applicants), [applicants]);
  const actionRows = useMemo(() => actionQueue(applicants, now), [applicants, now]);
  const fastTrack = actionRows.find((r) => r.id === "fastTrackNew");
  const roleLoad = useMemo(() => applicationsPerRole(applicants, jobs), [applicants, jobs]);

  /**
   * The role a candidate applied for.
   *
   * `jobTitle` is a snapshot copied onto the applicant at submit time, and it was
   * added to submit-application after most of this pipeline already existed — so
   * it is null on 292 of 367 applications while `jobId` still points at a live
   * job. Reading the snapshot alone printed "Unknown role" for 80% of candidates
   * whose role was known all along. Every other screen already falls back to the
   * job lookup (ApplicantsListView, CandidateProfile, Dashboard); this one didn't.
   */
  const jobTitleById = useMemo(() => new Map(jobs.map((j) => [j.id, j.title])), [jobs]);
  const roleTitleFor = useCallback(
    (a: Applicant) => a.jobTitle || jobTitleById.get(a.jobId) || "Unknown role",
    [jobTitleById]
  );
  const lowVolumeRoles = useMemo(() => roleLoad.filter((r) => r.count <= LOW_VOLUME_MAX).length, [roleLoad]);
  const maxRoleCount = useMemo(() => Math.max(...roleLoad.map((r) => r.count), 1), [roleLoad]);
  const last7Days = useMemo(
    () => dailyCounts(applicants.map((a) => a.appliedDate), 7, now).reduce((sum, n) => sum + n, 0),
    [applicants, now]
  );

  const [roleFilter, setRoleFilter] = useState<string>("all");
  /** Only roles that actually have an unreviewed, scored candidate. */
  const filterableRoles = useMemo(
    () => roleLoad.filter((r) => topUnreviewed(applicants, r.jobId, 1).length > 0),
    [roleLoad, applicants]
  );
  // Self-heals if the selected role's last unreviewed candidate gets reviewed
  // mid-session (e.g. via the 30s live refresh above) and roleFilter no longer
  // matches any mounted SelectItem — falls back to "all" instead of leaving
  // the Select trigger showing blank.
  const roleStillValid = roleFilter === "all" || filterableRoles.some((r) => r.jobId === roleFilter);
  const effectiveRoleFilter = roleStillValid ? roleFilter : "all";
  const shortlist = useMemo(
    () => topUnreviewed(applicants, effectiveRoleFilter === "all" ? undefined : effectiveRoleFilter),
    [applicants, effectiveRoleFilter]
  );

  // Rejected is a real outcome, not a step on the way to hired, so it sits off the
  // path — but it stays on screen: every status is shown and the stages sum to the total.
  const pathRows = statusRows.filter((s) => s.status !== "rejected");
  const exitRow = statusRows.find((s) => s.status === "rejected");
  const scoredPct = applicants.length > 0 ? (quality.scored / applicants.length) * 100 : 0;

  return (
    <motion.div className="ov" variants={stagger} initial="hidden" animate="show">

      {/* ── Hero: the one sentence that matters, and the way in ── */}
      <motion.section variants={rise} className="ov-hero" aria-labelledby="ov-title">
        <span className="ov-hero__grid" aria-hidden="true" />
        <span className="ov-hero__glow" aria-hidden="true" />
        <Spark className="ov-hero__spark" />
        <Spark className="ov-hero__twinkle ov-hero__twinkle--a" />
        <Spark className="ov-hero__twinkle ov-hero__twinkle--b" />

        <div className="ov-hero__copy">
          <p className="ov-eyebrow">
            <AiStar className="ov-eyebrow__star" />
            Hiring overview
            <span className="ov-live" title="Live: refreshes every 30 seconds" aria-hidden="true" />
          </p>
          <h1 className="ov-hero__title" id="ov-title">
            {unreviewedCount > 0 ? (
              <>
                {unreviewedCount === 1
                  ? "1 application has never been "
                  : `${unreviewedCount} applications have never been `}
                <em>opened.</em>
              </>
            ) : (
              <>
                Everything received has been <em>reviewed.</em>
              </>
            )}
          </h1>
          <p className="ov-hero__lead">
            {unreviewedCount > 0
              ? `That is ${unreviewedPct}% of everything received.`
              : `All ${applicants.length} applications have been opened at least once.`}
            {oldestFormatted && ` The oldest has been waiting since ${oldestFormatted}.`}
          </p>
          <div className="ov-hero__ctas">
            {fastTrack ? (
              <button type="button" className="ov-btn ov-btn--primary" onClick={() => onNavigate("applicants")}>
                Review {fastTrack.count} fast-track {fastTrack.count === 1 ? "candidate" : "candidates"}
                <CxIcon name="arrow-right" className="ov-ic ov-nudge" />
              </button>
            ) : unreviewedCount > 0 ? (
              <button type="button" className="ov-btn ov-btn--primary" onClick={() => onNavigate("applicants")}>
                Open applications
                <CxIcon name="arrow-right" className="ov-ic ov-nudge" />
              </button>
            ) : null}
            {onOpenSources && (
              <button type="button" className="ov-btn ov-btn--ghost" onClick={onOpenSources}>
                <CxIcon name="compass" className="ov-ic" />
                Where candidates come from
              </button>
            )}
          </div>
        </div>

        {/* Three supporting facts as a readout, not a row of stat tiles. */}
        <ul className="ov-readout" aria-label="At a glance">
          <ReadoutRow
            icon="briefcase"
            label="Open roles"
            value={roleLoad.length}
            hint={lowVolumeRoles > 0 ? `${lowVolumeRoles} with almost no applicants` : "All are getting applicants"}
            warn={lowVolumeRoles > 0}
            onClick={() => onNavigate("jobs")}
          />
          <ReadoutRow
            icon="users-three"
            label="Applications"
            value={applicants.length}
            hint={`${last7Days} in the last 7 days`}
            onClick={() => onNavigate("applicants")}
          />
          <ReadoutRow
            icon="chart-line-up"
            label="Scored by AI"
            value={quality.scored}
            hint={`${applicants.length - quality.scored} still waiting`}
            onClick={() => onNavigate("applicants")}
          >
            <span className="ov-readout__bar" aria-hidden="true">
              <span className="ov-grow" style={{ width: `${scoredPct}%` }} />
            </span>
          </ReadoutRow>
        </ul>
      </motion.section>

      {/* ── Act on these + Best unreviewed candidates ── */}
      <div className="ov-grid ov-grid--split">
        <motion.section variants={rise} className="ov-card" aria-labelledby="ov-act">
          <header className="ov-card__head">
            <div>
              <h2 className="ov-card__title" id="ov-act">
                <Spark className="ov-spark" />
                Act on these
              </h2>
              <p className="ov-card__sub">Where to start, most valuable first. The groups overlap, so they don't add up.</p>
            </div>
          </header>
          {actionRows.length === 0 ? (
            <p className="ov-empty">
              <CxIcon name="check" className="ov-ic" />
              Nothing needs attention right now.
            </p>
          ) : (
            <ol className="ov-actions">
              {actionRows.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate("applicants")}
                    className={`ov-action${r.primary ? " is-primary" : ""}`}
                  >
                    <span className="ov-action__node" aria-hidden="true">
                      {ACTION_ICON[r.id] === "ai" ? (
                        <AiStar className="ov-ic" />
                      ) : (
                        <CxIcon name={ACTION_ICON[r.id] as CxIconName} className="ov-ic" />
                      )}
                    </span>
                    <span className="ov-action__n">{r.count}</span>
                    <span className="ov-action__label">{r.label}</span>
                    <span className="ov-action__cta" aria-hidden="true">
                      {r.verb}
                      <CxIcon name="arrow-right" className="ov-ic ov-nudge" />
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </motion.section>

        <motion.section variants={rise} className="ov-card" aria-labelledby="ov-best">
          <header className="ov-card__head">
            <div>
              <h2 className="ov-card__title" id="ov-best">
                <Spark className="ov-spark" />
                Best candidates you haven't reviewed
              </h2>
              <p className="ov-card__sub">Highest AI fit score, still sitting in New.</p>
            </div>
            <Select value={effectiveRoleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="ov-select" aria-label="Filter by role">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {filterableRoles.map((r) => (
                  <SelectItem key={r.jobId} value={r.jobId}>
                    {r.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </header>
          {shortlist.length === 0 ? (
            <p className="ov-empty">
              <CxIcon name="check" className="ov-ic" />
              {quality.scored === 0
                ? "No scored candidates yet."
                : effectiveRoleFilter === "all"
                ? "Every scored candidate has been reviewed."
                : "No unreviewed candidates for this role."}
            </p>
          ) : (
            <ul className="ov-cands">
              {shortlist.map((a) => (
                <li key={a.id}>
                  {/* An anchor to the candidate's own page, so right-click "open in
                      new tab" works for triaging several at once. */}
                  <Link to={applicantHref(a.id)} className="ov-cand">
                    <span className="ov-avatar" aria-hidden="true">{initialsFor(a.fullName)}</span>
                    <span className="ov-cand__main">
                      <span className="ov-cand__name">{a.fullName}</span>
                      <span className="ov-cand__role">{roleTitleFor(a)}</span>
                    </span>
                    <span className="ov-score">
                      <b>{a.aiAnalysis?.fitScore}</b>
                      <small>Fit</small>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </motion.section>
      </div>

      {/* ── Where everyone stands ── */}
      <motion.section variants={rise} className="ov-card" aria-labelledby="ov-stand">
        <header className="ov-card__head">
          <div>
            <h2 className="ov-card__title" id="ov-stand">
              <Spark className="ov-spark" />
              Where everyone stands
            </h2>
            <p className="ov-card__sub">
              {applicants.length} applications along the path from first look to hire.
            </p>
          </div>
        </header>
        {applicants.length === 0 ? (
          <p className="ov-empty">No applications yet.</p>
        ) : (
          <>
            <ol className="ov-path">
              {[...pathRows, ...(exitRow ? [exitRow] : [])].map((s) => {
                const isExit = s.status === "rejected";
                return (
                  <li key={s.status}>
                    <button
                      type="button"
                      onClick={() => onNavigate("applicants")}
                      className={`ov-stage${isExit ? " ov-stage--exit" : ""}${!isExit && s.count > 0 ? " is-lit" : ""}`}
                      aria-label={`${s.label}: ${s.count}, ${pctLabel(s.count, applicants.length)} of all applications`}
                    >
                      <span className="ov-stage__node" aria-hidden="true" />
                      <span className="ov-stage__n">{s.count}</span>
                      <span className="ov-stage__label">{s.label}</span>
                      <span className="ov-stage__pct">{pctLabel(s.count, applicants.length)}</span>
                    </button>
                  </li>
                );
              })}
            </ol>

            <div className="ov-divider" />

            <div className="ov-quality">
              <div className="ov-quality__head">
                <h3 className="ov-quality__title">Candidate quality</h3>
                <span className="ov-quality__meta">of the {quality.scored} scored by AI</span>
              </div>
              {quality.scored === 0 ? (
                <p className="ov-empty">No application has been scored yet.</p>
              ) : (
                <>
                  <div
                    className="ov-seg"
                    role="img"
                    aria-label={quality.bands.map((b) => `${b.band} ${b.count}`).join(", ")}
                  >
                    {quality.bands.map(
                      (b, i) =>
                        b.count > 0 && (
                          <span
                            key={b.band}
                            className="ov-grow"
                            title={`${b.band}: ${b.count}`}
                            style={{ flexGrow: b.count, background: QUALITY_COLOR[i] }}
                          />
                        )
                    )}
                  </div>
                  <ul className="ov-legend">
                    {quality.bands.map((b, i) => (
                      <li key={b.band}>
                        <i style={{ background: QUALITY_COLOR[i] }} aria-hidden="true" />
                        {b.band} <b>{b.count}</b>
                        <small>{QUALITY_RANGE[b.band]}</small>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </>
        )}
      </motion.section>

      {/* ── Applications per open role ── */}
      <motion.section variants={rise} className="ov-card" aria-labelledby="ov-roles">
        <header className="ov-card__head">
          <div>
            <h2 className="ov-card__title" id="ov-roles">
              <Spark className="ov-spark" />
              Applications per open role
            </h2>
            <p className="ov-card__sub">
              All {roleLoad.length} open roles, busiest first. Roles with {LOW_VOLUME_MAX} or fewer applications are
              flagged: they may need more reach.
            </p>
          </div>
        </header>
        {roleLoad.length === 0 ? (
          <p className="ov-empty">No open roles.</p>
        ) : (
          <ul className="ov-roles" style={{ "--rows": Math.ceil(roleLoad.length / 2) } as CSSProperties}>
            {roleLoad.map((r) => {
              const low = r.count <= LOW_VOLUME_MAX;
              return (
                <li key={r.jobId} className={`ov-role${low ? " is-low" : ""}`}>
                  <span className="ov-role__title" title={r.title}>
                    <span>{r.title}</span>
                    {low && <span className="ov-flag">Low reach</span>}
                  </span>
                  <span className="ov-bar" aria-hidden="true">
                    <span className="ov-grow" style={{ width: `${Math.max((r.count / maxRoleCount) * 100, 2)}%` }} />
                  </span>
                  <span className="ov-role__n">{r.count}</span>
                </li>
              );
            })}
          </ul>
        )}
      </motion.section>
    </motion.div>
  );
};

export default DashboardOverview;

/** One fact in the hero readout: label, big number, the denominator that keeps it honest. */
function ReadoutRow({
  icon, label, value, hint, warn, onClick, children,
}: {
  icon: CxIconName;
  label: string;
  value: number;
  hint: string;
  warn?: boolean;
  onClick: () => void;
  children?: ReactNode;
}) {
  return (
    <li>
      <button type="button" className="ov-readout__row" onClick={onClick}>
        <span className="ov-readout__label">
          <CxIcon name={icon} className="ov-ic" />
          {label}
        </span>
        <span className="ov-readout__value">
          {value}
          <CxIcon name="arrow-up-right" className="ov-ic ov-nudge" />
        </span>
        <span className={`ov-readout__hint${warn ? " ov-readout__hint--warn" : ""}`}>{hint}</span>
        {children}
      </button>
    </li>
  );
}
