import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, Zap, Target } from "lucide-react";
import type { Applicant, ApplicantStatus } from "@/types/careers";
import { STAGE_SLA_DAYS } from "@/types/careers";

interface TimeToHireProps {
  applicants: Applicant[];
}

const STAGE_ORDER: ApplicantStatus[] = ["new", "reviewing", "shortlisted", "interview", "hired"];
const STAGE_LABELS: Record<string, string> = {
  new: "New", reviewing: "Reviewing", shortlisted: "Shortlisted", interview: "Interview", hired: "Hired"
};

const TimeToHire = ({ applicants }: TimeToHireProps) => {
  const metrics = useMemo(() => {
    // Average days in each stage
    const stageMetrics = STAGE_ORDER.map(stage => {
      const inStage = applicants.filter(a => a.status === stage);
      const durations = inStage.map(a => {
        if (!a.stageEnteredAt) return 0;
        return Math.max(0, Math.floor((Date.now() - new Date(a.stageEnteredAt).getTime()) / (1000 * 60 * 60 * 24)));
      });
      const avg = durations.length > 0 ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length) : 0;
      const max = durations.length > 0 ? Math.max(...durations) : 0;
      const sla = STAGE_SLA_DAYS[stage];
      const breaches = sla ? durations.filter(d => d > sla).length : 0;
      return { stage, label: STAGE_LABELS[stage], count: inStage.length, avg, max, sla, breaches };
    });

    // Total time from application to hire
    const hired = applicants.filter(a => a.status === "hired");
    const avgTimeToHire = hired.length > 0
      ? Math.round(hired.reduce((s, a) => {
          const applied = new Date(a.appliedDate).getTime();
          return s + (Date.now() - applied) / (1000 * 60 * 60 * 24);
        }, 0) / hired.length)
      : null;

    // Pipeline velocity (applicants processed per week)
    const lastWeek = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const processedThisWeek = applicants.filter(a =>
      a.status !== "new" && a.stageEnteredAt && new Date(a.stageEnteredAt).getTime() > lastWeek
    ).length;

    // Bottleneck — stage with highest avg days
    const bottleneck = stageMetrics.filter(s => s.count > 0).sort((a, b) => b.avg - a.avg)[0];

    const totalBreaches = stageMetrics.reduce((s, m) => s + m.breaches, 0);

    return { stageMetrics, avgTimeToHire, processedThisWeek, bottleneck, totalBreaches };
  }, [applicants]);

  return (
    <div className="space-y-4">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Avg Time to Hire</span>
            </div>
            <p className="text-2xl font-bold">{metrics.avgTimeToHire ?? "—"}<span className="text-sm text-muted-foreground ml-1">days</span></p>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Weekly Velocity</span>
            </div>
            <p className="text-2xl font-bold">{metrics.processedThisWeek}<span className="text-sm text-muted-foreground ml-1">processed</span></p>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-amber-400" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Bottleneck</span>
            </div>
            <p className="text-lg font-bold truncate">{metrics.bottleneck?.label ?? "—"}</p>
            {metrics.bottleneck && <p className="text-xs text-muted-foreground">{metrics.bottleneck.avg}d avg</p>}
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">SLA Breaches</span>
            </div>
            <p className={`text-2xl font-bold ${metrics.totalBreaches > 0 ? "text-destructive" : "text-emerald-400"}`}>
              {metrics.totalBreaches}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stage breakdown */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-primary" />
            </div>
            Stage Duration Breakdown
          </CardTitle>
          <CardDescription className="ml-[42px]">Average days candidates spend in each pipeline stage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.stageMetrics.map((stage, i) => (
              <motion.div
                key={stage.stage}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4"
              >
                <div className="w-24 text-right">
                  <span className="text-xs font-medium">{stage.label}</span>
                </div>
                <div className="flex-1">
                  <div className="h-6 rounded-lg bg-muted/20 overflow-hidden relative">
                    <motion.div
                      className={`h-full rounded-lg ${
                        stage.sla && stage.avg > stage.sla ? "bg-destructive/60" :
                        stage.avg > 5 ? "bg-amber-500/50" : "bg-primary/50"
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(Math.max((stage.avg / 15) * 100, 5), 100)}%` }}
                      transition={{ duration: 0.6, delay: i * 0.08 }}
                    />
                    {stage.sla && (
                      <div
                        className="absolute top-0 h-full border-r-2 border-dashed border-foreground/30"
                        style={{ left: `${Math.min((stage.sla / 15) * 100, 100)}%` }}
                        title={`SLA: ${stage.sla}d`}
                      />
                    )}
                  </div>
                </div>
                <div className="w-20 flex items-center gap-2">
                  <span className="text-xs font-bold">{stage.avg}d</span>
                  {stage.sla && (
                    <span className="text-[9px] text-muted-foreground">/{stage.sla}d</span>
                  )}
                </div>
                <div className="w-20 text-right">
                  <Badge variant="secondary" className="text-[9px] py-0 border-0 bg-muted/50">
                    {stage.count} in stage
                  </Badge>
                </div>
                {stage.breaches > 0 && (
                  <Badge variant="secondary" className="text-[9px] py-0 border-0 bg-destructive/10 text-destructive">
                    {stage.breaches} breaches
                  </Badge>
                )}
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TimeToHire;
