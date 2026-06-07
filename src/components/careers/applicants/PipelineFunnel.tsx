import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, ArrowRight } from "lucide-react";
import type { Applicant, ApplicantStatus } from "@/types/careers";
import { APPLICANT_STATUSES } from "@/types/careers";
import { TONE_SOFT } from "@/components/careers/statusColors";

interface PipelineFunnelProps {
  applicants: Applicant[];
}

const FUNNEL_ORDER: ApplicantStatus[] = ["new", "reviewing", "shortlisted", "interview", "hired"];
const FUNNEL_COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#22c55e"];

const PipelineFunnel = ({ applicants }: PipelineFunnelProps) => {
  const stages = useMemo(() => {
    const total = applicants.length;
    return FUNNEL_ORDER.map((status, i) => {
      const count = applicants.filter(a => a.status === status).length;
      // For funnel: cumulative from this stage onward
      const remaining = FUNNEL_ORDER.slice(i).reduce(
        (s, st) => s + applicants.filter(a => a.status === st).length, 0
      );
      const pct = total > 0 ? Math.round((remaining / total) * 100) : 0;
      const conversionFromPrev = i === 0 ? 100 : (() => {
        const prevRemaining = FUNNEL_ORDER.slice(i - 1).reduce(
          (s, st) => s + applicants.filter(a => a.status === st).length, 0
        );
        return prevRemaining > 0 ? Math.round((remaining / prevRemaining) * 100) : 0;
      })();
      const info = APPLICANT_STATUSES.find(s => s.value === status);
      return { status, label: info?.label || status, count, remaining, pct, conversionFromPrev, color: FUNNEL_COLORS[i] };
    });
  }, [applicants]);

  const rejected = applicants.filter(a => a.status === "rejected").length;
  const total = applicants.length;
  const overallConversion = total > 0 ? Math.round((stages[stages.length - 1].remaining / total) * 100) : 0;

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingDown className="w-4 h-4 text-primary" />
          </div>
          Pipeline Funnel
        </CardTitle>
        <CardDescription className="ml-[42px]">
          {total} applicants · {overallConversion}% overall conversion · {rejected} rejected
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Visual funnel */}
        <div className="space-y-2 mb-4">
          {stages.map((stage, i) => (
            <motion.div
              key={stage.status}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-3"
            >
              <div className="w-24 text-right">
                <span className="text-xs font-medium">{stage.label}</span>
              </div>
              <div className="flex-1 relative">
                <div className="h-8 rounded-lg bg-muted/20 overflow-hidden">
                  <motion.div
                    className="h-full rounded-lg flex items-center justify-end pr-3"
                    style={{ backgroundColor: stage.color, opacity: 0.7 }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(stage.pct, 5)}%` }}
                    transition={{ duration: 0.8, delay: i * 0.1 }}
                  >
                    <span className="text-[10px] font-bold text-foreground">{stage.remaining}</span>
                  </motion.div>
                </div>
              </div>
              <div className="w-16 text-right">
                <span className="text-xs font-semibold">{stage.pct}%</span>
              </div>
              {i > 0 && (
                <div className="w-16 text-right">
                  <Badge variant="secondary" className={`text-[9px] py-0 border-0 ${
                    stage.conversionFromPrev < 50 ? "bg-destructive/10 text-destructive" : TONE_SOFT.success
                  }`}>
                    {stage.conversionFromPrev}%
                  </Badge>
                </div>
              )}
              {i === 0 && <div className="w-16" />}
            </motion.div>
          ))}
        </div>

        {/* Drop-off between stages */}
        <div className="flex items-center gap-2 pt-3 border-t border-border/30 flex-wrap">
          {stages.slice(0, -1).map((stage, i) => {
            const next = stages[i + 1];
            const dropoff = stage.remaining - next.remaining;
            return (
              <div key={stage.status} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span>{stage.label}</span>
                <ArrowRight className="w-2.5 h-2.5" />
                <span>{next.label}:</span>
                <span className="font-semibold text-destructive">-{dropoff}</span>
                {i < stages.length - 2 && <span className="mx-1 text-border">·</span>}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default PipelineFunnel;
