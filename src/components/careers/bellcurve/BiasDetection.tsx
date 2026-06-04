import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Brain, AlertTriangle, ShieldAlert, Loader2, TrendingUp, Clock, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EmployeeRecord {
  employeeName: string;
  department: string;
  lineManager: string;
  selfRating: number | null;
  managerRating: number | null;
  jobTitle?: string;
  [key: string]: any;
}

interface BiasDetectionProps {
  employees: EmployeeRecord[];
  managerAnalysis: { name: string; avgRating: number; directReports: number; spread: number; flag: string }[];
  deptAnalysis: { dept: string; avg: number; count: number }[];
}

interface BiasResult {
  type: string;
  severity: "high" | "medium" | "low";
  description: string;
  evidence: string;
  affectedCount: number;
  statisticalSignificance: number;
  recommendation: string;
}

const BiasDetection = ({ employees, managerAnalysis, deptAnalysis }: BiasDetectionProps) => {
  const [aiResults, setAiResults] = useState<BiasResult[] | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Local heuristic bias detection
  const localBiases = useMemo(() => {
    const biases: BiasResult[] = [];
    const rated = employees.filter(e => e.managerRating !== null && e.selfRating !== null);

    // Central tendency bias — managers cluster around 3.0-3.5
    managerAnalysis.forEach(mgr => {
      if (mgr.directReports >= 5 && mgr.spread < 0.4) {
        biases.push({
          type: "Central Tendency Bias",
          severity: mgr.spread < 0.25 ? "high" : "medium",
          description: `${mgr.name} rates all ${mgr.directReports} reports within a ${mgr.spread.toFixed(2)} spread`,
          evidence: `Rating spread of ${mgr.spread.toFixed(2)} across ${mgr.directReports} employees is significantly below expected variance`,
          affectedCount: mgr.directReports,
          statisticalSignificance: Math.min(95, 60 + (0.5 - mgr.spread) * 100),
          recommendation: `Schedule calibration conversation with ${mgr.name} to discuss differentiated ratings`,
        });
      }
    });

    // Leniency bias — manager avg significantly above org mean
    const orgAvg = rated.length > 0 ? rated.reduce((s, e) => s + e.managerRating!, 0) / rated.length : 3.0;
    managerAnalysis.forEach(mgr => {
      if (mgr.directReports >= 4 && mgr.avgRating > orgAvg + 0.6) {
        biases.push({
          type: "Leniency Bias",
          severity: mgr.avgRating > orgAvg + 1.0 ? "high" : "medium",
          description: `${mgr.name}'s avg (${mgr.avgRating.toFixed(2)}) is ${(mgr.avgRating - orgAvg).toFixed(2)} above org mean`,
          evidence: `Manager avg ${mgr.avgRating.toFixed(2)} vs org avg ${orgAvg.toFixed(2)} with ${mgr.directReports} reports`,
          affectedCount: mgr.directReports,
          statisticalSignificance: Math.min(95, 55 + (mgr.avgRating - orgAvg) * 30),
          recommendation: `Review ${mgr.name}'s ratings with benchmarking data; consider peer calibration`,
        });
      }
    });

    // Strictness bias
    managerAnalysis.forEach(mgr => {
      if (mgr.directReports >= 4 && mgr.avgRating < orgAvg - 0.6) {
        biases.push({
          type: "Strictness Bias",
          severity: mgr.avgRating < orgAvg - 1.0 ? "high" : "medium",
          description: `${mgr.name}'s avg (${mgr.avgRating.toFixed(2)}) is ${(orgAvg - mgr.avgRating).toFixed(2)} below org mean`,
          evidence: `Manager avg ${mgr.avgRating.toFixed(2)} vs org avg ${orgAvg.toFixed(2)} with ${mgr.directReports} reports`,
          affectedCount: mgr.directReports,
          statisticalSignificance: Math.min(95, 55 + (orgAvg - mgr.avgRating) * 30),
          recommendation: `Discuss rating philosophy with ${mgr.name}; ensure performance standards are aligned`,
        });
      }
    });

    // Self-serving bias (gap analysis)
    const selfHigher = rated.filter(e => (e.selfRating! - e.managerRating!) > 1.0);
    if (selfHigher.length >= 3) {
      biases.push({
        type: "Self-Serving Bias Pattern",
        severity: selfHigher.length > rated.length * 0.3 ? "high" : "medium",
        description: `${selfHigher.length} employees rate themselves 1.0+ points above manager assessment`,
        evidence: `${Math.round((selfHigher.length / rated.length) * 100)}% of employees show >1.0 self-inflation gap`,
        affectedCount: selfHigher.length,
        statisticalSignificance: Math.min(90, 50 + (selfHigher.length / rated.length) * 80),
        recommendation: "Consider 360° feedback to provide additional perspective on self-ratings",
      });
    }

    // Department clustering bias
    deptAnalysis.forEach(dept => {
      if (dept.count >= 5 && Math.abs(dept.avg - orgAvg) > 0.5) {
        biases.push({
          type: "Department Rating Clustering",
          severity: Math.abs(dept.avg - orgAvg) > 0.8 ? "high" : "low",
          description: `${dept.dept} avg (${dept.avg.toFixed(2)}) deviates ${Math.abs(dept.avg - orgAvg).toFixed(2)} from org mean`,
          evidence: `Dept avg ${dept.avg.toFixed(2)} vs org ${orgAvg.toFixed(2)} across ${dept.count} employees`,
          affectedCount: dept.count,
          statisticalSignificance: Math.min(85, 40 + Math.abs(dept.avg - orgAvg) * 40),
          recommendation: `Cross-calibrate ${dept.dept} ratings with peer departments`,
        });
      }
    });

    return biases.sort((a, b) => {
      const sev = { high: 0, medium: 1, low: 2 };
      return sev[a.severity] - sev[b.severity];
    });
  }, [employees, managerAnalysis, deptAnalysis]);

  const runAIAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-performance", {
        body: {
          employees: employees.slice(0, 150).map(e => ({
            name: e.employeeName, department: e.department, manager: e.lineManager,
            selfRating: e.selfRating, managerRating: e.managerRating, jobTitle: e.jobTitle,
          })),
          biasDetection: true,
          localBiases: localBiases.slice(0, 10),
        },
      });
      if (error) throw new Error(error.message);
      if (data?.analysis?.biases) {
        setAiResults(data.analysis.biases);
        toast.success("AI bias analysis complete");
      } else {
        toast.info("AI analysis complete — using local detection results");
      }
    } catch {
      toast.error("AI analysis failed — showing local detection results");
    } finally {
      setIsAnalyzing(false);
    }
  }, [employees, localBiases]);

  const biases = aiResults || localBiases;
  const sevColors = {
    high: "bg-destructive/10 text-destructive border-destructive/20",
    medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    low: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Header */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-destructive/20 to-amber-500/20 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Bias Detection Engine</h3>
                <p className="text-xs text-muted-foreground">
                  {biases.length} potential bias{biases.length !== 1 ? "es" : ""} detected ·
                  {biases.filter(b => b.severity === "high").length} high severity
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={runAIAnalysis}
              disabled={isAnalyzing}
              className="bg-gradient-to-r from-violet-600 to-primary text-xs h-9"
            >
              {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Brain className="w-3.5 h-3.5 mr-1.5" />}
              Deep AI Analysis
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary badges */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: "High", count: biases.filter(b => b.severity === "high").length, cls: "bg-destructive/15 text-destructive" },
          { label: "Medium", count: biases.filter(b => b.severity === "medium").length, cls: "bg-amber-500/15 text-amber-400" },
          { label: "Low", count: biases.filter(b => b.severity === "low").length, cls: "bg-blue-500/15 text-blue-400" },
        ].filter(s => s.count > 0).map(s => (
          <Badge key={s.label} variant="secondary" className={`${s.cls} border-0 text-xs py-1.5 px-3`}>
            {s.count} {s.label} Severity
          </Badge>
        ))}
      </div>

      {/* Bias cards */}
      <div className="space-y-3">
        {biases.map((bias, i) => (
          <motion.div
            key={`${bias.type}-${i}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className={`border-border/40 ${bias.severity === "high" ? "border-l-2 border-l-destructive" : bias.severity === "medium" ? "border-l-2 border-l-amber-500" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <AlertTriangle className={`w-4 h-4 ${
                      bias.severity === "high" ? "text-destructive" :
                      bias.severity === "medium" ? "text-amber-400" : "text-blue-400"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-sm">{bias.type}</span>
                      <Badge variant="outline" className={`text-[9px] py-0 ${sevColors[bias.severity]}`}>
                        {bias.severity}
                      </Badge>
                      <Badge variant="secondary" className="text-[9px] py-0 border-0 bg-muted/50">
                        {bias.affectedCount} affected
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{bias.description}</p>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] text-muted-foreground">Statistical Significance:</span>
                      <div className="flex-1 max-w-[200px]">
                        <Progress value={bias.statisticalSignificance} className="h-1.5" />
                      </div>
                      <span className="text-[10px] font-semibold">{bias.statisticalSignificance.toFixed(0)}%</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground italic">Evidence: {bias.evidence}</p>
                    <div className="mt-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
                      <p className="text-[11px] text-primary font-medium">💡 {bias.recommendation}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {biases.length === 0 && (
        <Card className="border-dashed border-2 border-border/30">
          <CardContent className="py-16 text-center">
            <ShieldAlert className="w-10 h-10 text-emerald-400/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No significant rating biases detected</p>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
};

export default BiasDetection;
