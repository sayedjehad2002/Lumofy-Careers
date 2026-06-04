import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface EmployeeRecord {
  employeeName: string;
  department: string;
  jobTitle: string;
  lineManager: string;
  selfRating: number | null;
  managerRating: number | null;
  potentialScore: string | null;
}

interface DepartmentMetrics {
  department: string;
  employeeCount: number;
  avgManagerRating: number;
  avgSelfRating: number;
  highPerformers: number;
  lowPerformers: number;
  highPotential: number;
  misalignedCount: number;
  avgGap: number;
  ratingCompletion: number;
}

interface DepartmentHeatmapProps {
  employees: EmployeeRecord[];
}

const DepartmentHeatmap = ({ employees }: DepartmentHeatmapProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [sortBy, setSortBy] = useState<"department" | "avgRating" | "risk">("avgRating");

  // Detect max rating
  const maxRating = useMemo(() => {
    const allRatings = employees
      .map(e => e.managerRating)
      .filter((r): r is number => r !== null && !isNaN(r));
    if (allRatings.length === 0) return 5;
    const max = Math.max(...allRatings);
    return max <= 5 ? 5 : max <= 10 ? 10 : max;
  }, [employees]);

  const departmentMetrics = useMemo((): DepartmentMetrics[] => {
    const deptMap: Record<string, EmployeeRecord[]> = {};
    employees.forEach(emp => {
      if (!deptMap[emp.department]) deptMap[emp.department] = [];
      deptMap[emp.department].push(emp);
    });

    return Object.entries(deptMap).map(([dept, emps]) => {
      const withMgrRating = emps.filter(e => e.managerRating !== null);
      const withSelfRating = emps.filter(e => e.selfRating !== null);
      const withBoth = emps.filter(e => e.managerRating !== null && e.selfRating !== null);

      const avgMgr = withMgrRating.length > 0
        ? withMgrRating.reduce((s, e) => s + (e.managerRating || 0), 0) / withMgrRating.length
        : 0;
      const avgSelf = withSelfRating.length > 0
        ? withSelfRating.reduce((s, e) => s + (e.selfRating || 0), 0) / withSelfRating.length
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

      const avgGap = withBoth.length > 0
        ? withBoth.reduce((s, e) => s + Math.abs((e.selfRating || 0) - (e.managerRating || 0)), 0) / withBoth.length
        : 0;

      return {
        department: dept,
        employeeCount: emps.length,
        avgManagerRating: avgMgr,
        avgSelfRating: avgSelf,
        highPerformers: highPerf,
        lowPerformers: lowPerf,
        highPotential: highPot,
        misalignedCount: misaligned,
        avgGap,
        ratingCompletion: emps.length > 0 ? Math.round((withMgrRating.length / emps.length) * 100) : 0,
      };
    }).sort((a, b) => {
      if (sortBy === "avgRating") return b.avgManagerRating - a.avgManagerRating;
      if (sortBy === "risk") return b.lowPerformers - a.lowPerformers;
      return a.department.localeCompare(b.department);
    });
  }, [employees, sortBy, maxRating]);

  const getHeatColor = (rating: number): string => {
    const normalized = rating / maxRating;
    if (normalized > 0.7) return "bg-emerald-500";
    if (normalized > 0.5) return "bg-amber-400";
    return "bg-destructive";
  };

  if (employees.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-muted-foreground">
          Upload data to view department heatmap
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Performance Heatmap
                <Badge variant="secondary" className="text-xs font-normal">
                  {departmentMetrics.length} Depts
                </Badge>
              </CardTitle>
            </div>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </CollapsibleTrigger>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* Sort controls */}
            <div className="flex gap-2">
              {[
                { key: "avgRating", label: "By Rating" },
                { key: "risk", label: "By Risk" },
                { key: "department", label: "A-Z" },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setSortBy(opt.key as typeof sortBy)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                    sortBy === opt.key 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Heatmap rows */}
            <div className="space-y-2">
              {departmentMetrics.map((dept, idx) => (
                <motion.div
                  key={dept.department}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.02 }}
                >
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    {/* Department name */}
                    <div className="w-28 shrink-0">
                      <p className="text-sm font-medium truncate">{dept.department}</p>
                      <p className="text-xs text-muted-foreground">{dept.employeeCount} emp</p>
                    </div>

                    {/* Rating bar */}
                    <div className="flex-1 relative h-7">
                      <div className="absolute inset-0 bg-muted/50 rounded-md" />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <motion.div
                            className={`absolute left-0 top-0 h-full rounded-md ${getHeatColor(dept.avgManagerRating)}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${(dept.avgManagerRating / maxRating) * 100}%` }}
                            transition={{ duration: 0.4, delay: idx * 0.03 }}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Avg Rating: {dept.avgManagerRating.toFixed(2)}/{maxRating}</p>
                          <p>Gap: {dept.avgGap.toFixed(2)}</p>
                        </TooltipContent>
                      </Tooltip>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-bold text-foreground drop-shadow-sm">
                          {dept.avgManagerRating.toFixed(1)}
                        </span>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="flex items-center gap-1.5 w-32 shrink-0">
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 text-xs px-1.5">
                            <TrendingUp className="w-3 h-3 mr-0.5" />
                            {dept.highPerformers}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>High Performers</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="secondary" className="bg-destructive/10 text-destructive border-0 text-xs px-1.5">
                            <TrendingDown className="w-3 h-3 mr-0.5" />
                            {dept.lowPerformers}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>Low Performers</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-0 text-xs px-1.5">
                            <Minus className="w-3 h-3 mr-0.5" />
                            {dept.misalignedCount}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>Misaligned</TooltipContent>
                      </Tooltip>
                    </div>

                    {/* Completion */}
                    <div className="w-10 text-right">
                      <span className={`text-xs font-medium ${
                        dept.ratingCompletion === 100 ? "text-emerald-500" :
                        dept.ratingCompletion >= 80 ? "text-amber-500" : "text-destructive"
                      }`}>
                        {dept.ratingCompletion}%
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-emerald-500" />
                <span>High (&gt;70%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-amber-400" />
                <span>Medium</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-destructive" />
                <span>Low (≤40%)</span>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default DepartmentHeatmap;
