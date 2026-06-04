import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Grid3X3, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";

interface EmployeeRecord {
  employeeName: string;
  department: string;
  lineManager: string;
  selfRating: number | null;
  managerRating: number | null;
  [key: string]: any;
}

interface DepartmentHeatmapProps {
  employees: any[];
  getRating: (emp: any) => number | null;
  orgMean: number;
}

const DepartmentHeatmap = ({ employees, getRating, orgMean }: DepartmentHeatmapProps) => {
  const { departments, managers, matrix, deptAvgs, mgrAvgs } = useMemo(() => {
    const rated = employees.filter(e => getRating(e) !== null);
    const deptSet = [...new Set(rated.map(e => e.department).filter(Boolean))].sort();
    const mgrSet = [...new Set(rated.map(e => e.lineManager).filter(Boolean))].sort();

    const mat: Record<string, Record<string, { avg: number; count: number; flag: string }>> = {};
    const dAvgs: Record<string, number> = {};
    const mAvgs: Record<string, number> = {};

    deptSet.forEach(dept => {
      mat[dept] = {};
      const deptEmps = rated.filter(e => e.department === dept);
      const dRatings = deptEmps.map(e => getRating(e)!);
      dAvgs[dept] = dRatings.length > 0 ? dRatings.reduce((a, b) => a + b, 0) / dRatings.length : 0;

      mgrSet.forEach(mgr => {
        const cell = deptEmps.filter(e => e.lineManager === mgr);
        if (cell.length === 0) {
          mat[dept][mgr] = { avg: 0, count: 0, flag: "" };
        } else {
          const ratings = cell.map(e => getRating(e)!);
          const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
          let flag = "";
          if (avg >= 4.0 && cell.length >= 3) flag = "inflation";
          else if (avg < 2.5 && cell.length >= 3) flag = "strictness";
          else if (cell.length >= 4 && (Math.max(...ratings) - Math.min(...ratings)) < 0.3) flag = "compression";
          mat[dept][mgr] = { avg, count: cell.length, flag };
        }
      });
    });

    mgrSet.forEach(mgr => {
      const mgrEmps = rated.filter(e => e.lineManager === mgr);
      const mRatings = mgrEmps.map(e => getRating(e)!);
      mAvgs[mgr] = mRatings.length > 0 ? mRatings.reduce((a, b) => a + b, 0) / mRatings.length : 0;
    });

    return { departments: deptSet, managers: mgrSet, matrix: mat, deptAvgs: dAvgs, mgrAvgs: mAvgs };
  }, [employees, getRating]);

  const getColor = (avg: number, count: number): string => {
    if (count === 0) return "transparent";
    if (avg >= 4.0) return "hsl(142 76% 36% / 0.7)";
    if (avg >= 3.5) return "hsl(142 76% 36% / 0.45)";
    if (avg >= 3.0) return "hsl(217 91% 60% / 0.4)";
    if (avg >= 2.5) return "hsl(38 92% 50% / 0.45)";
    return "hsl(0 84% 60% / 0.55)";
  };

  const activeMgrs = managers.filter(mgr =>
    departments.some(dept => matrix[dept]?.[mgr]?.count > 0)
  );

  if (departments.length === 0 || activeMgrs.length === 0) {
    return (
      <Card className="border-dashed border-2 border-border/30">
        <CardContent className="py-16 text-center">
          <Grid3X3 className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No data to build heatmap</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <Card className="border-border/50 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Grid3X3 className="w-4 h-4 text-primary" />
            </div>
            Rating Heatmap — Department × Manager
          </CardTitle>
          <CardDescription className="ml-[42px]">
            Color intensity = average rating · Flags reveal inflation, strictness &amp; compression pockets · Org mean: {orgMean.toFixed(2)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <TooltipProvider delayDuration={150}>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="p-2 text-left text-[10px] uppercase tracking-widest text-muted-foreground font-medium sticky left-0 bg-card z-10 min-w-[120px]">
                      Dept / Manager →
                    </th>
                    {activeMgrs.map(mgr => (
                      <th key={mgr} className="p-2 text-center min-w-[80px]">
                        <div className="text-[10px] font-medium truncate max-w-[80px]" title={mgr}>
                          {mgr.split(" ").map(n => n[0]).join("").slice(0, 3)}
                        </div>
                        <div className="text-[9px] text-muted-foreground mt-0.5">
                          μ {mgrAvgs[mgr]?.toFixed(1) || "—"}
                        </div>
                      </th>
                    ))}
                    <th className="p-2 text-center text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                      Dept Avg
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept, di) => (
                    <motion.tr
                      key={dept}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: di * 0.03 }}
                      className="hover:bg-muted/10"
                    >
                      <td className="p-2 font-medium sticky left-0 bg-card z-10 border-r border-border/20">
                        <span className="truncate block max-w-[120px]" title={dept}>{dept}</span>
                      </td>
                      {activeMgrs.map(mgr => {
                        const cell = matrix[dept]?.[mgr];
                        if (!cell || cell.count === 0) {
                          return (
                            <td key={mgr} className="p-1.5">
                              <div className="w-full h-10 rounded-lg bg-muted/10 flex items-center justify-center text-muted-foreground/30">
                                —
                              </div>
                            </td>
                          );
                        }
                        return (
                          <td key={mgr} className="p-1.5">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className="w-full h-10 rounded-lg flex flex-col items-center justify-center cursor-default transition-transform hover:scale-105 relative"
                                  style={{ backgroundColor: getColor(cell.avg, cell.count) }}
                                >
                                  <span className="font-bold text-foreground text-[11px]">{cell.avg.toFixed(1)}</span>
                                  <span className="text-[8px] text-foreground/60">n={cell.count}</span>
                                  {cell.flag && (
                                    <div className="absolute -top-1 -right-1">
                                      {cell.flag === "inflation" && <TrendingUp className="w-3 h-3 text-destructive" />}
                                      {cell.flag === "strictness" && <TrendingDown className="w-3 h-3 text-orange-400" />}
                                      {cell.flag === "compression" && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                                    </div>
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                <p className="font-semibold">{dept} × {mgr}</p>
                                <p>Avg: {cell.avg.toFixed(2)} · n={cell.count}</p>
                                {cell.flag && (
                                  <p className="text-destructive capitalize mt-1">⚠ {cell.flag} detected</p>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </td>
                        );
                      })}
                      <td className="p-1.5 text-center">
                        <div className={`inline-flex items-center gap-1 font-bold text-sm ${
                          deptAvgs[dept] > orgMean + 0.3 ? "text-emerald-400" :
                          deptAvgs[dept] < orgMean - 0.3 ? "text-destructive" : ""
                        }`}>
                          {deptAvgs[dept]?.toFixed(2)}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </TooltipProvider>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/30 text-[10px] text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1.5"><div className="w-4 h-3 rounded" style={{ backgroundColor: "hsl(0 84% 60% / 0.55)" }} /> &lt;2.5 Critical</span>
            <span className="flex items-center gap-1.5"><div className="w-4 h-3 rounded" style={{ backgroundColor: "hsl(38 92% 50% / 0.45)" }} /> 2.5–3.0</span>
            <span className="flex items-center gap-1.5"><div className="w-4 h-3 rounded" style={{ backgroundColor: "hsl(217 91% 60% / 0.4)" }} /> 3.0–3.5</span>
            <span className="flex items-center gap-1.5"><div className="w-4 h-3 rounded" style={{ backgroundColor: "hsl(142 76% 36% / 0.45)" }} /> 3.5–4.0</span>
            <span className="flex items-center gap-1.5"><div className="w-4 h-3 rounded" style={{ backgroundColor: "hsl(142 76% 36% / 0.7)" }} /> 4.0+ Top</span>
            <span className="ml-auto flex items-center gap-3">
              <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-destructive" /> Inflation</span>
              <span className="flex items-center gap-1"><TrendingDown className="w-3 h-3 text-orange-400" /> Strictness</span>
              <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-amber-400" /> Compression</span>
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default DepartmentHeatmap;
