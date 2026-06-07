import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  HeartPulse, Clock, TrendingUp, AlertTriangle, CheckCircle2, Gauge,
} from "lucide-react";
import type { Applicant } from "@/types/careers";
import { APPLICANT_STATUSES, STAGE_SLA_DAYS } from "@/types/careers";
import { TONE_TEXT, TONE_BG, TONE_SUBTLE } from "../statusColors";

interface PipelineHealthScorecardProps {
  applicants: Applicant[];
}

function computeHealthScore(applicants: Applicant[]) {
  if (applicants.length === 0) return { score: 100, slaCompliance: 100, velocityScore: 100, bottleneckScore: 100, details: [] as string[] };

  // SLA compliance
  let overdueCount = 0;
  applicants.forEach(a => {
    const sla = STAGE_SLA_DAYS[a.status];
    if (sla === undefined || !a.stageEnteredAt) return;
    const days = Math.floor((Date.now() - new Date(a.stageEnteredAt).getTime()) / (1000 * 60 * 60 * 24));
    if (days > sla) overdueCount++;
  });
  const slaCompliance = Math.round(((applicants.length - overdueCount) / applicants.length) * 100);

  // Velocity score (inverse of avg days in current stage)
  const avgDays = applicants.reduce((sum, a) => {
    if (!a.stageEnteredAt) return sum;
    return sum + Math.floor((Date.now() - new Date(a.stageEnteredAt).getTime()) / (1000 * 60 * 60 * 24));
  }, 0) / applicants.length;
  const velocityScore = Math.max(0, Math.min(100, Math.round(100 - avgDays * 8)));

  // Bottleneck concentration (how evenly distributed are candidates across stages)
  const stageCounts = APPLICANT_STATUSES.map(s => applicants.filter(a => a.status === s.value).length);
  const nonEmpty = stageCounts.filter(c => c > 0);
  const maxConcentration = nonEmpty.length > 0 ? Math.max(...nonEmpty) / applicants.length : 0;
  const bottleneckScore = Math.round((1 - maxConcentration) * 100);

  const score = Math.round(slaCompliance * 0.4 + velocityScore * 0.3 + bottleneckScore * 0.3);

  const details: string[] = [];
  if (overdueCount > 0) details.push(`${overdueCount} candidates past SLA`);
  if (avgDays > 5) details.push(`Avg ${Math.round(avgDays)} days in stage`);
  const bottleneckStage = APPLICANT_STATUSES[stageCounts.indexOf(Math.max(...stageCounts))];
  if (maxConcentration > 0.4 && bottleneckStage) details.push(`Bottleneck at "${bottleneckStage.label}"`);

  return { score, slaCompliance, velocityScore, bottleneckScore, details };
}

function getHealthColor(score: number) {
  if (score >= 80) return TONE_TEXT.success;
  if (score >= 60) return TONE_TEXT.warning;
  return TONE_TEXT.danger;
}

function getHealthBg(score: number) {
  if (score >= 80) return TONE_BG.success;
  if (score >= 60) return TONE_BG.warning;
  return TONE_BG.danger;
}

const PipelineHealthScorecard = ({ applicants }: PipelineHealthScorecardProps) => {
  const health = useMemo(() => computeHealthScore(applicants), [applicants]);

  const kpis = [
    { label: "SLA Compliance", value: health.slaCompliance, icon: Clock },
    { label: "Velocity", value: health.velocityScore, icon: TrendingUp },
    { label: "Distribution", value: health.bottleneckScore, icon: Gauge },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-border/50 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Health Score */}
            <div className="flex items-center gap-3">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${health.score >= 80 ? TONE_SUBTLE.success : health.score >= 60 ? TONE_SUBTLE.warning : TONE_SUBTLE.danger}`}>
                <HeartPulse className={`w-6 h-6 ${getHealthColor(health.score)}`} aria-hidden="true" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${getHealthColor(health.score)}`}>{health.score}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Pipeline Health</p>
              </div>
            </div>

            <div className="h-10 w-px bg-border hidden sm:block" />

            {/* KPI Mini Cards */}
            {kpis.map((kpi, i) => (
              <div key={kpi.label} className="flex items-center gap-2.5">
                <kpi.icon className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-[80px]">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] text-muted-foreground">{kpi.label}</span>
                    <span className={`text-[10px] font-bold ${getHealthColor(kpi.value)}`}>{kpi.value}%</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${getHealthBg(kpi.value)}`} style={{ width: `${kpi.value}%` }} />
                  </div>
                </div>
              </div>
            ))}

            {/* Alerts */}
            {health.details.length > 0 && (
              <>
                <div className="h-10 w-px bg-border hidden lg:block" />
                <div className="flex flex-wrap gap-1.5">
                  {health.details.map((d, i) => (
                    <Badge key={i} variant="secondary" className="text-[9px] py-0 border-0 bg-destructive/10 text-destructive">
                      <AlertTriangle className="w-2.5 h-2.5 mr-0.5" aria-hidden="true" />{d}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PipelineHealthScorecard;
