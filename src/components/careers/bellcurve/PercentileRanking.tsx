import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, Medal, Users, Filter } from "lucide-react";

interface EmployeeRecord {
  employeeName: string;
  department: string;
  lineManager: string;
  selfRating: number | null;
  managerRating: number | null;
  [key: string]: any;
}

interface PercentileRankingProps {
  employees: any[];
  getRating: (emp: any) => number | null;
}

const PercentileRanking = ({ employees, getRating }: PercentileRankingProps) => {
  const [filterDept, setFilterDept] = useState("all");

  const departments = useMemo(() => [...new Set(employees.map(e => e.department).filter(Boolean))].sort(), [employees]);

  const ranked = useMemo(() => {
    const rated = employees.filter(e => getRating(e) !== null);
    const orgSorted = [...rated].sort((a, b) => getRating(a)! - getRating(b)!);
    const orgRanks: Record<string, number> = {};
    orgSorted.forEach((e, i) => {
      orgRanks[e.employeeName] = Math.round(((i + 1) / orgSorted.length) * 100);
    });

    // Dept percentiles
    const deptGroups: Record<string, EmployeeRecord[]> = {};
    rated.forEach(e => {
      if (!deptGroups[e.department]) deptGroups[e.department] = [];
      deptGroups[e.department].push(e);
    });

    const deptRanks: Record<string, number> = {};
    Object.values(deptGroups).forEach(group => {
      const sorted = [...group].sort((a, b) => getRating(a)! - getRating(b)!);
      sorted.forEach((e, i) => {
        deptRanks[e.employeeName] = Math.round(((i + 1) / sorted.length) * 100);
      });
    });

    return rated.map(e => ({
      name: e.employeeName,
      department: e.department,
      manager: e.lineManager,
      rating: getRating(e)!,
      orgPercentile: orgRanks[e.employeeName] || 0,
      deptPercentile: deptRanks[e.employeeName] || 0,
    })).sort((a, b) => b.orgPercentile - a.orgPercentile);
  }, [employees, getRating]);

  const filtered = filterDept === "all" ? ranked : ranked.filter(e => e.department === filterDept);

  const getTier = (pct: number) => {
    if (pct >= 90) return { label: "Top 10%", color: "text-emerald-400", bg: "bg-emerald-500/10" };
    if (pct >= 75) return { label: "Top 25%", color: "text-primary", bg: "bg-primary/10" };
    if (pct >= 50) return { label: "Top 50%", color: "text-blue-400", bg: "bg-blue-500/10" };
    if (pct >= 25) return { label: "Bottom 50%", color: "text-amber-400", bg: "bg-amber-500/10" };
    return { label: "Bottom 25%", color: "text-destructive", bg: "bg-destructive/10" };
  };

  // Summary stats
  const topPerformers = filtered.filter(e => e.orgPercentile >= 90);
  const bottomPerformers = filtered.filter(e => e.orgPercentile <= 10);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Controls & Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-border/40">
          <CardContent className="p-4">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Total Ranked</span>
            <p className="text-2xl font-bold mt-1">{filtered.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-4">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Top 10%</span>
            <p className="text-2xl font-bold mt-1 text-emerald-400">{topPerformers.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-4">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Bottom 10%</span>
            <p className="text-2xl font-bold mt-1 text-destructive">{bottomPerformers.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/40">
          <CardContent className="p-4 flex items-end">
            <div className="flex-1">
              <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mb-1 block">Filter</label>
              <Select value={filterDept} onValueChange={setFilterDept}>
                <SelectTrigger className="h-9 text-xs">
                  <Filter className="w-3 h-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ranking list */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-amber-400" />
            </div>
            Employee Percentile Rankings
          </CardTitle>
          <CardDescription className="ml-[42px]">
            Org-wide and department-level percentile position for each employee
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[600px]">
            <div className="space-y-1.5">
              {/* Header */}
              <div className="grid grid-cols-12 gap-3 px-3 py-2 text-[9px] text-muted-foreground uppercase tracking-widest font-medium border-b border-border/30">
                <div className="col-span-1">#</div>
                <div className="col-span-3">Employee</div>
                <div className="col-span-2">Department</div>
                <div className="col-span-1 text-center">Rating</div>
                <div className="col-span-2 text-center">Org Percentile</div>
                <div className="col-span-2 text-center">Dept Percentile</div>
                <div className="col-span-1 text-center">Tier</div>
              </div>

              {filtered.map((emp, i) => {
                const tier = getTier(emp.orgPercentile);
                return (
                  <motion.div
                    key={emp.name}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.015, 0.5) }}
                    className="grid grid-cols-12 gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/20 transition-colors items-center"
                  >
                    <div className="col-span-1">
                      {i < 3 ? (
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          i === 0 ? "bg-amber-500/20" : i === 1 ? "bg-gray-400/20" : "bg-orange-400/20"
                        }`}>
                          <Medal className={`w-3.5 h-3.5 ${
                            i === 0 ? "text-amber-400" : i === 1 ? "text-gray-400" : "text-orange-400"
                          }`} />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">{i + 1}</span>
                      )}
                    </div>
                    <div className="col-span-3">
                      <p className="text-xs font-medium truncate">{emp.name}</p>
                      <p className="text-[9px] text-muted-foreground truncate">{emp.manager}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs text-muted-foreground truncate block">{emp.department}</span>
                    </div>
                    <div className="col-span-1 text-center">
                      <span className="text-xs font-bold">{emp.rating.toFixed(2)}</span>
                    </div>
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
                        <Progress value={emp.orgPercentile} className="h-1.5 flex-1" />
                        <span className="text-[10px] font-semibold w-8 text-right">P{emp.orgPercentile}</span>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
                        <Progress value={emp.deptPercentile} className="h-1.5 flex-1" />
                        <span className="text-[10px] font-semibold w-8 text-right">P{emp.deptPercentile}</span>
                      </div>
                    </div>
                    <div className="col-span-1 text-center">
                      <Badge variant="secondary" className={`text-[8px] py-0 border-0 ${tier.bg} ${tier.color}`}>
                        {tier.label}
                      </Badge>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PercentileRanking;
