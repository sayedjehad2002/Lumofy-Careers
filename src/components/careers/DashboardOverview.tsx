import { useMemo } from "react";
import {
  Briefcase, Users, Brain, Clock, TrendingUp, ArrowRight,
  CheckCircle, BarChart3, Sparkles, AlertTriangle, Calendar,
  Zap, Eye, UserCheck, ChevronRight, Activity, Star,
} from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface DashboardOverviewProps {
  jobs: Job[];
  applicants: Applicant[];
  onNavigate: (tab: string) => void;
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

const FUNNEL_COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(45, 93%, 47%)",
  "hsl(152, 69%, 40%)",
  "hsl(271, 91%, 65%)",
  "hsl(142, 71%, 45%)",
  "hsl(0, 72%, 51%)",
];

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

  const funnelData = useMemo(() => {
    return STAGE_ORDER.map((status, i) => ({
      name: APPLICANT_STATUSES.find((s) => s.value === status)?.label || status,
      value: applicants.filter((a) => a.status === status).length,
      fill: FUNNEL_COLORS[i],
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
    if (newCount > 0) items.push({ label: "Unreviewed applicants", count: newCount, icon: Eye, color: "text-yellow-400" });
    const staleInterviews = applicants.filter((a) => {
      if (a.status !== "interview") return false;
      const entered = new Date(a.stageEnteredAt || a.appliedDate);
      return (Date.now() - entered.getTime()) > 7 * 24 * 60 * 60 * 1000;
    }).length;
    if (staleInterviews > 0) items.push({ label: "Interviews stalled >7 days", count: staleInterviews, icon: Clock, color: "text-destructive" });
    const closingSoon = jobs.filter((j) => {
      if (j.status !== "open" || !j.deadline) return false;
      const days = (new Date(j.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return days >= 0 && days <= 7;
    }).length;
    if (closingSoon > 0) items.push({ label: "Jobs closing this week", count: closingSoon, icon: Calendar, color: "text-orange-400" });
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
    { label: "Open Positions", value: openJobs, icon: Briefcase, gradient: "from-primary/20 to-primary/5", iconColor: "text-primary" },
    { label: "Total Applicants", value: applicants.length, icon: Users, gradient: "from-emerald-500/20 to-emerald-500/5", iconColor: "text-emerald-400" },
    { label: "Avg AI Score", value: avgFitScore !== null ? `${avgFitScore}` : "—", icon: Brain, gradient: "from-purple-500/20 to-purple-500/5", iconColor: "text-purple-400" },
    { label: "To Interview", value: `${conversionRates.newToInterview}%`, icon: TrendingUp, gradient: "from-yellow-500/20 to-yellow-500/5", iconColor: "text-yellow-400" },
    { label: "To Hired", value: `${conversionRates.interviewToHired}%`, icon: CheckCircle, gradient: "from-green-500/20 to-green-500/5", iconColor: "text-green-400" },
  ];

  const recColorMap: Record<string, { bar: string; text: string }> = {
    "Fast-Track": { bar: "bg-emerald-500", text: "text-emerald-400" },
    "Proceed": { bar: "bg-primary", text: "text-primary" },
    "Hold": { bar: "bg-yellow-500", text: "text-yellow-400" },
    "Not Recommended": { bar: "bg-destructive", text: "text-destructive" },
  };

  return (
    <div className="space-y-6">
      {/* ── Hero Welcome Banner ── */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 md:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.15),transparent_60%)]" />
          <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-primary/5 blur-3xl" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="text-xs font-medium text-primary tracking-wider uppercase">
                  Recruitment Command Center
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                {greeting}, Team 👋
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{todayStr}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: `${openJobs} open roles`, icon: Briefcase },
                { label: `${applicants.filter(a => a.status === "new").length} new today`, icon: Zap },
              ].map((chip) => (
                <div
                  key={chip.label}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/80 backdrop-blur-sm border border-border text-xs font-medium"
                >
                  <chip.icon className="w-3.5 h-3.5 text-primary" />
                  {chip.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Attention Alerts ── */}
      {attentionItems.length > 0 && (
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
          <div className="flex flex-wrap gap-2">
            {attentionItems.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card hover:bg-secondary/50 transition-colors"
              >
                <item.icon className={`w-4 h-4 ${item.color}`} />
                <span className="text-sm font-medium">{item.count}</span>
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {metrics.map((m, i) => (
          <motion.div key={m.label} variants={fadeUp} initial="hidden" animate="visible" custom={i + 2}>
            <Card className="group relative overflow-hidden hover:border-primary/30 transition-all duration-300 hover:shadow-lg cursor-default">
              <div className={`absolute inset-0 bg-gradient-to-br ${m.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <CardContent className="relative p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <m.icon className={`w-5 h-5 ${m.iconColor}`} />
                  </div>
                </div>
                <p className="text-3xl font-bold tracking-tight">{m.value}</p>
                <p className="text-[11px] text-muted-foreground mt-1 tracking-wide uppercase font-medium">{m.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ── Pipeline Funnel + Candidates by Stage ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={7}>
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-primary" />
                </div>
                Recruitment Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {funnelData.map((stage, i) => {
                  const maxVal = Math.max(...funnelData.map((s) => s.value), 1);
                  const pct = (stage.value / maxVal) * 100;
                  const total = funnelData.reduce((a, b) => a + b.value, 0);
                  const share = total > 0 ? Math.round((stage.value / total) * 100) : 0;
                  return (
                    <div key={stage.name} className="group/bar">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-muted-foreground">{stage.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{share}%</span>
                          <span className="text-sm font-bold">{stage.value}</span>
                        </div>
                      </div>
                      <div className="h-8 bg-secondary/50 rounded-lg overflow-hidden relative">
                        <motion.div
                          className="h-full rounded-lg relative"
                          style={{ backgroundColor: stage.fill }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10" />
                        </motion.div>
                      </div>
                      {i < funnelData.length - 1 && funnelData[i].value > 0 && (
                        <div className="flex justify-end mt-0.5">
                          <span className="text-[10px] text-muted-foreground/60">
                            ↓ {funnelData[i + 1].value > 0
                              ? `${Math.round((funnelData[i + 1].value / funnelData[i].value) * 100)}% pass`
                              : "0% pass"}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={8}>
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-primary" />
                </div>
                Candidates by Stage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={stageChartConfig} className="h-[240px] w-full">
                <BarChart data={stageBarData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis dataKey="stage" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Top Jobs + AI Recommendations ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={9}>
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Star className="w-4 h-4 text-primary" />
                </div>
                Top Jobs by Applicants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topJobs.map((j, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-secondary/50 ${i === 0 ? "bg-primary/5 border border-primary/10" : ""}`}
                  >
                    <span className="text-lg font-bold text-muted-foreground/40 w-6 text-center">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{j.title}</p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] border-0 shrink-0 ${
                        j.status === "open"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {j.status}
                    </Badge>
                    <span className="text-base font-bold tabular-nums">{j.count}</span>
                  </div>
                ))}
                {topJobs.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">No jobs yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={10}>
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-purple-400" />
                </div>
                AI Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(recommendations).map(([label, count]) => {
                  const total = Object.values(recommendations).reduce((a, b) => a + b, 0);
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  const colors = recColorMap[label] || { bar: "bg-muted", text: "text-muted-foreground" };
                  return (
                    <div key={label}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className={`font-medium ${colors.text}`}>{label}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">{count} · {pct}%</span>
                      </div>
                      <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${colors.bar}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6 }}
                        />
                      </div>
                    </div>
                  );
                })}
                {Object.values(recommendations).every((v) => v === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-6">No AI analyses yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Top AI Matches + Recent Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={11}>
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                </div>
                Top AI Matches
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const topMatches = applicants
                  .filter(a => a.aiAnalysis?.fitScore != null)
                  .sort((a, b) => (b.aiAnalysis?.fitScore ?? 0) - (a.aiAnalysis?.fitScore ?? 0))
                  .slice(0, 5);
                if (topMatches.length === 0) return <p className="text-sm text-muted-foreground text-center py-6">No AI analyses yet</p>;
                return (
                  <div className="space-y-2">
                    {topMatches.map((a, i) => {
                      const job = jobs.find(j => j.id === a.jobId);
                      const score = a.aiAnalysis!.fitScore;
                      const tier = score >= 85 ? "Top" : score >= 70 ? "Strong" : score >= 50 ? "Moderate" : "Weak";
                      const tierColor = tier === "Top" ? "bg-emerald-500/15 text-emerald-400" : tier === "Strong" ? "bg-primary/15 text-primary" : tier === "Moderate" ? "bg-yellow-500/15 text-yellow-400" : "bg-destructive/10 text-destructive";
                      return (
                        <div key={a.id} className={`flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-secondary/50 ${i === 0 ? "bg-emerald-500/5 border border-emerald-500/10" : ""}`}>
                          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{a.fullName}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{job?.title || "Unknown"}</p>
                          </div>
                          <Badge variant="secondary" className={`text-[10px] border-0 ${tierColor}`}>{tier}</Badge>
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-bold text-primary">{score}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={12}>
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-primary" />
                </div>
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No activity yet</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />
                  <div className="space-y-4">
                    {recentActivity.map((item, i) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 + 0.3 }}
                        className="flex items-start gap-3 pl-1"
                      >
                        <div className="w-7 h-7 rounded-full bg-secondary border-2 border-card flex items-center justify-center shrink-0 z-10">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <p className="text-sm">
                            <span className="font-medium">{item.name}</span>
                            <span className="text-muted-foreground"> {item.action} </span>
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">{item.job}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0 pt-1 tabular-nums">
                          {new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Quick Actions ── */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={13}>
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              {[
                { label: "View Pipeline", tab: "pipeline", icon: BarChart3 },
                { label: "Manage Jobs", tab: "jobs", icon: Briefcase },
                { label: "All Applicants", tab: "applicants", icon: Users },
              ].map((action) => (
                <button
                  key={action.tab}
                  onClick={() => onNavigate(action.tab)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-primary/10 border border-transparent hover:border-primary/20 text-sm font-medium transition-all duration-200 group"
                >
                  <action.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  {action.label}
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default DashboardOverview;
