import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Target, AlertTriangle, CheckCircle2, Settings2 } from "lucide-react";

interface RatingBand {
  id: string;
  label: string;
  shortLabel: string;
}

interface ForcedDistributionProps {
  bands: { id: string; label: string; shortLabel: string; count: number; pct: number; employees: any[] }[];
  total: number;
  deptAnalysis: any[];
  managerAnalysis: any[];
  bandColors: string[];
}

const DEFAULT_TARGETS: Record<string, number> = { critical: 5, below: 15, core: 50, above: 20, top: 10 };

const ForcedDistribution = ({ bands, total, deptAnalysis, managerAnalysis, bandColors }: ForcedDistributionProps) => {
  const [targets, setTargets] = useState(DEFAULT_TARGETS);
  const [showCustomize, setShowCustomize] = useState(false);

  const gapAnalysis = useMemo(() => {
    return bands.map(band => {
      const target = targets[band.id] || 0;
      const targetCount = Math.round((target / 100) * total);
      const gap = band.count - targetCount;
      const gapPct = band.pct - target;
      return { ...band, target, targetCount, gap, gapPct, status: Math.abs(gapPct) <= 3 ? "aligned" : gapPct > 0 ? "over" : "under" };
    });
  }, [bands, targets, total]);

  const overallDeviation = useMemo(() => {
    return gapAnalysis.reduce((sum, g) => sum + Math.abs(g.gapPct), 0) / gapAnalysis.length;
  }, [gapAnalysis]);

  // Per-department deviation
  const deptDeviation = useMemo(() => {
    return deptAnalysis.map((dept: any) => {
      const deptBands = bands.map(band => {
        const count = dept.bandDist?.[band.id] || 0;
        const pct = dept.count > 0 ? Math.round((count / dept.count) * 100) : 0;
        const target = targets[band.id] || 0;
        return { bandId: band.id, label: band.shortLabel, pct, target, gap: pct - target };
      });
      const avgDev = deptBands.reduce((s, b) => s + Math.abs(b.gap), 0) / deptBands.length;
      return { dept: dept.dept, count: dept.count, bands: deptBands, avgDeviation: avgDev, status: avgDev <= 5 ? "aligned" : "deviation" };
    }).sort((a, b) => b.avgDeviation - a.avgDeviation);
  }, [deptAnalysis, bands, targets]);

  // Per-manager deviation
  const mgrDeviation = useMemo(() => {
    return managerAnalysis.map((mgr: any) => {
      const mgrBands = bands.map(band => {
        const count = mgr.distribution?.[band.id] || 0;
        const pct = mgr.directReports > 0 ? Math.round((count / mgr.directReports) * 100) : 0;
        const target = targets[band.id] || 0;
        return { bandId: band.id, label: band.shortLabel, pct, target, gap: pct - target };
      });
      const avgDev = mgrBands.reduce((s, b) => s + Math.abs(b.gap), 0) / mgrBands.length;
      return { name: mgr.name, reports: mgr.directReports, bands: mgrBands, avgDeviation: avgDev, status: avgDev <= 5 ? "aligned" : "deviation" };
    }).sort((a, b) => b.avgDeviation - a.avgDeviation);
  }, [managerAnalysis, bands, targets]);

  const handleTargetChange = (bandId: string, value: number) => {
    setTargets(prev => ({ ...prev, [bandId]: value }));
  };

  const totalTarget = Object.values(targets).reduce((s, v) => s + v, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Target Configuration */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Target className="w-4 h-4 text-primary" />
                </div>
                Forced Distribution Targets
              </CardTitle>
              <CardDescription className="ml-[42px]">
                Set ideal band percentages · Org deviation: <strong className={overallDeviation <= 5 ? "text-emerald-400" : overallDeviation <= 10 ? "text-amber-400" : "text-destructive"}>{overallDeviation.toFixed(1)}%</strong>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Customize</span>
              <Switch checked={showCustomize} onCheckedChange={setShowCustomize} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {showCustomize && (
            <div className="space-y-4 mb-6 p-4 rounded-xl bg-muted/20 border border-border/30">
              {bands.map((band, i) => (
                <div key={band.id} className="flex items-center gap-4">
                  <div className="w-24 flex items-center gap-2 flex-shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: bandColors[i] }} />
                    <span className="text-xs font-medium">{band.shortLabel}</span>
                  </div>
                  <Slider
                    value={[targets[band.id] || 0]}
                    onValueChange={([v]) => handleTargetChange(band.id, v)}
                    min={0} max={60} step={1}
                    className="flex-1"
                  />
                  <span className="text-xs font-mono w-10 text-right">{targets[band.id]}%</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 border-t border-border/30">
                <span className="text-xs text-muted-foreground">Total</span>
                <span className={`text-xs font-bold ${totalTarget === 100 ? "text-emerald-400" : "text-destructive"}`}>{totalTarget}%{totalTarget !== 100 && " (should be 100%)"}</span>
              </div>
              <Button size="sm" variant="ghost" className="text-xs" onClick={() => setTargets(DEFAULT_TARGETS)}>Reset to Default</Button>
            </div>
          )}

          {/* Actual vs Target comparison */}
          <div className="space-y-3">
            {gapAnalysis.map((band, i) => (
              <div key={band.id} className="flex items-center gap-4">
                <div className="w-20 flex items-center gap-2 flex-shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: bandColors[i] }} />
                  <span className="text-xs font-medium">{band.shortLabel}</span>
                </div>
                <div className="flex-1 relative">
                  <div className="flex h-6 rounded-lg overflow-hidden bg-muted/30">
                    <motion.div
                      className="h-full rounded-lg"
                      style={{ backgroundColor: bandColors[i], opacity: 0.6 }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(band.pct, 100)}%` }}
                      transition={{ duration: 0.6, delay: i * 0.05 }}
                    />
                  </div>
                  <div className="absolute top-0 h-full flex items-center" style={{ left: `${Math.min(band.target, 100)}%` }}>
                    <div className="w-0.5 h-full bg-foreground/60 rounded-full" />
                    <span className="text-[8px] text-foreground/60 ml-0.5 font-medium">{band.target}%</span>
                  </div>
                </div>
                <div className="w-32 flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-semibold">{band.pct}%</span>
                  <Badge variant="secondary" className={`text-[9px] border-0 px-1.5 ${
                    band.status === "aligned" ? "bg-emerald-500/15 text-emerald-400" :
                    band.status === "over" ? "bg-destructive/15 text-destructive" :
                    "bg-amber-500/15 text-amber-400"
                  }`}>
                    {band.gapPct > 0 ? "+" : ""}{band.gapPct}%
                  </Badge>
                  <span className="text-[9px] text-muted-foreground">({band.gap > 0 ? "+" : ""}{band.gap})</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Department Deviation Table */}
      {deptDeviation.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Department Gap Analysis</CardTitle>
            <CardDescription>How each department deviates from the forced distribution targets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {deptDeviation.map((dept, i) => (
                <motion.div key={dept.dept} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  className={`flex items-center gap-4 p-3 rounded-xl border transition-colors ${
                    dept.status === "aligned" ? "border-emerald-500/20 bg-emerald-500/3" : "border-destructive/20 bg-destructive/3"
                  }`}
                >
                  <div className="min-w-[140px]">
                    <p className="font-semibold text-sm">{dept.dept}</p>
                    <p className="text-[10px] text-muted-foreground">{dept.count} employees</p>
                  </div>
                  <div className="flex gap-2 flex-1">
                    {dept.bands.map((b, bi) => (
                      <div key={b.bandId} className="text-center flex-1">
                        <p className="text-[9px] text-muted-foreground">{b.label}</p>
                        <p className={`text-xs font-bold ${Math.abs(b.gap) > 10 ? "text-destructive" : Math.abs(b.gap) > 5 ? "text-amber-400" : ""}`}>
                          {b.gap > 0 ? "+" : ""}{b.gap}%
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {dept.status === "aligned" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                    )}
                    <span className="text-xs font-semibold">{dept.avgDeviation.toFixed(1)}% dev</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manager Deviation */}
      {mgrDeviation.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Manager Gap Analysis</CardTitle>
            <CardDescription>Manager-level deviations from target distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {mgrDeviation.slice(0, 15).map((mgr, i) => (
                <motion.div key={mgr.name} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  className={`flex items-center gap-4 p-3 rounded-xl border transition-colors ${
                    mgr.status === "aligned" ? "border-emerald-500/20 bg-emerald-500/3" : "border-border/30 bg-muted/10"
                  }`}
                >
                  <div className="min-w-[140px]">
                    <p className="font-semibold text-sm">{mgr.name}</p>
                    <p className="text-[10px] text-muted-foreground">{mgr.reports} reports</p>
                  </div>
                  <div className="flex gap-2 flex-1">
                    {mgr.bands.map((b) => (
                      <div key={b.bandId} className="text-center flex-1">
                        <p className="text-[9px] text-muted-foreground">{b.label}</p>
                        <p className={`text-xs font-bold ${Math.abs(b.gap) > 15 ? "text-destructive" : Math.abs(b.gap) > 8 ? "text-amber-400" : ""}`}>
                          {b.gap > 0 ? "+" : ""}{b.gap}%
                        </p>
                      </div>
                    ))}
                  </div>
                  <Badge variant="secondary" className={`text-[10px] border-0 ${
                    mgr.avgDeviation <= 5 ? "bg-emerald-500/15 text-emerald-400" :
                    mgr.avgDeviation <= 12 ? "bg-amber-500/15 text-amber-400" :
                    "bg-destructive/15 text-destructive"
                  }`}>
                    {mgr.avgDeviation.toFixed(1)}% dev
                  </Badge>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
};

export default ForcedDistribution;
