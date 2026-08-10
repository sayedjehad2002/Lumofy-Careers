import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, AlertTriangle, Briefcase, UserCheck } from "lucide-react";
import { motion } from "framer-motion";
import type { Job, Applicant } from "@/types/careers";
import { CHART_SERIES, STATUS_COLORS, TONE_TEXT } from "./statusColors";
import { Panel, MetricTile, LiveDot } from "./dashboard/primitives";
import {
  statusBreakdown,
  qualityBands,
  actionQueue,
  applicationsPerRole,
  oldestUnreviewed,
  topUnreviewed,
  dailyCounts,
} from "@/lib/dashboardMetrics";
import { useCareers } from "@/contexts/CareersContext";
import { useLiveRefresh } from "@/hooks/use-live-refresh";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// Auto-refresh cadence while the Overview is open and the tab is visible.
const LIVE_INTERVAL_MS = 30_000;

// Applications-per-role volume bands (shared by the tile hint, the bar color,
// and the caption below — one source so they can't drift out of sync).
const LOW_VOLUME_MAX = 4;
const MID_VOLUME_MAX = 9;

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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-5">
      {/* ── Header ── */}
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Overview</h1>
          <LiveDot />
          {onOpenSources && (
            <button
              type="button"
              onClick={onOpenSources}
              className="ml-auto text-xs text-muted-foreground transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Where candidates come from &rarr;
            </button>
          )}
        </div>
        <p className="mt-1 text-sm">
          {unreviewedCount > 0 ? (
            <>
              <span className={TONE_TEXT.warning}>
                {unreviewedCount === 1
                  ? "1 application has never been opened."
                  : `${unreviewedCount} applications have never been opened.`}
              </span>
              {oldestFormatted && (
                <span className="text-muted-foreground"> The oldest has been waiting since {oldestFormatted}.</span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">Everything received has been reviewed.</span>
          )}
        </p>
      </div>

      {/* ── Four metric tiles ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricTile
          label="Open roles"
          value={roleLoad.length}
          hint={lowVolumeRoles > 0 ? `${lowVolumeRoles} with almost no applicants` : undefined}
          onClick={() => onNavigate("jobs")}
        />
        <MetricTile
          label="Applications"
          value={applicants.length}
          hint={`${last7Days} in the last 7 days`}
          onClick={() => onNavigate("applicants")}
        />
        <MetricTile
          label="Never opened"
          value={unreviewedCount}
          hint={`${unreviewedPct}% of everything received`}
          tone={unreviewedCount > 0 ? "warning" : "default"}
          onClick={() => onNavigate("applicants")}
        />
        <MetricTile
          label="Scored by AI"
          value={quality.scored}
          hint={`${applicants.length - quality.scored} still waiting`}
          onClick={() => onNavigate("applicants")}
        />
      </div>

      {/* ── Where everyone stands ── */}
      <Panel title="Where everyone stands" icon={Activity}>
        {applicants.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No applications yet.</p>
        ) : (
          <div className="space-y-4">
            <Strip
              rows={statusRows.map((s) => ({ label: s.label, count: s.count, color: STATUS_COLORS[s.status] }))}
              total={applicants.length}
            />
            <div className="flex items-center justify-between border-t border-[hsl(var(--intel-border))] pt-3">
              <h3 className="text-sm font-medium text-foreground">Candidate quality</h3>
              <span className="text-[11px] text-muted-foreground">of the {quality.scored} scored</span>
            </div>
            {quality.scored === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No application has been scored yet.</p>
            ) : (
              <Strip
                rows={quality.bands.map((b, i) => ({
                  label: b.band,
                  count: b.count,
                  color: CHART_SERIES[i % CHART_SERIES.length],
                }))}
                total={quality.scored}
              />
            )}
          </div>
        )}
      </Panel>

      {/* ── Act on these ── */}
      <Panel title="Act on these" icon={AlertTriangle} bodyClassName="p-2">
        {actionRows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nothing needs attention right now.</p>
        ) : (
          <ul className="space-y-1">
            {actionRows.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => onNavigate("applicants")}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[hsl(var(--intel-card-hover))] ${
                    r.primary ? "bg-primary/[0.06]" : ""
                  }`}
                >
                  <span
                    className={`w-6 shrink-0 font-mono text-sm font-semibold tabular-nums ${
                      r.primary ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {r.count}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">{r.label}</span>
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">{r.verb} →</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* ── Applications per open role + Best unreviewed candidates ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Applications per open role" icon={Briefcase}>
          {roleLoad.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No open roles.</p>
          ) : (
            <>
              <p className="mb-3 text-[11px] text-muted-foreground">
                All {roleLoad.length} open roles. The short bars are the point.
              </p>
              <ul className="space-y-2">
                {roleLoad.map((r) => {
                  const widthPct = Math.max((r.count / maxRoleCount) * 100, 1.5);
                  const color =
                    r.count <= LOW_VOLUME_MAX
                      ? "hsl(var(--chart-4))"
                      : r.count <= MID_VOLUME_MAX
                      ? "hsl(var(--chart-5))"
                      : "hsl(var(--chart-1))";
                  return (
                    <li key={r.jobId} className="flex items-center gap-3">
                      <span className="w-[42%] truncate text-sm text-foreground" title={r.title}>
                        {r.title}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary/40">
                        <div className="h-full rounded-full" style={{ width: `${widthPct}%`, background: color }} />
                      </div>
                      <span className="w-7 shrink-0 text-right text-sm font-medium tabular-nums text-foreground">
                        {r.count}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Pink under {LOW_VOLUME_MAX + 1} applicants, amber under {MID_VOLUME_MAX + 1}.
              </p>
            </>
          )}
        </Panel>

        <Panel
          title="Best candidates you haven't reviewed"
          icon={UserCheck}
          action={
            <Select value={effectiveRoleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-7 w-[170px] text-xs" aria-label="Filter by role">
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
          }
        >
          {shortlist.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {quality.scored === 0
                ? "No scored candidates yet."
                : effectiveRoleFilter === "all"
                ? "Every scored candidate has been reviewed."
                : "No unreviewed candidates for this role."}
            </p>
          ) : (
            <ul className="space-y-1">
              {shortlist.map((a) => (
                <li key={a.id}>
                  {/* This row used to dump you on the undifferentiated Applicants
                      list — it had no way to name a person, because onNavigate only
                      takes a tab. Now that every candidate has a URL it goes
                      straight to them, and being an anchor means right-click "open
                      in new tab" works for triaging several at once. */}
                  <Link
                    to={applicantHref(a.id)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-[hsl(var(--intel-card-hover))]"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {initialsFor(a.fullName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">{a.fullName}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{roleTitleFor(a)}</p>
                    </div>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-primary">
                      {a.aiAnalysis?.fitScore}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </motion.div>
  );
};

export default DashboardOverview;

/** One horizontal bar split into proportional segments, with a legend beneath.
 *  Segments below ~1% still render at a floor width so a single candidate stays visible.
 *  Color travels per-row (not a shared palette indexed by position) so it can never
 *  collide or drift if a row set grows, shrinks, or reorders. */
function Strip({ rows, total }: {
  rows: { label: string; count: number; color: string }[]; total: number;
}) {
  if (total === 0) return null;
  return (
    <>
      <div className="flex h-3.5 overflow-hidden rounded-full bg-secondary/40" role="img"
        aria-label={rows.map(r => `${r.label} ${r.count}`).join(", ")}>
        {rows.map((r) => r.count > 0 && (
          <div key={r.label} title={`${r.label}: ${r.count}`}
            style={{ width: `${Math.max((r.count / total) * 100, 0.6)}%`, background: r.color }} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        {rows.map((r) => (
          <span key={r.label} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ background: r.color }} aria-hidden="true" />
            {r.label} <span className="font-medium text-foreground tabular-nums">{r.count}</span>
          </span>
        ))}
      </div>
    </>
  );
}
