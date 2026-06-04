import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Brain, Loader2, Sparkles, AlertTriangle, CheckCircle2, Calendar,
  Users, TrendingDown, Shield, Zap, Flag
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AIRecommendationsProps {
  employees: any[];
  distribution: { bands: any[]; mean: number; stdDev: number; total: number };
  deptAnalysis: any[];
  managerAnalysis: any[];
  kpis: any;
  healthScore: number;
  aiInsights: string | null;
  onInsightsGenerated: (insights: string) => void;
}

interface ActionItem {
  priority: "critical" | "high" | "medium" | "low";
  category: string;
  action: string;
  target: string;
  rationale: string;
}

const AIRecommendations = ({
  employees, distribution, deptAnalysis, managerAnalysis, kpis, healthScore, aiInsights, onInsightsGenerated,
}: AIRecommendationsProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [recommendations, setRecommendations] = useState<string | null>(null);

  // Rules-based action items (always available)
  const actionItems: ActionItem[] = [];

  // Inflation managers
  managerAnalysis.filter(m => m.flag === "Rating Inflation Risk").forEach(m => {
    actionItems.push({
      priority: "critical", category: "Calibration",
      action: `Schedule calibration session with ${m.name}`,
      target: m.name,
      rationale: `Rating ${m.directReports} employees with avg ${m.avgRating.toFixed(2)} — 70%+ rated above expectations`,
    });
  });

  // Compression managers
  managerAnalysis.filter(m => m.flag === "Rating Compression").forEach(m => {
    actionItems.push({
      priority: "high", category: "Differentiation",
      action: `Coach ${m.name} on performance differentiation`,
      target: m.name,
      rationale: `Rating spread of ${m.spread.toFixed(2)} across ${m.directReports} reports suggests insufficient differentiation`,
    });
  });

  // Dept inflation
  deptAnalysis.filter((d: any) => d.riskFlag === "Inflation Signal").forEach((d: any) => {
    actionItems.push({
      priority: "high", category: "Department Review",
      action: `Initiate department-wide calibration for ${d.dept}`,
      target: d.dept,
      rationale: `Avg rating ${d.avg.toFixed(2)} with ${Math.round(d.topPct)}% high performers — exceeds org norms`,
    });
  });

  // Low performer follow-up
  if (kpis.lowPerfPct < 3 && kpis.totalReviewed > 20) {
    actionItems.push({
      priority: "medium", category: "Policy",
      action: "Review low-performer identification thresholds",
      target: "Organization",
      rationale: `Only ${kpis.lowPerfPct}% identified as low performers from ${kpis.totalReviewed} employees — potentially too lenient`,
    });
  }

  // High concentration
  if (kpis.meetsExpPct > 60) {
    actionItems.push({
      priority: "medium", category: "Calibration",
      action: "Run forced ranking exercise for 'Meets Expectations' band",
      target: "All Managers",
      rationale: `${kpis.meetsExpPct}% concentrated in Meets Expectations — differentiation needed`,
    });
  }

  // Attrition risk overlay
  const highPerfBand = distribution.bands.find(b => b.id === "top" || b.id === "above");
  if (highPerfBand && highPerfBand.count > 0) {
    actionItems.push({
      priority: "high", category: "Retention",
      action: `Review retention plans for ${highPerfBand.count} high performers`,
      target: "Top Performers",
      rationale: "High performers are 2.5x more likely to leave when they feel under-recognized. Ensure compensation and growth plans are in place.",
    });
  }

  const lowBand = distribution.bands.find(b => b.id === "critical");
  if (lowBand && lowBand.count > 0) {
    actionItems.push({
      priority: "critical", category: "Performance",
      action: `Initiate PIPs for ${lowBand.count} critical-low employees`,
      target: "Critical Low Band",
      rationale: "Employees rated below 2.0 require immediate intervention with documented improvement plans.",
    });
  }

  const generateAIRecommendations = useCallback(async () => {
    setIsGenerating(true);
    try {
      const payload = {
        employees: employees.slice(0, 200).map(e => ({
          name: e.employeeName, department: e.department, manager: e.lineManager,
          managerRating: e.managerRating, selfRating: e.selfRating,
        })),
        distribution: distribution.bands.map(b => ({ band: b.label || b.shortLabel, count: b.count, pct: b.pct })),
        deptAnalysis: deptAnalysis.slice(0, 10).map((d: any) => ({ dept: d.dept, avg: d.avg, count: d.count, riskFlag: d.riskFlag })),
        managerFlags: managerAnalysis.filter(m => m.flag !== "Balanced").slice(0, 10).map(m => ({ name: m.name, flag: m.flag, avg: m.avgRating, reports: m.directReports })),
        kpis,
        healthScore,
        requestType: "calibration_recommendations",
      };
      const { data, error } = await supabase.functions.invoke("analyze-performance", {
        body: { employees, bellCurveContext: payload },
      });
      if (error) throw new Error(error.message);
      if (data?.analysis?.executiveSummary) {
        const summary = typeof data.analysis.executiveSummary === "string" ? data.analysis.executiveSummary : JSON.stringify(data.analysis.executiveSummary);
        setRecommendations(summary);
        onInsightsGenerated(summary);
        toast.success("AI recommendations generated!");
      }
    } catch (err) {
      import.meta.env.DEV && console.error(err);
      toast.error("Failed to generate AI recommendations");
    } finally {
      setIsGenerating(false);
    }
  }, [employees, distribution, deptAnalysis, managerAnalysis, kpis, healthScore, onInsightsGenerated]);

  const priorityConfig = {
    critical: { color: "bg-destructive/15 text-destructive", icon: AlertTriangle, border: "border-destructive/20" },
    high: { color: "bg-amber-500/15 text-amber-400", icon: Flag, border: "border-amber-500/20" },
    medium: { color: "bg-primary/15 text-primary", icon: Zap, border: "border-primary/20" },
    low: { color: "bg-emerald-500/15 text-emerald-400", icon: CheckCircle2, border: "border-emerald-500/20" },
  };

  const displayInsights = recommendations || aiInsights;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Action Items */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            Calibration Action Items
          </CardTitle>
          <CardDescription className="ml-[42px]">
            {actionItems.length} recommended actions based on calibration analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {actionItems.sort((a, b) => {
            const order = ["critical", "high", "medium", "low"];
            return order.indexOf(a.priority) - order.indexOf(b.priority);
          }).map((item, i) => {
            const config = priorityConfig[item.priority];
            const Icon = config.icon;
            return (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                className={`flex gap-3 p-4 rounded-xl border ${config.border} bg-card/50 hover:bg-muted/20 transition-colors`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${config.color.split(" ")[1]}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm">{item.action}</p>
                    <Badge variant="secondary" className={`${config.color} border-0 text-[9px]`}>
                      {item.priority}
                    </Badge>
                    <Badge variant="outline" className="text-[9px]">{item.category}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.rationale}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Target: <strong>{item.target}</strong></p>
                </div>
              </motion.div>
            );
          })}
          {actionItems.length === 0 && (
            <div className="text-center py-8">
              <CheckCircle2 className="w-8 h-8 text-emerald-400/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No immediate action items — calibration appears healthy</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attrition Risk Overlay */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-destructive" />
            </div>
            Predictive Attrition Risk Overlay
          </CardTitle>
          <CardDescription className="ml-[42px]">
            Rating bands correlated with typical attrition patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {distribution.bands.map((band, i) => {
              // Industry benchmarks for attrition by rating band
              const attritionRisk = band.id === "critical" ? { risk: 45, label: "Very High" }
                : band.id === "below" ? { risk: 30, label: "High" }
                : band.id === "core" ? { risk: 15, label: "Moderate" }
                : band.id === "above" ? { risk: 12, label: "Low-Moderate" }
                : { risk: 18, label: "Moderate" }; // Top performers sometimes leave for growth
              const atRiskCount = Math.round((attritionRisk.risk / 100) * band.count);

              return (
                <div key={band.id} className="flex items-center gap-4 p-3 rounded-xl bg-muted/10 border border-border/20">
                  <div className="w-20 flex-shrink-0">
                    <span className="text-xs font-medium">{band.shortLabel || band.label}</span>
                    <p className="text-[10px] text-muted-foreground">{band.count} employees</p>
                  </div>
                  <div className="flex-1">
                    <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: attritionRisk.risk >= 30 ? "hsl(var(--destructive))" :
                            attritionRisk.risk >= 15 ? "hsl(var(--chart-5))" : "hsl(var(--chart-3))",
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${attritionRisk.risk}%` }}
                        transition={{ duration: 0.6, delay: i * 0.08 }}
                      />
                    </div>
                  </div>
                  <div className="w-32 flex-shrink-0 text-right">
                    <span className={`text-xs font-semibold ${
                      attritionRisk.risk >= 30 ? "text-destructive" : attritionRisk.risk >= 15 ? "text-amber-400" : "text-emerald-400"
                    }`}>
                      {attritionRisk.risk}% risk
                    </span>
                    <p className="text-[10px] text-muted-foreground">~{atRiskCount} at risk</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* AI Executive Summary */}
      <Card className="border-border/50 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/3 to-transparent" />
        <CardHeader className="pb-3 relative">
          <CardTitle className="text-base flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Brain className="w-4 h-4 text-primary" />
            </div>
            AI Executive Calibration Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          {displayInsights ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{displayInsights}</p>
            </motion.div>
          ) : (
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-violet-500/10 flex items-center justify-center mx-auto mb-4">
                <Brain className="w-8 h-8 text-primary/40" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">Generate AI-powered calibration recommendations</p>
              <p className="text-xs text-muted-foreground/60 mb-4">Includes strategic actions, risk assessment, and executive summary</p>
              <Button size="sm" onClick={generateAIRecommendations} disabled={isGenerating}
                className="bg-gradient-to-r from-violet-600 to-primary hover:from-violet-700 hover:to-primary/90 shadow-lg shadow-primary/20"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
                Generate AI Recommendations
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AIRecommendations;
