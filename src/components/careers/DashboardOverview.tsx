import { useMemo } from "react";
import {
  Brain, Clock, Eye, Calendar, AlertTriangle,
  Activity, BarChart3, Star, UserCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import type { Job, Applicant, ApplicantStatus } from "@/types/careers";
import { APPLICANT_STATUSES } from "@/types/careers";
import { FUNNEL_FILLS, TONE_SOFT, TONE_TEXT, TONE_BG, tierSoft } from "./statusColors";
import { Panel, StatTile, Meter } from "./dashboard/primitives";

interface DashboardOverviewProps {
  jobs: Job[];
  applicants: Applicant[];
  onNavigate: (tab: string) => void;
}

const STAGE_ORDER: ApplicantStatus[] = ["new", "reviewing", "shortlisted", "interview", "hired"];

const DashboardOverview = ({ jobs, applicants, onNavigate }: DashboardOverviewProps) => {
  const openJobs = useMemo(() => jobs.filter((j) => j.status === "open").length, [jobs]);

  const avgFitScore = useMemo(() => {
    const withScore = applicants.filter((a) => a.aiAnalysis?.fitScore);
    if (!withScore.length) return null;
    const total = withScore.reduce((sum, a) => sum + (a.aiAnalysis?.fitScore || 0), 0);
    return Math.round(total / withScore.length);
  }, [applicants]);

  const conversionRates = useMemo(() => {
    const total = applicants.length;
    const interviewCount = applicants.filter((a) =>
      ["interview", "hired"].includes(a.status)
    ).length;
    const hiredCount = applicants.filter((a) => a.status === "hired").length;
    const interviewOnly = applicants.filter((a) => a.status === "interview").length;
    return {
      newToInterview: total > 0 ? Math.round((interviewCount / total) * 100) : 0,
      interviewToHired: (interviewOnly + hiredCount) > 0
        ? Math.round((hiredCount / (interviewOnly + hiredCount)) * 100) : 0,
    };
  }, [applicants]);

  // Average days from application to hire (approx: applied_date -> stage_entered_at of hired).
  const avgTimeToHire = useMemo(() => {
    const hired = applicants.filter((a) => a.status === "hired");
    if (!hired.length) return null;
    const days = hired.map((a) => {
      const start = new Date(a.appliedDate).getTime();
      const end = new Date(a.stageEnteredAt || a.appliedDate).getTime();
      return Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
    });
    return Math.round(days.reduce((s, d) => s + d, 0) / days.length);
  }, [applicants]);

  const funnelData = useMemo(() => {
    return STAGE_ORDER.map((status, i) => ({
      name: APPLICANT_STATUSES.find((s) => s.value === status)?.label || status,
      value: applicants.filter((a) => a.status === status).length,
      fill: FUNNEL_FILLS[i],
    }));
  }, [applicants]);

  const stageBarData = useMemo(() => {
    return APPLICANT_STATUSES.map((s) => ({
      stage: s.label,
      count: applicants.filter((a) => a.status === s.value).length,
    }));
  }, [applicants]);

  const stageChartConfig: ChartConfig = {
    count: { label: "Candidates", color: "hsl(var(--primary))" },
  };

  const topJobs = useMemo(() => {
    return jobs
      .map((j) => ({
        title: j.title,
        count: applicants.filter((a) => a.jobId === j.id).length,
        status: j.status,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [jobs, applicants]);

  const recommendations = useMemo(() => {
    const recs: Record<string, number> = {
      "Fast-Track": 0, "Proceed": 0, "Hold": 0, "Not Recommended": 0,
    };
    applicants.forEach((a) => {
      if (!a.aiAnalysis?.recommendation) return;
      if (a.aiAnalysis.recommendation.includes("Fast-Track")) recs["Fast-Track"]++;
      else if (a.aiAnalysis.recommendation.includes("Proceed")) recs["Proceed"]++;
      else if (a.aiAnalysis.recommendation.includes("Hold")) recs["Hold"]++;
      else recs["Not Recommended"]++;
    });
    return recs;
  }, [applicants]);

  // Attention items
  const attentionItems = useMemo(() => {
    const items: { label: string; count: number; icon: typeof AlertTriangle; color: string }[] = [];
    const newCount = applicants.filter((a) => a.status === "new").length;
    if (newCount > 0) items.push({ label: "unreviewed", count: newCount, icon: Eye, color: TONE_TEXT.warning });
    const staleInterviews = applicants.filter((a) => {
      if (a.status !== "interview") return false;
      const entered = new Date(a.stageEnteredAt || a.appliedDate);
      return (Date.now() - entered.getTime()) > 7 * 24 * 60 * 60 * 1000;
    }).length;
    if (staleInterviews > 0) items.push({ label: "interviews stalled >7d", count: staleInterviews, icon: Clock, color: "text-destructive" });
    const closingSoon = jobs.filter((j) => {
      if (j.status !== "open" || !j.deadline) return false;
      const days = (new Date(j.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return days >= 0 && days <= 7;
    }).length;
    if (closingSoon > 0) items.push({ label: "jobs closing this week", count: closingSoon, icon: Calendar, color: TONE_TEXT.bronze });
    return items;
  }, [applicants, jobs]);

  // Recent activity
  const recentActivity = useMemo(() => {
    return [...applicants]
      .sort((a, b) => new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime())
      .slice(0, 6)
      .map((a) => {
        const job = jobs.find((j) => j.id === a.jobId);
        return {
          id: a.id,
          name: a.fullName,
          action: a.status === "new" ? "applied" : `moved to ${a.status}`,
          job: job?.title || "Unknown",
          date: a.appliedDate,
        };
      });
  }, [applicants, jobs]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  const metrics = [
    { label: "Open Positions", value: openJobs, tab: "jobs" },
    { label: "Total Applicants", value: applicants.length, tab: "applicants" },
    { label: "Avg AI Score", value: avgFitScore !== null ? `${avgFitScore}` : "—", tab: "applicants" },
    { label: "Avg Time-to-Hire", value: avgTimeToHire !== null ? `${avgTimeToHire}d` : "—", tab: "pipeline" },
    { label: "To Interview", value: `${conversionRates.newToInterview}%`, tab: "pipeline" },
    { label: "To Hired", value: `${conversionRates.interviewToHired}%`, tab: "pipeline" },
  ];

  const recColorMap: Record<string, string> = {
    "Fast-Track": TONE_BG.success,
    "Proceed": "bg-primary",
    "Hold": TONE_BG.warning,
    "Not Recommended": "bg-destructive",
  };
  const recTextMap: Record<string, string> = {
    "Fast-Track": TONE_TEXT.success,
    "Proceed": "text-primary",
    "Hold": TONE_TEXT.warning,
    "Not Recommended": "text-destructive",
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Overview</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{greeting} · {todayStr}</p>
        </div>
        {attentionItems.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attentionItems.map((item, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card/50 px-2.5 py-1.5 text-xs text-muted-foreground"
              >
                <item.icon className={`h-3.5 w-3.5 ${item.color}`} aria-hidden="true" />
                <span className="font-semibold tabular-nums text-foreground">{item.count}</span>
                {item.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── KPI tiles ── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {metrics.map((m) => (
          <StatTile key={m.label} label={m.label} value={m.value} onClick={() => onNavigate(m.tab)} />
        ))}
      </div>

      {/* ── Pipeline + Candidates by stage ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Recruitment pipeline" icon={Activity}>
          <div className="space-y-3">
            {funnelData.map((stage) => {
              const maxVal = Math.max(...funnelData.map((s) => s.value), 1);
              const pct = (stage.value / maxVal) * 100;
              const total = funnelData.reduce((a, b) => a + b.value, 0);
              const share = total > 0 ? Math.round((stage.value / total) * 100) : 0;
              return (
                <div key={stage.name}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{stage.name}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {share}% · <span className="font-semibold text-foreground">{stage.value}</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary/60">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: stage.fill }} />
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

      {/* ── Top jobs + AI recommendations ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Top jobs by applicants" icon={Star}>
          <div className="space-y-1">
            {topJobs.map((j, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-secondary/40">
                <span className="w-5 text-center text-xs font-semibold tabular-nums text-muted-foreground/50">{i + 1}</span>
                <p className="min-w-0 flex-1 truncate text-sm text-foreground">{j.title}</p>
                <Badge variant="secondary" className={`shrink-0 border-0 text-[10px] ${j.status === "open" ? TONE_SOFT.success : "bg-muted text-muted-foreground"}`}>
                  {j.status}
                </Badge>
                <span className="w-7 text-right text-sm font-semibold tabular-nums text-foreground">{j.count}</span>
              </div>
            ))}
            {topJobs.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No jobs yet</p>}
          </div>
        </Panel>

        <Panel title="AI recommendations" icon={Brain}>
          <div className="space-y-3.5">
            {Object.entries(recommendations).map(([label, count]) => {
              const total = Object.values(recommendations).reduce((a, b) => a + b, 0);
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <Meter
                  key={label}
                  label={label}
                  value={`${count} · ${pct}%`}
                  pct={pct}
                  barColor={recColorMap[label] || "bg-muted"}
                  labelColor={recTextMap[label] || "text-muted-foreground"}
                />
              );
            })}
            {Object.values(recommendations).every((v) => v === 0) && (
              <p className="py-6 text-center text-sm text-muted-foreground">No AI analyses yet</p>
            )}
          </div>
        </Panel>
      </div>

      {/* ── Top AI matches + Recent activity ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
                    <div key={a.id} className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-secondary/40">
                      <span className="w-5 text-center text-xs font-semibold tabular-nums text-muted-foreground/50">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground">{a.fullName}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{job?.title || "Unknown"}</p>
                      </div>
                      <Badge variant="secondary" className={`shrink-0 border-0 text-[10px] ${tierSoft(tier)}`}>{tier}</Badge>
                      <span className="w-8 text-right text-sm font-semibold tabular-nums text-primary">{score}</span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
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
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
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
