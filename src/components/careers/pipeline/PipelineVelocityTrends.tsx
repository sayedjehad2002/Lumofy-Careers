import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { TrendingUp } from "lucide-react";
import { APPLICANT_STATUSES, STAGE_SLA_DAYS, type ApplicantStatus } from "@/types/careers";
import type { Applicant } from "@/types/careers";

interface PipelineVelocityTrendsProps {
  applicants: Applicant[];
}

const PipelineVelocityTrends = ({ applicants }: PipelineVelocityTrendsProps) => {
  const stageMetrics = useMemo(() => {
    const stages: ApplicantStatus[] = ["new", "reviewing", "shortlisted", "interview"];

    return stages.map(stage => {
      const inStage = applicants.filter(a => a.status === stage);
      const days = inStage
        .filter(a => a.stageEnteredAt)
        .map(a => Math.floor((Date.now() - new Date(a.stageEnteredAt!).getTime()) / 86400000));
      const avg = days.length > 0 ? Math.round(days.reduce((s, d) => s + d, 0) / days.length) : 0;
      const sla = STAGE_SLA_DAYS[stage] || 5;
      const stageInfo = APPLICANT_STATUSES.find(s => s.value === stage);

      return {
        stage,
        label: stageInfo?.label || stage,
        avgDays: avg,
        sla,
        count: inStage.length,
        withinSLA: days.filter(d => d <= sla).length,
        overSLA: days.filter(d => d > sla).length,
        compliance: days.length > 0 ? Math.round((days.filter(d => d <= sla).length / days.length) * 100) : 100,
      };
    });
  }, [applicants]);

  // Generate sparkline-style data (simulated weekly trend from current snapshot)
  const chartData = useMemo(() => {
    return stageMetrics.map(m => ({
      name: m.label,
      avgDays: m.avgDays,
      sla: m.sla,
      compliance: m.compliance,
    }));
  }, [stageMetrics]);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Pipeline Velocity
        </CardTitle>
        <CardDescription className="text-xs">Average time per stage vs SLA targets</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Chart */}
        <div className="h-[200px] mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="avgFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} label={{ value: "Days", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
              />
              <Area type="monotone" dataKey="avgDays" stroke="hsl(var(--primary))" fill="url(#avgFill)" strokeWidth={2} name="Avg Days" />
              <Line type="monotone" dataKey="sla" stroke="hsl(var(--destructive))" strokeDasharray="5 5" strokeWidth={1.5} dot={false} name="SLA Limit" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Stage cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {stageMetrics.map((m, i) => (
            <motion.div
              key={m.stage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`p-3 rounded-xl border ${m.avgDays > m.sla ? "border-destructive/20 bg-destructive/5" : "border-border/20 bg-muted/10"}`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1">{m.label}</p>
              <div className="flex items-baseline gap-1">
                <span className={`text-lg font-bold ${m.avgDays > m.sla ? "text-destructive" : "text-foreground"}`}>{m.avgDays}d</span>
                <span className="text-[10px] text-muted-foreground">/ {m.sla}d SLA</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <Badge variant="secondary" className={`text-[8px] py-0 border-0 ${m.compliance >= 80 ? "bg-emerald-500/10 text-emerald-400" : m.compliance >= 50 ? "bg-yellow-500/10 text-yellow-400" : "bg-destructive/10 text-destructive"}`}>
                  {m.compliance}% compliant
                </Badge>
                {m.overSLA > 0 && (
                  <Badge variant="secondary" className="text-[8px] py-0 border-0 bg-destructive/10 text-destructive">
                    {m.overSLA} over
                  </Badge>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PipelineVelocityTrends;
