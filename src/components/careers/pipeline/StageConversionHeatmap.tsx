import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { APPLICANT_STATUSES, type ApplicantStatus } from "@/types/careers";
import type { Applicant } from "@/types/careers";

interface StageConversionHeatmapProps {
  applicants: Applicant[];
}

// We approximate conversions by looking at how many candidates are in each "further" stage
// Since we don't have historical stage change data, we use current distribution as proxy
const StageConversionHeatmap = ({ applicants }: StageConversionHeatmapProps) => {
  const stages: ApplicantStatus[] = ["new", "reviewing", "shortlisted", "interview", "hired"];
  const stageLabels = APPLICANT_STATUSES.filter(s => stages.includes(s.value));

  const matrix = useMemo(() => {
    const counts: Record<string, number> = {};
    stages.forEach(s => { counts[s] = applicants.filter(a => a.status === s).length; });
    // Rejected count
    const rejected = applicants.filter(a => a.status === "rejected").length;

    // Calculate cumulative "reached at least this stage" counts
    const reachedAtLeast: Record<string, number> = {};
    let cumulative = applicants.length;
    stages.forEach(s => {
      reachedAtLeast[s] = cumulative;
      // Approximate: those currently at stage OR beyond
    });

    // Simpler approach: conversion from stage i to stage i+1
    const conversions: { from: string; to: string; rate: number; fromLabel: string; toLabel: string }[] = [];
    for (let i = 0; i < stages.length - 1; i++) {
      const fromStage = stages[i];
      const toStage = stages[i + 1];
      // Count candidates at this stage or beyond
      const atOrBeyondFrom = stages.slice(i).reduce((sum, s) => sum + counts[s], 0);
      const atOrBeyondTo = stages.slice(i + 1).reduce((sum, s) => sum + counts[s], 0);
      const rate = atOrBeyondFrom > 0 ? Math.round((atOrBeyondTo / atOrBeyondFrom) * 100) : 0;
      const fromInfo = APPLICANT_STATUSES.find(s => s.value === fromStage);
      const toInfo = APPLICANT_STATUSES.find(s => s.value === toStage);
      conversions.push({
        from: fromStage,
        to: toStage,
        rate,
        fromLabel: fromInfo?.label || fromStage,
        toLabel: toInfo?.label || toStage,
      });
    }

    return conversions;
  }, [applicants]);

  function getHeatColor(rate: number): string {
    if (rate >= 80) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    if (rate >= 60) return "bg-primary/15 text-primary border-primary/30";
    if (rate >= 40) return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
    if (rate >= 20) return "bg-orange-500/15 text-orange-400 border-orange-500/30";
    return "bg-destructive/10 text-destructive border-destructive/30";
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Stage Conversion Heatmap</CardTitle>
        <CardDescription className="text-xs">Conversion rates between consecutive pipeline stages</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {matrix.map((conv, i) => (
            <motion.div
              key={`${conv.from}-${conv.to}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-center gap-3"
            >
              <div className="flex items-center gap-2 min-w-[200px]">
                <Badge variant="outline" className="text-[10px] py-0 min-w-[80px] justify-center">{conv.fromLabel}</Badge>
                <span className="text-muted-foreground/40">→</span>
                <Badge variant="outline" className="text-[10px] py-0 min-w-[80px] justify-center">{conv.toLabel}</Badge>
              </div>
              <div className="flex-1">
                <div className="h-8 bg-secondary/30 rounded-lg overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${conv.rate}%` }}
                    transition={{ duration: 0.8, delay: i * 0.1 }}
                    className={`h-full rounded-lg ${getHeatColor(conv.rate).split(" ")[0]}`}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-xs font-bold ${conv.rate >= 50 ? "" : "text-muted-foreground"}`}>{conv.rate}%</span>
                  </div>
                </div>
              </div>
              <Badge variant="secondary" className={`text-[9px] py-0 border ${getHeatColor(conv.rate)} min-w-[60px] justify-center`}>
                {conv.rate >= 80 ? "Excellent" : conv.rate >= 60 ? "Good" : conv.rate >= 40 ? "Fair" : conv.rate >= 20 ? "Low" : "Critical"}
              </Badge>
            </motion.div>
          ))}
        </div>

        {/* Overall funnel efficiency */}
        {matrix.length > 0 && (
          <div className="mt-4 p-3 rounded-xl bg-muted/20 border border-border/20">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Overall Funnel Efficiency</span>
              <span className="text-sm font-bold text-primary">
                {Math.round(matrix.reduce((p, c) => p * (c.rate / 100), 1) * 100)}%
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              End-to-end conversion from New to Hired
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StageConversionHeatmap;
