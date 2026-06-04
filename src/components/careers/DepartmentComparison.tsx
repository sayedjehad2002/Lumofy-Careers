import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowUpDown, Users, TrendingUp, TrendingDown, AlertTriangle, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

interface EmployeeRecord {
  employeeName: string;
  department: string;
  jobTitle: string;
  lineManager: string;
  selfRating: number | null;
  managerRating: number | null;
  potentialScore: string | null;
}

interface DepartmentStats {
  department: string;
  employeeCount: number;
  avgManagerRating: number;
  avgSelfRating: number;
  ratingGap: number;
  highPerformers: number;
  highPerformersPct: number;
  lowPerformers: number;
  lowPerformersPct: number;
  highPotential: number;
  highPotentialPct: number;
  misalignedCount: number;
  misalignedPct: number;
  ratingCompletion: number;
}

interface DepartmentComparisonProps {
  employees: EmployeeRecord[];
}

const DepartmentComparison = ({ employees }: DepartmentComparisonProps) => {
  const [dept1, setDept1] = useState<string>("");
  const [dept2, setDept2] = useState<string>("");

  const departments = useMemo(() => 
    [...new Set(employees.map(e => e.department).filter(Boolean))].sort(),
  [employees]);

  // Detect max rating
  const maxRating = useMemo(() => {
    const allRatings = employees
      .map(e => e.managerRating)
      .filter((r): r is number => r !== null && !isNaN(r));
    if (allRatings.length === 0) return 5;
    const max = Math.max(...allRatings);
    return max <= 5 ? 5 : max <= 10 ? 10 : max;
  }, [employees]);

  const calculateStats = (deptName: string): DepartmentStats | null => {
    const emps = employees.filter(e => e.department === deptName);
    if (emps.length === 0) return null;

    const withMgr = emps.filter(e => e.managerRating !== null);
    const withSelf = emps.filter(e => e.selfRating !== null);
    const withBoth = emps.filter(e => e.managerRating !== null && e.selfRating !== null);

    const avgMgr = withMgr.length > 0
      ? withMgr.reduce((s, e) => s + (e.managerRating || 0), 0) / withMgr.length
      : 0;
    const avgSelf = withSelf.length > 0
      ? withSelf.reduce((s, e) => s + (e.selfRating || 0), 0) / withSelf.length
      : 0;

    const highPerf = emps.filter(e => e.managerRating !== null && (e.managerRating / maxRating) > 0.7).length;
    const lowPerf = emps.filter(e => e.managerRating !== null && (e.managerRating / maxRating) <= 0.4).length;
    const highPot = emps.filter(e => {
      const p = e.potentialScore?.toLowerCase();
      return p === "high" || p === "4" || p === "5";
    }).length;
    const misaligned = withBoth.filter(e => 
      Math.abs((e.selfRating || 0) - (e.managerRating || 0)) / maxRating >= 0.3
    ).length;

    return {
      department: deptName,
      employeeCount: emps.length,
      avgManagerRating: avgMgr,
      avgSelfRating: avgSelf,
      ratingGap: avgSelf - avgMgr,
      highPerformers: highPerf,
      highPerformersPct: Math.round((highPerf / emps.length) * 100),
      lowPerformers: lowPerf,
      lowPerformersPct: Math.round((lowPerf / emps.length) * 100),
      highPotential: highPot,
      highPotentialPct: Math.round((highPot / emps.length) * 100),
      misalignedCount: misaligned,
      misalignedPct: emps.length > 0 ? Math.round((misaligned / emps.length) * 100) : 0,
      ratingCompletion: emps.length > 0 ? Math.round((withMgr.length / emps.length) * 100) : 0,
    };
  };

  const stats1 = dept1 ? calculateStats(dept1) : null;
  const stats2 = dept2 ? calculateStats(dept2) : null;

  // Auto-select first two departments
  useEffect(() => {
    if (departments.length >= 2 && !dept1 && !dept2) {
      setDept1(departments[0]);
      setDept2(departments[1]);
    }
  }, [departments, dept1, dept2]);

  if (employees.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-muted-foreground">
          Upload data to compare departments
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    { label: "Headcount", key: "employeeCount", icon: Users, format: (v: number) => String(v), higherIsBetter: null },
    { label: "Avg Rating", key: "avgManagerRating", icon: TrendingUp, format: (v: number) => v.toFixed(1), higherIsBetter: true },
    { label: "High Perf %", key: "highPerformersPct", icon: TrendingUp, format: (v: number) => `${v}%`, higherIsBetter: true },
    { label: "Low Perf %", key: "lowPerformersPct", icon: TrendingDown, format: (v: number) => `${v}%`, higherIsBetter: false },
    { label: "High Potential %", key: "highPotentialPct", icon: Sparkles, format: (v: number) => `${v}%`, higherIsBetter: true },
    { label: "Misaligned %", key: "misalignedPct", icon: AlertTriangle, format: (v: number) => `${v}%`, higherIsBetter: false },
  ];

  const getColor = (val1: number, val2: number, higherIsBetter: boolean | null): string => {
    if (higherIsBetter === null || val1 === val2) return "";
    const isHigher = val1 > val2;
    return (isHigher === higherIsBetter) ? "text-emerald-500" : "text-destructive";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-primary" />
          Department Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selectors */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Department 1</p>
            <Select value={dept1} onValueChange={setDept1}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {departments.map(d => (
                  <SelectItem key={d} value={d} disabled={d === dept2}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Department 2</p>
            <Select value={dept2} onValueChange={setDept2}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {departments.map(d => (
                  <SelectItem key={d} value={d} disabled={d === dept1}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Comparison */}
        {stats1 && stats2 ? (
          <div className="space-y-2">
            {metrics.map((metric, idx) => {
              const val1 = (stats1 as any)[metric.key] as number;
              const val2 = (stats2 as any)[metric.key] as number;
              const color1 = getColor(val1, val2, metric.higherIsBetter);
              const color2 = getColor(val2, val1, metric.higherIsBetter);

              return (
                <motion.div
                  key={metric.key}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="grid grid-cols-3 gap-2 items-center p-2.5 rounded-lg bg-muted/30"
                >
                  <div className="text-right">
                    <span className={`text-sm font-bold ${color1}`}>
                      {metric.format(val1)}
                    </span>
                  </div>

                  <div className="text-center">
                    <span className="text-xs text-muted-foreground font-medium">
                      {metric.label}
                    </span>
                  </div>

                  <div className="text-left">
                    <span className={`text-sm font-bold ${color2}`}>
                      {metric.format(val2)}
                    </span>
                  </div>
                </motion.div>
              );
            })}

            {/* Rating bars */}
            <div className="pt-3 space-y-3">
              <p className="text-xs text-muted-foreground text-center font-medium">Avg Manager Rating</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium truncate">{dept1}</span>
                    <span>{stats1.avgManagerRating.toFixed(1)}</span>
                  </div>
                  <Progress value={(stats1.avgManagerRating / maxRating) * 100} className="h-2.5" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium truncate">{dept2}</span>
                    <span>{stats2.avgManagerRating.toFixed(1)}</span>
                  </div>
                  <Progress value={(stats2.avgManagerRating / maxRating) * 100} className="h-2.5" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-6 text-sm">
            Select two departments to compare
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DepartmentComparison;
