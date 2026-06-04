import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  UserCheck, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Zap, Target, BarChart3
} from "lucide-react";

interface ManagerAnalysis {
  name: string;
  directReports: number;
  avgRating: number;
  spread: number;
  distribution: Record<string, number>;
  flag: string;
  flagColor: string;
  flagBg: string;
}

interface EmployeeRecord {
  employeeName: string;
  department: string;
  lineManager: string;
  selfRating: number | null;
  managerRating: number | null;
  [key: string]: any;
}

interface ManagerAccountabilityProps {
  managerAnalysis: ManagerAnalysis[];
  employees: EmployeeRecord[];
  orgMean: number;
  bandIds: { id: string; shortLabel: string }[];
  bandColors: string[];
}

const ManagerAccountability = ({ managerAnalysis, employees, orgMean, bandIds, bandColors }: ManagerAccountabilityProps) => {
  const cards = useMemo(() => {
    return managerAnalysis
      .filter(m => m.directReports >= 2)
      .sort((a, b) => b.directReports - a.directReports)
      .map(mgr => {
        const mgrEmps = employees.filter(e => e.lineManager === mgr.name);
        const withBoth = mgrEmps.filter(e => e.selfRating !== null && e.managerRating !== null);

        // Average gap
        const avgGap = withBoth.length > 0
          ? withBoth.reduce((s, e) => s + Math.abs(e.selfRating! - e.managerRating!), 0) / withBoth.length
          : 0;

        // Calibration accuracy score (how close to org mean distribution)
        const totalBands = bandIds.length;
        const expectedPct = 1 / totalBands;
        let deviationScore = 0;
        bandIds.forEach(b => {
          const actual = (mgr.distribution[b.id] || 0) / mgr.directReports;
          deviationScore += Math.abs(actual - expectedPct);
        });
        const calibrationAccuracy = Math.max(0, Math.min(100, Math.round((1 - deviationScore / 2) * 100)));

        // Coaching suggestions
        const suggestions: string[] = [];
        if (mgr.flag === "Rating Inflation Risk") {
          suggestions.push("Consider differentiating top from solid performers");
          suggestions.push("Use objective metrics alongside subjective assessment");
        }
        if (mgr.flag === "Rating Compression") {
          suggestions.push("Explore full rating scale — compression masks true performance");
          suggestions.push("Schedule 1:1 calibration review with HR");
        }
        if (mgr.flag === "High Strictness") {
          suggestions.push("Benchmark against org averages — may be under-rating talent");
          suggestions.push("Consider positive achievement recognition patterns");
        }
        if (avgGap > 0.8) {
          suggestions.push("Large self vs. manager gaps — have transparent rating discussions with reports");
        }
        if (suggestions.length === 0) {
          suggestions.push("Ratings well-calibrated — continue current approach");
        }

        // Deviation from org mean
        const deviation = mgr.avgRating - orgMean;

        return { ...mgr, avgGap, calibrationAccuracy, suggestions, deviation };
      });
  }, [managerAnalysis, employees, orgMean, bandIds]);

  if (cards.length === 0) {
    return (
      <Card className="border-dashed border-2 border-border/30">
        <CardContent className="py-16 text-center">
          <UserCheck className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No manager data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {cards.map((mgr, i) => (
          <motion.div
            key={mgr.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className={`border-border/40 overflow-hidden h-full ${
              mgr.flag === "Rating Inflation Risk" ? "border-l-2 border-l-destructive" :
              mgr.flag === "Rating Compression" ? "border-l-2 border-l-amber-500" :
              mgr.flag === "High Strictness" ? "border-l-2 border-l-orange-500" :
              "border-l-2 border-l-emerald-500"
            }`}>
              <CardContent className="p-5">
                {/* Manager header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center text-sm font-bold">
                      {mgr.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{mgr.name}</h3>
                      <p className="text-xs text-muted-foreground">{mgr.directReports} direct reports</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className={`${mgr.flagBg} ${mgr.flagColor} border-0 text-[10px]`}>
                    {mgr.flag}
                  </Badge>
                </div>

                {/* Metrics grid */}
                <div className="grid grid-cols-4 gap-3 mb-4 p-3 rounded-xl bg-muted/20 border border-border/20">
                  <div className="text-center">
                    <p className={`text-lg font-bold ${mgr.avgRating >= 3.5 ? "text-emerald-400" : mgr.avgRating < 2.5 ? "text-destructive" : ""}`}>
                      {mgr.avgRating.toFixed(2)}
                    </p>
                    <p className="text-[9px] text-muted-foreground uppercase">Avg Rating</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-lg font-bold ${mgr.spread < 0.4 ? "text-amber-400" : ""}`}>
                      {mgr.spread.toFixed(2)}
                    </p>
                    <p className="text-[9px] text-muted-foreground uppercase">Spread</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-lg font-bold ${mgr.avgGap > 0.8 ? "text-destructive" : ""}`}>
                      {mgr.avgGap.toFixed(2)}
                    </p>
                    <p className="text-[9px] text-muted-foreground uppercase">Avg Gap</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-lg font-bold flex items-center justify-center gap-0.5 ${
                      mgr.deviation > 0.3 ? "text-emerald-400" : mgr.deviation < -0.3 ? "text-destructive" : ""
                    }`}>
                      {mgr.deviation > 0 ? "+" : ""}{mgr.deviation.toFixed(2)}
                    </p>
                    <p className="text-[9px] text-muted-foreground uppercase">vs Org</p>
                  </div>
                </div>

                {/* Calibration accuracy */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Calibration Accuracy</span>
                    <span className={`text-xs font-bold ${
                      mgr.calibrationAccuracy >= 70 ? "text-emerald-400" :
                      mgr.calibrationAccuracy >= 50 ? "text-amber-400" : "text-destructive"
                    }`}>{mgr.calibrationAccuracy}%</span>
                  </div>
                  <Progress value={mgr.calibrationAccuracy} className="h-2" />
                </div>

                {/* Distribution mini-bar */}
                <div className="flex rounded-lg overflow-hidden h-3 bg-muted/30 mb-4">
                  {bandIds.map((band, bi) => {
                    const count = mgr.distribution[band.id] || 0;
                    const pct = mgr.directReports > 0 ? (count / mgr.directReports) * 100 : 0;
                    if (pct === 0) return null;
                    return (
                      <div
                        key={band.id}
                        style={{ width: `${pct}%`, backgroundColor: bandColors[bi] }}
                        title={`${band.shortLabel}: ${count}`}
                      />
                    );
                  })}
                </div>

                {/* Coaching suggestions */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Coaching Suggestions</span>
                  {mgr.suggestions.map((s, si) => (
                    <div key={si} className="flex items-start gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
                      <Target className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-[11px] text-foreground/80">{s}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default ManagerAccountability;
