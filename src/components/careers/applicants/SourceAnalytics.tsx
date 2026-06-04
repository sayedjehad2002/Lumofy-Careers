import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { Globe, TrendingUp, Users } from "lucide-react";
import type { Applicant } from "@/types/careers";

interface SourceAnalyticsProps {
  applicants: Applicant[];
  getJobTitle: (jobId: string) => string;
}

const SOURCE_COLORS = [
  "hsl(var(--primary))",
  "hsl(142, 71%, 45%)",
  "hsl(48, 96%, 53%)",
  "hsl(262, 83%, 58%)",
  "hsl(0, 84%, 60%)",
  "hsl(199, 89%, 48%)",
];

function inferSource(a: Applicant): string {
  if (a.linkedin) return "LinkedIn";
  if (a.portfolio) return "Portfolio/Website";
  if (a.coverLetter && a.coverLetter.length > 200) return "Direct Apply";
  return "Career Page";
}

const SourceAnalytics = ({ applicants, getJobTitle }: SourceAnalyticsProps) => {
  const sourceData = useMemo(() => {
    const map = new Map<string, { total: number; hired: number; interviewed: number; avgScore: number; scores: number[] }>();
    
    applicants.forEach(a => {
      const source = inferSource(a);
      const entry = map.get(source) || { total: 0, hired: 0, interviewed: 0, avgScore: 0, scores: [] };
      entry.total++;
      if (a.status === "hired") entry.hired++;
      if (a.status === "interview" || a.status === "hired") entry.interviewed++;
      if (a.aiAnalysis?.fitScore) entry.scores.push(a.aiAnalysis.fitScore);
      map.set(source, entry);
    });

    return Array.from(map.entries()).map(([source, d]) => ({
      source,
      total: d.total,
      hired: d.hired,
      interviewed: d.interviewed,
      conversionRate: d.total > 0 ? Math.round((d.interviewed / d.total) * 100) : 0,
      hireRate: d.total > 0 ? Math.round((d.hired / d.total) * 100) : 0,
      avgScore: d.scores.length > 0 ? Math.round(d.scores.reduce((s, v) => s + v, 0) / d.scores.length) : 0,
    })).sort((a, b) => b.total - a.total);
  }, [applicants]);

  const topSource = sourceData[0];
  const bestConversion = [...sourceData].sort((a, b) => b.conversionRate - a.conversionRate)[0];

  return (
    <div className="space-y-5">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Sources", value: sourceData.length, icon: Globe },
          { label: "Top Source", value: topSource?.source || "—", icon: TrendingUp },
          { label: "Best Conversion", value: bestConversion ? `${bestConversion.conversionRate}%` : "—", icon: Users },
          { label: "Total Applicants", value: applicants.length, icon: Users },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <kpi.icon className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{kpi.label}</span>
                </div>
                <p className="text-lg font-bold">{kpi.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Bar Chart */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Applicants by Source</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceData} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="source" tick={{ fontSize: 10 }} width={100} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                  />
                  <Bar dataKey="total" radius={[0, 6, 6, 0]} name="Total">
                    {sourceData.map((_, i) => (
                      <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Source Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    dataKey="total"
                    nameKey="source"
                    label={({ source, percent }) => `${source} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {sourceData.map((_, i) => (
                      <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Source Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Conversion by Source</CardTitle>
          <CardDescription className="text-xs">Interview conversion rates and average AI scores per source</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sourceData.map((s, i) => (
              <motion.div
                key={s.source}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/20"
              >
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
                <span className="text-sm font-medium w-32">{s.source}</span>
                <Badge variant="secondary" className="text-[10px] py-0 border-0">{s.total} applicants</Badge>
                <div className="flex-1" />
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Interview: <strong className="text-foreground">{s.conversionRate}%</strong></span>
                  <span>Hire: <strong className="text-foreground">{s.hireRate}%</strong></span>
                  {s.avgScore > 0 && <span>Avg Score: <strong className="text-primary">{s.avgScore}</strong></span>}
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SourceAnalytics;
