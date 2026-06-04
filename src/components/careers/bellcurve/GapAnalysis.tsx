import { motion } from "framer-motion";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ZAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, GitCompareArrows } from "lucide-react";

interface EmployeeRecord {
  employeeName: string;
  department: string;
  lineManager: string;
  selfRating: number | null;
  managerRating: number | null;
  [key: string]: any;
}

interface GapAnalysisProps {
  employees: EmployeeRecord[];
}

const GapAnalysis = ({ employees }: GapAnalysisProps) => {
  const gapData = employees
    .filter(e => e.selfRating !== null && e.managerRating !== null)
    .map(e => ({
      name: e.employeeName,
      dept: e.department,
      manager: e.lineManager,
      self: e.selfRating!,
      managerRating: e.managerRating!,
      gap: Math.abs(e.selfRating! - e.managerRating!),
      direction: e.selfRating! > e.managerRating! ? "Self Higher" : e.selfRating! < e.managerRating! ? "Manager Higher" : "Aligned",
    }))
    .sort((a, b) => b.gap - a.gap);

  const avgGap = gapData.length > 0 ? gapData.reduce((s, d) => s + d.gap, 0) / gapData.length : 0;
  const bigGaps = gapData.filter(d => d.gap >= 1.0);
  const selfHigher = gapData.filter(d => d.direction === "Self Higher").length;
  const mgrHigher = gapData.filter(d => d.direction === "Manager Higher").length;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Gap KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Avg Gap", value: avgGap.toFixed(2), sub: "rating points" },
          { label: "Large Gaps (≥1.0)", value: `${bigGaps.length}`, sub: "employees" },
          { label: "Self > Manager", value: `${selfHigher}`, sub: "over-raters" },
          { label: "Manager > Self", value: `${mgrHigher}`, sub: "under-raters" },
        ].map(kpi => (
          <Card key={kpi.label} className="border-border/40">
            <CardContent className="p-4">
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">{kpi.label}</span>
              <p className="text-2xl font-bold mt-1">{kpi.value}</p>
              <p className="text-[10px] text-muted-foreground">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Scatter plot */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <GitCompareArrows className="w-4 h-4 text-violet-400" />
            </div>
            Self vs Manager Rating Scatter
          </CardTitle>
          <CardDescription className="ml-[42px]">
            Points far from the diagonal indicate large rating gaps · {gapData.length} employees with both ratings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 30, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis type="number" dataKey="self" name="Self Rating" domain={[0, 5]}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  label={{ value: "Self Rating", position: "bottom", offset: 10, fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis type="number" dataKey="managerRating" name="Manager Rating" domain={[0, 5]}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  label={{ value: "Manager Rating", angle: -90, position: "insideLeft", offset: 0, fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <ZAxis type="number" dataKey="gap" range={[40, 200]} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))", border: "1px solid hsl(var(--border))",
                    borderRadius: "12px", fontSize: "12px", padding: "10px 14px",
                    boxShadow: "0 20px 60px -15px rgba(0,0,0,0.3)",
                  }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="space-y-1">
                        <p className="font-semibold text-sm">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{d.dept} · {d.manager}</p>
                        <div className="flex gap-3 pt-1">
                          <span className="text-xs">Self: <strong>{d.self.toFixed(2)}</strong></span>
                          <span className="text-xs">Manager: <strong>{d.managerRating.toFixed(2)}</strong></span>
                          <span className={`text-xs font-semibold ${d.gap >= 1 ? "text-destructive" : "text-emerald-400"}`}>
                            Gap: {d.gap.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 5, y: 5 }]} stroke="hsl(var(--primary))" strokeDasharray="6 4" opacity={0.4} />
                <Scatter data={gapData.filter(d => d.gap < 1.0)} fill="hsl(var(--chart-3))" fillOpacity={0.6} />
                <Scatter data={gapData.filter(d => d.gap >= 1.0)} fill="hsl(var(--destructive))" fillOpacity={0.8} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Gap &lt; 1.0 (Aligned)</span>
            <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-destructive" /> Gap ≥ 1.0 (Flag)</span>
            <span className="flex items-center gap-1.5 ml-auto">Diagonal = perfect agreement</span>
          </div>
        </CardContent>
      </Card>

      {/* Flagged employees table */}
      {bigGaps.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              Employees with Large Rating Gaps (≥ 1.0)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {bigGaps.slice(0, 20).map((emp, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center text-xs font-bold text-destructive">
                      {emp.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{emp.name}</p>
                      <p className="text-[10px] text-muted-foreground">{emp.dept} · {emp.manager}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 text-xs">
                    <div className="text-center">
                      <p className="text-[9px] text-muted-foreground">Self</p>
                      <p className="font-semibold">{emp.self.toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-muted-foreground">Manager</p>
                      <p className="font-semibold">{emp.managerRating.toFixed(2)}</p>
                    </div>
                    <Badge variant="secondary" className="bg-destructive/10 text-destructive border-0 text-[10px]">
                      Gap: {emp.gap.toFixed(2)}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {emp.direction}
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
};

export default GapAnalysis;
