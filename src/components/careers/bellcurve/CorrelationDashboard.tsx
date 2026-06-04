import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Link2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ZAxis, BarChart, Bar, Cell
} from "recharts";
import { supabase } from "@/integrations/supabase/client";

interface EmployeeRecord {
  employeeName: string;
  department: string;
  lineManager: string;
  selfRating: number | null;
  managerRating: number | null;
  [key: string]: any;
}

interface BandDef {
  id: string;
  shortLabel: string;
  min: number;
  max: number;
}

interface CorrelationDashboardProps {
  employees: any[];
  bands: BandDef[];
  bandColors: string[];
  getRating: (emp: any) => number | null;
}

const CorrelationDashboard = ({ employees, bands, bandColors, getRating }: CorrelationDashboardProps) => {
  const [turnoverData, setTurnoverData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTurnover = async () => {
      try {
        const { data } = await supabase.functions.invoke("turnover-manage", { body: { action: "list" } });
        setTurnoverData(data?.entries || []);
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchTurnover();
  }, []);

  // Band attrition correlation
  const bandAttrition = useMemo(() => {
    const turnoverNames = new Set(turnoverData.map((t: any) => t.employee_name?.toLowerCase()));
    
    return bands.map((band, i) => {
      const bandEmps = employees.filter(e => {
        const r = getRating(e);
        return r !== null && r >= band.min && r <= band.max;
      });
      const attritionCount = bandEmps.filter(e => turnoverNames.has(e.employeeName?.toLowerCase())).length;
      const rate = bandEmps.length > 0 ? Math.round((attritionCount / bandEmps.length) * 100) : 0;
      return {
        band: band.shortLabel,
        employees: bandEmps.length,
        attrition: attritionCount,
        rate,
        color: bandColors[i],
      };
    });
  }, [employees, bands, bandColors, getRating, turnoverData]);

  // Department correlation
  const deptCorrelation = useMemo(() => {
    const depts = [...new Set(employees.map(e => e.department).filter(Boolean))];
    const turnoverDepts: Record<string, number> = {};
    turnoverData.forEach((t: any) => {
      if (t.department) turnoverDepts[t.department] = (turnoverDepts[t.department] || 0) + 1;
    });

    return depts.map(dept => {
      const deptEmps = employees.filter(e => e.department === dept);
      const rated = deptEmps.filter(e => getRating(e) !== null);
      const avgRating = rated.length > 0 ? rated.reduce((s, e) => s + getRating(e)!, 0) / rated.length : 0;
      const turnoverCount = turnoverDepts[dept] || 0;
      return { dept, avgRating, turnoverCount, headcount: deptEmps.length };
    }).filter(d => d.headcount > 0);
  }, [employees, turnoverData, getRating]);

  // Percentile data for employees
  const percentileData = useMemo(() => {
    const rated = employees.filter(e => getRating(e) !== null).map(e => ({
      name: e.employeeName,
      dept: e.department,
      rating: getRating(e)!,
    })).sort((a, b) => a.rating - b.rating);

    return rated.map((e, i) => ({
      ...e,
      orgPercentile: Math.round(((i + 1) / rated.length) * 100),
    }));
  }, [employees, getRating]);

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-16 text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading correlation data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Band × Attrition */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
              <Link2 className="w-4 h-4 text-destructive" />
            </div>
            Rating Band × Attrition Risk
          </CardTitle>
          <CardDescription className="ml-[42px]">
            Cross-references performance ratings with turnover data to identify at-risk bands
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bandAttrition} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                <XAxis dataKey="band" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))", border: "1px solid hsl(var(--border))",
                    borderRadius: "12px", fontSize: "12px",
                  }}
                  formatter={(v: any, name: string) => [
                    name === "rate" ? `${v}%` : v,
                    name === "rate" ? "Attrition Rate" : name === "employees" ? "Headcount" : "Exits"
                  ]}
                />
                <Bar dataKey="employees" name="employees" fill="hsl(var(--primary))" fillOpacity={0.3} radius={[6, 6, 0, 0]} maxBarSize={30} />
                <Bar dataKey="attrition" name="attrition" fill="hsl(var(--destructive))" fillOpacity={0.7} radius={[6, 6, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Rate strip */}
          <div className="grid grid-cols-5 gap-2 mt-3">
            {bandAttrition.map((b, i) => (
              <div key={b.band} className="text-center p-2 rounded-lg bg-muted/20">
                <div className="w-2.5 h-2.5 rounded-full mx-auto mb-1" style={{ backgroundColor: b.color }} />
                <p className="text-xs font-semibold">{b.band}</p>
                <p className={`text-lg font-bold ${b.rate > 20 ? "text-destructive" : b.rate > 10 ? "text-amber-400" : "text-emerald-400"}`}>
                  {b.rate}%
                </p>
                <p className="text-[9px] text-muted-foreground">attrition</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dept scatter — rating vs turnover */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-violet-400" />
            </div>
            Department Ratings vs Turnover
          </CardTitle>
          <CardDescription className="ml-[42px]">
            Departments with low ratings and high turnover need urgent attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 30, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis
                  type="number" dataKey="avgRating" name="Avg Rating" domain={[1, 5]}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  label={{ value: "Avg Rating", position: "bottom", offset: 10, fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  type="number" dataKey="turnoverCount" name="Turnover"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  label={{ value: "Turnover Count", angle: -90, position: "insideLeft", offset: 0, fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <ZAxis type="number" dataKey="headcount" range={[40, 200]} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))", border: "1px solid hsl(var(--border))",
                    borderRadius: "12px", fontSize: "12px",
                  }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="space-y-1 p-2">
                        <p className="font-semibold text-sm">{d.dept}</p>
                        <p className="text-xs">Avg Rating: <strong>{d.avgRating.toFixed(2)}</strong></p>
                        <p className="text-xs">Turnover: <strong>{d.turnoverCount}</strong></p>
                        <p className="text-xs">Headcount: <strong>{d.headcount}</strong></p>
                      </div>
                    );
                  }}
                />
                <Scatter data={deptCorrelation} fill="hsl(var(--primary))" fillOpacity={0.6} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default CorrelationDashboard;
