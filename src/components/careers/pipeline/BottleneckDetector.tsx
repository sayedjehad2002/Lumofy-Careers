import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowRight, Lightbulb, Target } from "lucide-react";
import { APPLICANT_STATUSES, STAGE_SLA_DAYS, type ApplicantStatus } from "@/types/careers";
import type { Applicant } from "@/types/careers";

interface BottleneckDetectorProps {
  applicants: Applicant[];
}

interface Bottleneck {
  stage: ApplicantStatus;
  label: string;
  count: number;
  percentage: number;
  avgDays: number;
  overdueCount: number;
  severity: "critical" | "warning" | "healthy";
  suggestion: string;
}

const BottleneckDetector = ({ applicants }: BottleneckDetectorProps) => {
  const bottlenecks = useMemo(() => {
    const active = applicants.filter(a => a.status !== "rejected" && a.status !== "hired");
    if (active.length === 0) return [];

    const stages: ApplicantStatus[] = ["new", "reviewing", "shortlisted", "interview"];
    const results: Bottleneck[] = stages.map(stage => {
      const inStage = active.filter(a => a.status === stage);
      const count = inStage.length;
      const percentage = Math.round((count / active.length) * 100);
      const avgDays = inStage.length > 0
        ? Math.round(inStage.reduce((s, a) => s + (a.stageEnteredAt ? Math.floor((Date.now() - new Date(a.stageEnteredAt).getTime()) / 86400000) : 0), 0) / inStage.length)
        : 0;
      const sla = STAGE_SLA_DAYS[stage] || 5;
      const overdueCount = inStage.filter(a => {
        if (!a.stageEnteredAt) return false;
        return Math.floor((Date.now() - new Date(a.stageEnteredAt).getTime()) / 86400000) > sla;
      }).length;

      const severity: Bottleneck["severity"] =
        percentage >= 40 || overdueCount >= 3 ? "critical" :
        percentage >= 25 || overdueCount >= 1 ? "warning" : "healthy";

      const stageInfo = APPLICANT_STATUSES.find(s => s.value === stage);

      let suggestion = "";
      if (stage === "new" && percentage >= 30) suggestion = "Speed up initial review — consider batch AI analysis";
      else if (stage === "reviewing" && percentage >= 30) suggestion = "Too many in review — move qualified candidates to shortlist";
      else if (stage === "shortlisted" && percentage >= 30) suggestion = "Schedule interviews for shortlisted candidates";
      else if (stage === "interview" && percentage >= 30) suggestion = "Complete interview decisions to free pipeline capacity";
      else if (overdueCount > 0) suggestion = `${overdueCount} candidate(s) past SLA — prioritize decision`;
      else suggestion = "Stage is healthy";

      return {
        stage,
        label: stageInfo?.label || stage,
        count,
        percentage,
        avgDays,
        overdueCount,
        severity,
        suggestion,
      };
    });

    return results.sort((a, b) => b.percentage - a.percentage);
  }, [applicants]);

  const worstBottleneck = bottlenecks.find(b => b.severity === "critical") || bottlenecks[0];

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          Bottleneck Detector
        </CardTitle>
        <CardDescription className="text-xs">Identifies pipeline slowdowns and suggests actions</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Primary bottleneck callout */}
        {worstBottleneck && worstBottleneck.severity !== "healthy" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-3 rounded-xl border mb-4 ${
              worstBottleneck.severity === "critical"
                ? "bg-destructive/10 border-destructive/20"
                : "bg-yellow-500/10 border-yellow-500/20"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className={`w-4 h-4 ${worstBottleneck.severity === "critical" ? "text-destructive" : "text-yellow-400"}`} />
              <span className="text-xs font-semibold">
                Primary Bottleneck: {worstBottleneck.label}
              </span>
              <Badge variant="secondary" className="text-[9px] py-0 border-0 ml-auto">
                {worstBottleneck.percentage}% of pipeline
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 ml-6">
              <Lightbulb className="w-3 h-3 text-primary" />
              <p className="text-[11px] text-muted-foreground">{worstBottleneck.suggestion}</p>
            </div>
          </motion.div>
        )}

        {/* All stages */}
        <div className="space-y-2">
          {bottlenecks.map((b, i) => (
            <motion.div
              key={b.stage}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`p-3 rounded-xl border ${
                b.severity === "critical" ? "border-destructive/20 bg-destructive/5" :
                b.severity === "warning" ? "border-yellow-500/20 bg-yellow-500/5" :
                "border-border/20 bg-muted/10"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="min-w-[80px]">
                  <p className="text-xs font-semibold">{b.label}</p>
                  <p className="text-[10px] text-muted-foreground">{b.count} candidates</p>
                </div>

                {/* Distribution bar */}
                <div className="flex-1">
                  <div className="h-5 bg-secondary/30 rounded-lg overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${b.percentage}%` }}
                      transition={{ duration: 0.6, delay: i * 0.08 }}
                      className={`h-full rounded-lg ${
                        b.severity === "critical" ? "bg-destructive/30" :
                        b.severity === "warning" ? "bg-yellow-500/30" :
                        "bg-primary/20"
                      }`}
                    />
                  </div>
                </div>

                <div className="text-right min-w-[50px]">
                  <p className="text-xs font-bold">{b.percentage}%</p>
                  <p className="text-[9px] text-muted-foreground">avg {b.avgDays}d</p>
                </div>

                {b.overdueCount > 0 && (
                  <Badge variant="secondary" className="text-[9px] py-0 border-0 bg-destructive/10 text-destructive">
                    {b.overdueCount} overdue
                  </Badge>
                )}
              </div>

              {b.severity !== "healthy" && (
                <div className="flex items-center gap-1.5 mt-2 ml-[80px]">
                  <ArrowRight className="w-3 h-3 text-primary" />
                  <span className="text-[10px] text-muted-foreground">{b.suggestion}</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default BottleneckDetector;
