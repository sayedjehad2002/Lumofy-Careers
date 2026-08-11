import { useMemo } from "react";
import { Globe, Link2, TrendingUp, Briefcase, Megaphone, Gauge, Info } from "lucide-react";
import type { Applicant } from "@/types/careers";
import { Panel, MetricTile } from "@/components/careers/dashboard/primitives";
import { CHART_SERIES, TONE_TEXT } from "@/components/careers/statusColors";

interface SourceAnalyticsProps {
  applicants: Applicant[];
  getJobTitle: (jobId: string) => string;
}

/**
 * Where applications come from.
 *
 * This screen used to INVENT a source: it read "LinkedIn" from whether the
 * candidate had filled in their LinkedIn profile field, and "Direct Apply" from
 * a cover letter longer than 200 characters. Every applicant in fact arrived
 * through the careers page, so the chart was a form-completeness breakdown wearing
 * an acquisition-channel label — and its Avg Score column invited the conclusion
 * "LinkedIn candidates are better, spend more there".
 *
 * Real referrer/UTM capture now happens at apply time (src/lib/attribution.ts ->
 * submit-application). Applications recorded before that have `source` undefined
 * and are reported as untracked rather than guessed.
 */

/** Bands wide enough to be meaningful on a few hundred CVs. */
const SCORE_BANDS: [string, (n: number) => boolean][] = [
  ["85-100 Top", n => n >= 85],
  ["70-84 Strong", n => n >= 70 && n < 85],
  ["50-69 Moderate", n => n >= 50 && n < 70],
  ["Below 50", n => n < 50],
];

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

const SourceAnalytics = ({ applicants, getJobTitle }: SourceAnalyticsProps) => {
  const data = useMemo(() => {
    const total = applicants.length;

    // --- real channels, tracked applications only ---
    const tracked = applicants.filter(a => a.source);
    const byChannel = new Map<string, { n: number; advanced: number; scores: number[] }>();
    for (const a of tracked) {
      const key = a.source as string;
      const e = byChannel.get(key) || { n: 0, advanced: 0, scores: [] };
      e.n++;
      if (a.status === "shortlisted" || a.status === "interview" || a.status === "hired") e.advanced++;
      if (a.aiAnalysis?.fitScore) e.scores.push(a.aiAnalysis.fitScore);
      byChannel.set(key, e);
    }
    const channels = Array.from(byChannel.entries())
      .map(([name, e]) => ({
        name, n: e.n, advanced: e.advanced,
        avg: e.scores.length ? Math.round(e.scores.reduce((s, v) => s + v, 0) / e.scores.length) : null,
      }))
      .sort((a, b) => b.n - a.n);

    // Campaigns, only if anyone has actually tagged a link.
    const campaigns = new Map<string, number>();
    tracked.forEach(a => { if (a.utmCampaign) campaigns.set(a.utmCampaign, (campaigns.get(a.utmCampaign) || 0) + 1); });

    // --- applications over time (applied_date is always present) ---
    const weeks: { label: string; n: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const end = new Date(now); end.setDate(end.getDate() - i * 7);
      const start = new Date(end); start.setDate(start.getDate() - 7);
      const n = applicants.filter(a => {
        const d = new Date(a.appliedDate).getTime();
        return d > start.getTime() && d <= end.getTime();
      }).length;
      weeks.push({ label: end.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), n });
    }

    // --- by job ---
    const byJob = new Map<string, { n: number; scores: number[] }>();
    for (const a of applicants) {
      const key = a.jobId;
      const e = byJob.get(key) || { n: 0, scores: [] };
      e.n++;
      if (a.aiAnalysis?.fitScore) e.scores.push(a.aiAnalysis.fitScore);
      byJob.set(key, e);
    }
    const jobs = Array.from(byJob.entries())
      .map(([jobId, e]) => ({
        title: getJobTitle(jobId),
        n: e.n,
        avg: e.scores.length ? Math.round(e.scores.reduce((s, v) => s + v, 0) / e.scores.length) : null,
      }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 8);

    // --- quality ---
    const scored = applicants.filter(a => typeof a.aiAnalysis?.fitScore === "number");
    const bands = SCORE_BANDS.map(([label, test]) => ({
      label, n: scored.filter(a => test(a.aiAnalysis!.fitScore)).length,
    }));

    // --- what candidates actually provided ---
    // Counted independently. The old buckets were an if/else chain, so of the 33
    // people who attached a portfolio only 3 were ever shown — the other 30 also
    // had a LinkedIn URL and that branch matched first.
    const provided = [
      { label: "LinkedIn profile", n: applicants.filter(a => a.linkedin?.trim()).length },
      { label: "Portfolio or website", n: applicants.filter(a => a.portfolio?.trim()).length },
      { label: "Cover letter", n: applicants.filter(a => (a.coverLetter?.trim().length ?? 0) > 0).length },
      { label: "Phone number", n: applicants.filter(a => a.phone?.trim()).length },
    ].sort((a, b) => b.n - a.n);

    return {
      total, trackedCount: tracked.length, untracked: total - tracked.length,
      channels, campaigns: Array.from(campaigns.entries()).sort((a, b) => b[1] - a[1]),
      weeks, jobs, bands, scored: scored.length, provided,
      advanced: applicants.filter(a => ["shortlisted", "interview", "hired"].includes(a.status)).length,
    };
  }, [applicants, getJobTitle]);

  const peakWeek = Math.max(...data.weeks.map(w => w.n), 1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricTile label="Applications" value={data.total} hint="all time" />
        <MetricTile
          label="Source tracked"
          value={data.trackedCount}
          hint={data.trackedCount === 0 ? "tracking just switched on" : `${pct(data.trackedCount, data.total)}% of applications`}
        />
        <MetricTile
          label="Scored by AI"
          value={data.scored}
          hint={`${pct(data.scored, data.total)}% of applications`}
        />
        <MetricTile
          label="Reached shortlist+"
          value={data.advanced}
          hint={`${pct(data.advanced, data.total)}% of applications`}
        />
      </div>

      {/* ---------------- channels ---------------- */}
      <Panel title="Where applications come from" icon={Globe}>
        {data.trackedCount === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-secondary/20 p-5">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Info className="h-4 w-4 text-primary" aria-hidden="true" />
              No application has a recorded source yet
            </p>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted-foreground">
              Source tracking has just been switched on, and it only applies going forward. The{" "}
              {data.total} applications already in the system were submitted before anything recorded
              a referrer, so they are shown as untracked rather than attributed to a guess.
            </p>
            <p className="mt-3 text-xs font-medium text-foreground">From the next application onwards you will see:</p>
            <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
              <li>• the site each candidate arrived from (LinkedIn, Google, a job board, a referral)</li>
              <li>• direct visits, where someone typed the address or used a bookmark</li>
              <li>• campaign names, when you tag the link you share</li>
            </ul>
            <p className="mt-3 rounded-md bg-card px-2.5 py-2 font-mono text-[11px] text-muted-foreground">
              careers.lumofy.ai/jobs?utm_source=linkedin&amp;utm_campaign=october-hiring
            </p>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Share a link like that and everyone who applies through it is grouped under that campaign.
            </p>
          </div>
        ) : (
          <>
            <ul className="space-y-2.5">
              {data.channels.map((c, i) => (
                <li key={c.name} className="flex flex-wrap items-center gap-3">
                  <span className="h-2.5 w-2.5 flex-shrink-0 rounded-sm"
                    style={{ background: CHART_SERIES[i % CHART_SERIES.length] }} aria-hidden="true" />
                  <span className="w-40 text-sm">{c.name}</span>
                  <span className="h-2.5 min-w-[60px] flex-1 overflow-hidden rounded-full bg-secondary/40">
                    <span className="block h-full rounded-full"
                      style={{ width: `${Math.max(pct(c.n, data.trackedCount), 2)}%`, background: CHART_SERIES[i % CHART_SERIES.length] }} />
                  </span>
                  <span className="w-10 text-right text-sm font-medium tabular-nums">{c.n}</span>
                  <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                    {pct(c.n, data.trackedCount)}%
                  </span>
                  <span className="w-24 text-right text-xs text-muted-foreground">
                    {c.avg != null ? `avg score ${c.avg}` : "not scored"}
                  </span>
                </li>
              ))}
            </ul>
            {data.untracked > 0 && (
              <p className="mt-3 border-t border-border/60 pt-2.5 text-[11px] text-muted-foreground">
                Percentages are of the {data.trackedCount} tracked applications.{" "}
                <strong className="text-foreground">{data.untracked}</strong> earlier applications
                predate source tracking and are deliberately left out rather than assigned a channel.
              </p>
            )}
            {data.channels.some(c => c.n < 20) && (
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Channels under ~20 applications are too small to compare on quality yet.
              </p>
            )}
          </>
        )}
      </Panel>

      {data.campaigns.length > 0 && (
        <Panel title="Campaigns" icon={Megaphone}>
          <ul className="space-y-2">
            {data.campaigns.map(([name, n]) => (
              <li key={name} className="flex items-center gap-3 text-sm">
                <span className="flex-1 truncate">{name}</span>
                <span className="tabular-nums font-medium">{n}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* ---------------- volume ---------------- */}
      <Panel title="Applications received" icon={TrendingUp}>
        <div className="flex h-32 items-end gap-1.5">
          {data.weeks.map(w => (
            <div key={w.label} className="flex flex-1 flex-col items-center gap-1" title={`${w.label}: ${w.n}`}>
              <span className="text-[10px] tabular-nums text-muted-foreground">{w.n || ""}</span>
              <span
                className="w-full rounded-t bg-primary/70"
                style={{ height: `${Math.max((w.n / peakWeek) * 100, w.n ? 4 : 1)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
          <span>{data.weeks[0]?.label}</span>
          <span>last 12 weeks, by week ending</span>
          <span>{data.weeks[data.weeks.length - 1]?.label}</span>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Most applied-to roles" icon={Briefcase}>
          <ul className="space-y-2">
            {data.jobs.map(j => (
              <li key={j.title} className="flex items-center gap-3">
                <span className="w-[45%] text-xs leading-snug text-muted-foreground" title={j.title}>{j.title}</span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary/40">
                  <span className="block h-full rounded-full bg-primary"
                    style={{ width: `${Math.max(pct(j.n, data.jobs[0]?.n || 1), 2)}%` }} />
                </span>
                <span className="w-8 text-right text-xs font-medium tabular-nums">{j.n}</span>
                <span className="w-16 text-right text-[11px] tabular-nums text-muted-foreground">
                  {j.avg != null ? `avg ${j.avg}` : "—"}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Candidate quality" icon={Gauge}>
          {data.scored === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No application has been scored yet.</p>
          ) : (
            <>
              <ul className="space-y-2">
                {data.bands.map((b, i) => (
                  <li key={b.label} className="flex items-center gap-3">
                    <span className="w-32 text-xs text-muted-foreground">{b.label}</span>
                    <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary/40">
                      <span className="block h-full rounded-full"
                        style={{ width: `${Math.max(pct(b.n, data.scored), 2)}%`, background: CHART_SERIES[i % CHART_SERIES.length] }} />
                    </span>
                    <span className="w-8 text-right text-xs font-medium tabular-nums">{b.n}</span>
                    <span className="w-9 text-right text-[11px] tabular-nums text-muted-foreground">
                      {pct(b.n, data.scored)}%
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 border-t border-border/60 pt-2.5 text-[11px] text-muted-foreground">
                Of the {data.scored} applications the AI has scored.{" "}
                {data.total - data.scored > 0 && `${data.total - data.scored} are still waiting to be analysed.`}
              </p>
            </>
          )}
        </Panel>
      </div>

      {/* ---------------- what candidates provided ---------------- */}
      <Panel title="What candidates provided" icon={Link2}>
        <ul className="space-y-2">
          {data.provided.map(p => (
            <li key={p.label} className="flex items-center gap-3">
              <span className="w-40 text-xs text-muted-foreground">{p.label}</span>
              <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary/40">
                <span className="block h-full rounded-full bg-primary/60"
                  style={{ width: `${Math.max(pct(p.n, data.total), 2)}%` }} />
              </span>
              <span className="w-10 text-right text-xs font-medium tabular-nums">{p.n}</span>
              <span className="w-9 text-right text-[11px] tabular-nums text-muted-foreground">
                {pct(p.n, data.total)}%
              </span>
            </li>
          ))}
        </ul>
        <p className={`mt-3 border-t border-border/60 pt-2.5 text-[11px] ${TONE_TEXT.muted}`}>
          Counted independently — a candidate can appear on more than one row. This is how complete
          the applications are, not where the candidates came from.
        </p>
      </Panel>
    </div>
  );
};

export default SourceAnalytics;
