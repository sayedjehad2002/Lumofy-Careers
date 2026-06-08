import { useMemo } from "react";
import {
  Brain, Clock, Activity, BarChart3, Star, UserCheck,
  AlertTriangle, TrendingUp, ChevronRight, CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import type { Job, Applicant, ApplicantStatus } from "@/types/careers";
import { APPLICANT_STATUSES } from "@/types/careers";
import { FUNNEL_FILLS, TONE_SOFT, TONE_TEXT, TONE_BG, tierSoft } from "./statusColors";
import { Panel, MetricTile, Meter, Sparkline, LiveDot } from "./dashboard/primitives";
import AnimatedCounter from "./AnimatedCounter";
import { dailyCounts, trendDeltaPct, hasTrend, computeAttention } from "@/lib/dashboardMetrics";

interface DashboardOverviewProps {
  jobs: Job[];
  applicants: Applicant[];
  onNavigate: (tab: string) => void;
}

const STAGE_ORDER: ApplicantStatus[] = ["new", "reviewing", "shortlisted", "interview", "hired"];
const DAY = 86_400_000;

const DashboardOverview = ({ jobs, applicants, onNavigate }: DashboardOverviewProps) => {
  const now = useMemo(() => Date.now(), []);

  const openJobs = useMemo(() => jobs.filter((j) => j.status === "open").length, [jobs]);

  const avgFitScore = useMemo(() => {
    const withScore = applicants.filter((a) => a.aiAnalysis?.fitScore);
    if (!withScore.length) return null;
    const total = withScore.reduce((sum, a) => sum + (a.aiAnalysis?.fitScore || 0), 0);
    return Math.round(total / withScore.length);
  }, [applicants]);

  const conversionRates = useMemo(() => {
    const total = applicants.length;
    const interviewCount = applicants.filter((a) => ["interview", "hired"].includes(a.status)).length;
    const hiredCount = applicants.filter((a) => a.status === "hired").length;
    const interviewOnly = applicants.filter((a) => a.status === "interview").length;
    return {
      newToInterview: total > 0 ? Math.round((interviewCount / total) * 100) : 0,
      interviewToHired: interviewOnly + hiredCount > 0 ? Math.round((hiredCount / (interviewOnly + hiredCount)) * 100) : 0,
    };
  }, [applicants]);

  const avgTimeToHire = useMemo(() => {
    const hired = applicants.filter((a) => a.status === "hired");
    if (!hired.length) return null;
    const days = hired.map((a) => {
      const start = new Date(a.appliedDate).getTime();
      const end = new Date(a.stageEnteredAt || a.appliedDate).getTime();
      return Math.max(0, (end - start) / DAY);
    });
    return Math.round(days.reduce((s, d) => s + d, 0) / days.length);
  }, [applicants]);

  // ── live intelligence (honest derivations from real fields) ──
  const appliedSeries = useMemo(() => dailyCounts(applicants.map((a) => a.appliedDate), 14, now), [applicants, now]);
  const showAppliedTrend = hasTrend(appliedSeries);
  const appliedDelta = trendDeltaPct(appliedSeries);
  const attention = useMemo(() => computeAttention(applicants, jobs, now), [applicants, jobs, now]);
  const attentionTotal = attention.unreviewed + attention.stalledInterviews + attention.jobsClosingSoon + attention.slaBreaches;
  const inPipeline = useMemo(() => applicants.filter((a) => !["hired", "rejected"].includes(a.status)).length, [applicants]);
  const hiredLast30 = useMemo(
    () => applicants.filter((a) => a.status === "hired" && (now - new Date(a.stageEnteredAt || a.appliedDate).getTime()) / DAY <= 30).length,
    [applicants, now]
  );

  const funnelData = useMemo(() => {
    return STAGE_ORDER.map((status, i) => ({
      name: APPLICANT_STATUSES.find((s) => s.value === status)?.label || status,
      value: applicants.filter((a) => a.status === status).length,
      fill: FUNNEL_FILLS[i],
    }));
  }, [applicants]);

  const stageBarData = useMemo(
    () => APPLICANT_STATUSES.map((s) => ({ stage: s.label, count: applicants.filter((a) => a.status === s.value).length })),
    [applicants]
  );
  const stageChartConfig: ChartConfig = { count: { label: "Candidates", color: "hsl(var(--primary))" } };

  const topJobs = useMemo(() => {
    return jobs
      .map((j) => ({ title: j.title, count: applicants.filter((a) => a.jobId === j.id).length, status: j.status }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [jobs, applicants]);

  const recommendations = useMemo(() => {
    const recs: Record<string, number> = { "Fast-Track": 0, Proceed: 0, Hold: 0, "Not Recommended": 0 };
    applicants.forEach((a) => {
      const r = a.aiAnalysis?.recommendation;
      if (!r) return;
      if (r.includes("Fast-Track")) recs["Fast-Track"]++;
      else if (r.includes("Proceed")) recs["Proceed"]++;
      else if (r.includes("Hold")) recs["Hold"]++;
      else recs["Not Recommended"]++;
    });
    return recs;
  }, [applicants]);

  const recentActivity = useMemo(() => {
    return [...applicants]
      .sort((a, b) => new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime())
      .slice(0, 6)
      .map((a) => ({
        id: a.id,
        name: a.fullName,
        action: a.status === "new" ? "applied" : `moved to ${a.status}`,
        job: jobs.find((j) => j.id === a.jobId)?.title || "Unknown",
        date: a.appliedDate,
      }));
  }, [applicants, jobs]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  }, []);
  const todayStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const metrics = [
    { label: "Open positions", value: <AnimatedCounter value={openJobs} duration={1.2} />, tab: "jobs", series: undefined as number[] | undefined, delta: undefined as number | null | undefined },
    { label: "Total applicants", value: <AnimatedCounter value={applicants.length} duration={1.2} />, tab: "applicants", series: showAppliedTrend ? appliedSeries : undefined, delta: showAppliedTrend ? appliedDelta : undefined },
    { label: "Avg AI score", value: avgFitScore !== null ? <AnimatedCounter value={avgFitScore} duration={1.2} /> : "—", tab: "applicants", series: undefined, delta: undefined },
    { label: "Avg time-to-hire", value: avgTimeToHire !== null ? <AnimatedCounter value={avgTimeToHire} suffix="d" duration={1.2} /> : "—", tab: "pipeline", series: undefined, delta: undefined },
    { label: "To interview", value: <AnimatedCounter value={conversionRates.newToInterview} suffix="%" duration={1.2} />, tab: "pipeline", series: undefined, delta: undefined },
    { label: "To hired", value: <AnimatedCounter value={conversionRates.interviewToHired} suffix="%" duration={1.2} />, tab: "pipeline", series: undefined, delta: undefined },
  ];

  const attentionRows = [
    { label: "Unreviewed applicants", count: attention.unreviewed, tone: TONE_SOFT.warning, tab: "applicants" },
    { label: "Interviews stalled >7d", count: attention.stalledInterviews, tone: TONE_SOFT.danger, tab: "pipeline" },
    { label: "Jobs closing this week", count: attention.jobsClosingSoon, tone: TONE_SOFT.bronze, tab: "jobs" },
    { label: "SLA breaches", count: attention.slaBreaches, tone: TONE_SOFT.danger, tab: "pipeline" },
  ].filter((r) => r.count > 0);

  const recColorMap: Record<string, string> = { "Fast-Track": TONE_BG.success, Proceed: "bg-primary", Hold: TONE_BG.warning, "Not Recommended": "bg-destructive" };
  const recTextMap: Record<string, string> = { "Fast-Track": TONE_TEXT.success, Proceed: "text-primary", Hold: TONE_TEXT.warning, "Not Recommended": "text-destructive" };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-5">
      {/* ── Command header ── */}
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Overview</h1>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--intel-border))] bg-[hsl(var(--intel-card))] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <LiveDot /> Live
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{greeting} · {todayStr}</p>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
          <span className="tabular-nums text-foreground">{inPipeline}</span> in pipeline
          {" · "}
          <span className="tabular-nums text-foreground">{attentionTotal}</span> need attention
        </p>
      </div>

      {/* ── Hero metric row ── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {metrics.map((m) => (
          <MetricTile key={m.label} label={m.label} value={m.value} delta={m.delta} series={m.series} onClick={() => onNavigate(m.tab)} />
        ))}
      </div>

      {/* ── Pipeline strip ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Recruitment pipeline" icon={Activity}>
          <div className="space-y-3">
            {funnelData.map((stage, i) => {
              const maxVal = Math.max(...funnelData.map((s) => s.value), 1);
              const pct = (stage.value / maxVal) * 100;
              const prev = i > 0 ? funnelData[i - 1].value : null;
              const conv = prev && prev > 0 ? Math.round((stage.value / prev) * 100) : null;
              return (
                <div key={stage.name}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{stage.name}</span>
                    <span className="font-mono tabular-nums text-muted-foreground">
                      {conv !== null && <span className="mr-2 text-muted-foreground/60">{conv}%↦</span>}
                      <span className="font-semibold text-foreground">{stage.value}</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[hsl(var(--intel-gauge-track))]">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: stage.fill, transformOrigin: "left", width: "100%" }}
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: pct / 100 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.7, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Candidates by stage" icon={BarChart3}>
          <ChartContainer config={stageChartConfig} className="h-[220px] w-full">
            <BarChart data={stageBarData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" vertical={false} />
              <XAxis dataKey="stage" tick={{ fontSize: 11 }} className="fill-muted-foreground" tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" allowDecimals={false} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </Panel>
      </div>

      {/* ── Signals row ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Needs attention" icon={AlertTriangle}>
          {attentionRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="h-8 w-8 text-[hsl(var(--intel-success))] opacity-80" aria-hidden="true" />
              <p className="mt-2 text-sm font-medium text-foreground">All clear</p>
              <p className="text-xs text-muted-foreground">Nothing needs your attention right now.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {attentionRows.map((r) => (
                <button
                  key={r.label}
                  type="button"
                  onClick={() => onNavigate(r.tab)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-[hsl(var(--intel-card-hover))]"
                >
                  <span className={`flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-xs font-semibold tabular-nums ${r.tone}`}>{r.count}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">{r.label}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </button>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Momentum" icon={TrendingUp}>
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Applications · 14d</p>
          <div className="mt-2 h-12">
            {showAppliedTrend ? (
              <Sparkline data={appliedSeries} className="h-12 w-full text-primary" />
            ) : (
              <div className="flex h-full items-center text-xs text-muted-foreground">Not enough data yet</div>
            )}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[hsl(var(--intel-border))] pt-3">
            <div>
              <div className="text-xl font-semibold tabular-nums text-foreground">{applicants.length}</div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">total applicants</p>
            </div>
            <div>
              <div className="text-xl font-semibold tabular-nums text-foreground">{hiredLast30}</div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">hired · 30d</p>
            </div>
          </div>
        </Panel>

        <Panel title="AI recommendations" icon={Brain}>
          <div className="space-y-3.5">
            {Object.entries(recommendations).map(([label, count]) => {
              const total = Object.values(recommendations).reduce((a, b) => a + b, 0);
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <Meter key={label} label={label} value={`${count} · ${pct}%`} pct={pct} barColor={recColorMap[label] || "bg-muted"} labelColor={recTextMap[label] || "text-muted-foreground"} />
              );
            })}
            {Object.values(recommendations).every((v) => v === 0) && (
              <p className="py-6 text-center text-sm text-muted-foreground">No AI analyses yet</p>
            )}
          </div>
        </Panel>
      </div>

      {/* ── Detail row ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Top AI matches" icon={UserCheck}>
          {(() => {
            const topMatches = applicants
              .filter((a) => a.aiAnalysis?.fitScore != null)
              .sort((a, b) => (b.aiAnalysis?.fitScore ?? 0) - (a.aiAnalysis?.fitScore ?? 0))
              .slice(0, 5);
            if (topMatches.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">No AI analyses yet</p>;
            return (
              <div className="space-y-1">
                {topMatches.map((a, i) => {
                  const job = jobs.find((j) => j.id === a.jobId);
                  const score = a.aiAnalysis!.fitScore;
                  const tier = score >= 85 ? "Top" : score >= 70 ? "Strong" : score >= 50 ? "Moderate" : "Weak";
                  return (
                    <div key={a.id} className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-[hsl(var(--intel-card-hover))]">
                      <span className="w-5 text-center font-mono text-xs font-semibold tabular-nums text-muted-foreground/50">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground">{a.fullName}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{job?.title || "Unknown"}</p>
                      </div>
                      <Badge variant="secondary" className={`shrink-0 border-0 text-[10px] ${tierSoft(tier)}`}>{tier}</Badge>
                      <span className="w-8 text-right font-mono text-sm font-semibold tabular-nums text-primary">{score}</span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </Panel>

        <Panel title="Top jobs by applicants" icon={Star}>
          <div className="space-y-1">
            {topJobs.map((j, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-[hsl(var(--intel-card-hover))]">
                <span className="w-5 text-center font-mono text-xs font-semibold tabular-nums text-muted-foreground/50">{i + 1}</span>
                <p className="min-w-0 flex-1 truncate text-sm text-foreground">{j.title}</p>
                <Badge variant="secondary" className={`shrink-0 border-0 text-[10px] ${j.status === "open" ? TONE_SOFT.success : "bg-muted text-muted-foreground"}`}>{j.status}</Badge>
                <span className="w-7 text-right font-mono text-sm font-semibold tabular-nums text-foreground">{j.count}</span>
              </div>
            ))}
            {topJobs.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No jobs yet</p>}
          </div>
        </Panel>

        <Panel title="Recent activity" icon={Clock}>
          {recentActivity.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No activity yet</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((item) => (
                <div key={item.id} className="flex items-start gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium text-foreground">{item.name}</span>
                      <span className="text-muted-foreground"> {item.action}</span>
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">{item.job}</p>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                    {new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </motion.div>
  );
};

export default DashboardOverview;
