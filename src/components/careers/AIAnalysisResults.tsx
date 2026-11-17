import { motion } from "framer-motion";
import {
  AlertTriangle, TrendingUp, Users, Flag, Sparkles, Target,
  ChevronDown, CheckCircle2, XCircle, Clock, Zap, ArrowRight,
  Building, Star, AlertCircle, Lightbulb, BarChart3
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

interface OrganizationalObservation {
  category: string;
  title: string;
  insight: string;
  severity: "high" | "medium" | "low";
}

interface DepartmentAnalysisItem {
  department: string;
  healthScore: number;
  summary: string;
  strengths: string[];
  risks: string[];
  keyActions: string[];
}

interface RedFlagItem {
  employeeName: string;
  department: string;
  riskCategory: string;
  urgency: "Critical" | "High" | "Moderate";
  summary: string;
  recommendedAction: string;
}

interface HighPotentialItem {
  employeeName: string;
  department: string;
  performance: string | number;
  potential: string;
  readinessTag: string;
  summary: string;
  developmentAction: string;
}

interface TopPerformerItem {
  employeeName: string;
  department: string;
  selfReview: number;
  managerReview: number;
  consistencyTag: string;
  summary: string;
  retentionAction: string;
}

interface StrategicRecommendations {
  immediate: { action: string; rationale: string; owner: string }[];
  mediumTerm: { action: string; rationale: string; timeline: string }[];
  longTerm: { action: string; rationale: string; impact: string }[];
}

interface ExecutiveSummary {
  overallHealth: "Strong" | "Moderate" | "Needs Attention" | "Critical";
  mainRisk: string;
  keyStrength: string;
  topPriority: string;
  outlook: string;
}

export interface AIAnalysisResult {
  organizationalObservations: OrganizationalObservation[];
  departmentAnalysis: DepartmentAnalysisItem[];
  redFlags: RedFlagItem[];
  highPotentials: HighPotentialItem[];
  topPerformers: TopPerformerItem[];
  strategicRecommendations: StrategicRecommendations;
  executiveSummary: ExecutiveSummary;
}

interface AIAnalysisResultsProps {
  analysis: AIAnalysisResult;
  analyzedAt: string;
  narrativeMode?: boolean;
}

const severityColors = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-[hsl(var(--intel-warning)/0.1)] text-[hsl(var(--intel-warning))] border-[hsl(var(--intel-warning)/0.2)]",
  low: "bg-[hsl(var(--intel-success)/0.1)] text-[hsl(var(--intel-success))] border-[hsl(var(--intel-success)/0.2)]",
};

const urgencyColors = {
  Critical: "bg-destructive text-destructive-foreground",
  High: "bg-[hsl(var(--chart-5))] text-white",
  Moderate: "bg-[hsl(var(--intel-warning))] text-black",
};

const healthColors = (score: number) => {
  if (score >= 8) return "text-[hsl(var(--intel-success))]";
  if (score >= 6) return "text-primary";
  if (score >= 4) return "text-[hsl(var(--intel-warning))]";
  return "text-destructive";
};

const AIAnalysisResults = ({ analysis, analyzedAt, narrativeMode = false }: AIAnalysisResultsProps) => {
  const [openDepts, setOpenDepts] = useState<string[]>([]);

  const toggleDept = (dept: string) => {
    setOpenDepts(prev => prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]);
  };

  // Generate narrative prose from bullet points
  const generateNarrative = (items: string[]): string => {
    if (!items || items.length === 0) return "";
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} Additionally, ${items[1].toLowerCase()}`;
    const lastItem = items[items.length - 1];
    const otherItems = items.slice(0, -1);
    return `${otherItems.join(". ")}. Finally, ${lastItem.toLowerCase()}.`;
  };

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-[hsl(var(--chart-3)/0.05)]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="w-5 h-5 text-primary" />
                Executive Takeaway
              </CardTitle>
              <Badge
                variant="secondary"
                className={`${
                  analysis.executiveSummary.overallHealth === "Strong" ? "bg-[hsl(var(--intel-success)/0.15)] text-[hsl(var(--intel-success))]" :
                  analysis.executiveSummary.overallHealth === "Moderate" ? "bg-primary/15 text-primary" :
                  analysis.executiveSummary.overallHealth === "Needs Attention" ? "bg-[hsl(var(--intel-warning)/0.15)] text-[hsl(var(--intel-warning))]" :
                  "bg-destructive/15 text-destructive"
                } border-0`}
              >
                {analysis.executiveSummary.overallHealth}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-background/60 border border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />Main Risk
                </p>
                <p className="text-sm font-medium">{analysis.executiveSummary.mainRisk}</p>
              </div>
              <div className="p-3 rounded-lg bg-background/60 border border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />Key Strength
                </p>
                <p className="text-sm font-medium">{analysis.executiveSummary.keyStrength}</p>
              </div>
              <div className="p-3 rounded-lg bg-background/60 border border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Target className="w-3 h-3" />Top Priority
                </p>
                <p className="text-sm font-medium">{analysis.executiveSummary.topPriority}</p>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Strategic Outlook</p>
              <p className="text-sm">{analysis.executiveSummary.outlook}</p>
            </div>
            <p className="text-[10px] text-muted-foreground text-right">
              Analysis generated {new Date(analyzedAt).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Organizational Observations */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-4 h-4 text-primary" />
              Organizational Observations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {analysis.organizationalObservations.map((obs, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className={`p-3 rounded-lg border ${severityColors[obs.severity]}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <Badge variant="outline" className="text-[9px] shrink-0">{obs.category}</Badge>
                    <Badge variant="secondary" className={`text-[9px] ${severityColors[obs.severity]} border-0`}>
                      {obs.severity}
                    </Badge>
                  </div>
                  <p className="font-semibold text-sm mb-1">{obs.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{obs.insight}</p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Department Analysis */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building className="w-4 h-4 text-primary" />
              Department Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {analysis.departmentAnalysis.map((dept, i) => (
              <Collapsible
                key={dept.department}
                open={openDepts.includes(dept.department)}
                onOpenChange={() => toggleDept(dept.department)}
              >
                <CollapsibleTrigger asChild>
                  <motion.button
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.03 }}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50 hover:bg-secondary/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-xl font-bold ${healthColors(dept.healthScore)}`}>
                          {dept.healthScore}
                        </span>
                        <span className="text-[10px] text-muted-foreground">/10</span>
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{dept.department}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[400px]">{dept.summary}</p>
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openDepts.includes(dept.department) ? "rotate-180" : ""}`} />
                  </motion.button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 p-4 rounded-lg bg-muted/30 border border-border/50 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-[10px] text-[hsl(var(--intel-success))] uppercase tracking-wider mb-2 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />Strengths
                      </p>
                      <ul className="space-y-1">
                        {dept.strengths.map((s, j) => (
                          <li key={j} className="text-xs flex items-start gap-1.5">
                            <span className="text-[hsl(var(--intel-success))] mt-0.5">•</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[10px] text-destructive uppercase tracking-wider mb-2 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />Risks
                      </p>
                      <ul className="space-y-1">
                        {dept.risks.map((r, j) => (
                          <li key={j} className="text-xs flex items-start gap-1.5">
                            <span className="text-destructive mt-0.5">•</span>{r}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[10px] text-primary uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Lightbulb className="w-3 h-3" />Key Actions
                      </p>
                      <ul className="space-y-1">
                        {dept.keyActions.map((a, j) => (
                          <li key={j} className="text-xs flex items-start gap-1.5">
                            <ArrowRight className="w-3 h-3 text-primary mt-0.5 shrink-0" />{a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Red Flags, High Potentials & Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Red Flags */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="border-destructive/20 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-destructive">
                <Flag className="w-4 h-4" />
                Major Red Flags
                <Badge variant="secondary" className="ml-auto bg-destructive/10 text-destructive border-0 text-[10px]">
                  {analysis.redFlags.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
              {analysis.redFlags.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No critical red flags identified</p>
              ) : (
                analysis.redFlags.map((rf, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.05 }}
                    className="p-3 rounded-lg bg-destructive/5 border border-destructive/10"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-semibold text-sm">{rf.employeeName}</p>
                        <p className="text-[10px] text-muted-foreground">{rf.department}</p>
                      </div>
                      <Badge className={`text-[9px] ${urgencyColors[rf.urgency]}`}>
                        {rf.urgency}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="text-[9px] mb-2">{rf.riskCategory}</Badge>
                    <p className="text-xs text-muted-foreground mb-2">{rf.summary}</p>
                    <div className="p-2 rounded bg-background/50 border border-border/50">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Action</p>
                      <p className="text-xs">{rf.recommendedAction}</p>
                    </div>
                  </motion.div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* High Potentials */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <Card className="border-[hsl(var(--chart-3)/0.2)] h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-[hsl(var(--chart-3))]">
                <Sparkles className="w-4 h-4" />
                High-Potential Talent
                <Badge variant="secondary" className="ml-auto bg-[hsl(var(--chart-3)/0.1)] text-[hsl(var(--chart-3))] border-0 text-[10px]">
                  {analysis.highPotentials.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
              {analysis.highPotentials.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No high-potential profiles identified</p>
              ) : (
                analysis.highPotentials.map((hp, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.05 }}
                    className="p-3 rounded-lg bg-[hsl(var(--chart-3)/0.05)] border border-[hsl(var(--chart-3)/0.1)]"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-semibold text-sm">{hp.employeeName}</p>
                        <p className="text-[10px] text-muted-foreground">{hp.department}</p>
                      </div>
                      <Badge variant="secondary" className="bg-[hsl(var(--chart-3)/0.15)] text-[hsl(var(--chart-3))] border-0 text-[9px]">
                        {hp.readinessTag}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mb-2 text-xs">
                      <span>Performance: <strong>{hp.performance}</strong></span>
                      <span>Potential: <strong>{hp.potential}</strong></span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{hp.summary}</p>
                    <div className="p-2 rounded bg-background/50 border border-border/50">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Development</p>
                      <p className="text-xs">{hp.developmentAction}</p>
                    </div>
                  </motion.div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Performers */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card className="border-[hsl(var(--intel-success)/0.2)] h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-[hsl(var(--intel-success))]">
                <Star className="w-4 h-4" />
                Top Performers
                <Badge variant="secondary" className="ml-auto bg-[hsl(var(--intel-success)/0.1)] text-[hsl(var(--intel-success))] border-0 text-[10px]">
                  {(analysis.topPerformers || []).length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
              {(!analysis.topPerformers || analysis.topPerformers.length === 0) ? (
                <p className="text-sm text-muted-foreground text-center py-4">No top performers identified</p>
              ) : (
                analysis.topPerformers.map((tp, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.05 }}
                    className="p-3 rounded-lg bg-[hsl(var(--intel-success)/0.05)] border border-[hsl(var(--intel-success)/0.1)]"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-semibold text-sm">{tp.employeeName}</p>
                        <p className="text-[10px] text-muted-foreground">{tp.department}</p>
                      </div>
                      <Badge variant="secondary" className="bg-[hsl(var(--intel-success)/0.15)] text-[hsl(var(--intel-success))] border-0 text-[9px]">
                        {tp.consistencyTag}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mb-2 text-xs">
                      <span>Self: <strong>{tp.selfReview?.toFixed(2)}</strong></span>
                      <span>Manager: <strong>{tp.managerReview?.toFixed(2)}</strong></span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{tp.summary}</p>
                    <div className="p-2 rounded bg-background/50 border border-border/50">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Retention</p>
                      <p className="text-xs">{tp.retentionAction}</p>
                    </div>
                  </motion.div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Strategic Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-4 h-4 text-primary" />
              Strategic P&C Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Immediate */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-destructive/15 flex items-center justify-center">
                    <Zap className="w-3 h-3 text-destructive" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Immediate</p>
                    <p className="text-[10px] text-muted-foreground">0–30 days</p>
                  </div>
                </div>
                {analysis.strategicRecommendations.immediate.map((rec, i) => (
                  <div key={i} className="p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                    <p className="text-xs font-medium mb-1">{rec.action}</p>
                    <p className="text-[10px] text-muted-foreground">{rec.rationale}</p>
                    {rec.owner && <Badge variant="outline" className="mt-2 text-[9px]">{rec.owner}</Badge>}
                  </div>
                ))}
              </div>

              {/* Medium Term */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-[hsl(var(--intel-warning)/0.15)] flex items-center justify-center">
                    <Clock className="w-3 h-3 text-[hsl(var(--intel-warning))]" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Medium Term</p>
                    <p className="text-[10px] text-muted-foreground">30–90 days</p>
                  </div>
                </div>
                {analysis.strategicRecommendations.mediumTerm.map((rec, i) => (
                  <div key={i} className="p-3 rounded-lg bg-[hsl(var(--intel-warning)/0.05)] border border-[hsl(var(--intel-warning)/0.1)]">
                    <p className="text-xs font-medium mb-1">{rec.action}</p>
                    <p className="text-[10px] text-muted-foreground">{rec.rationale}</p>
                    {rec.timeline && <Badge variant="outline" className="mt-2 text-[9px]">{rec.timeline}</Badge>}
                  </div>
                ))}
              </div>

              {/* Long Term */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-[hsl(var(--intel-success)/0.15)] flex items-center justify-center">
                    <TrendingUp className="w-3 h-3 text-[hsl(var(--intel-success))]" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Long Term</p>
                    <p className="text-[10px] text-muted-foreground">2026 & Beyond</p>
                  </div>
                </div>
                {analysis.strategicRecommendations.longTerm.map((rec, i) => (
                  <div key={i} className="p-3 rounded-lg bg-[hsl(var(--intel-success)/0.05)] border border-[hsl(var(--intel-success)/0.1)]">
                    <p className="text-xs font-medium mb-1">{rec.action}</p>
                    <p className="text-[10px] text-muted-foreground">{rec.rationale}</p>
                    {rec.impact && <Badge variant="outline" className="mt-2 text-[9px]">{rec.impact}</Badge>}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default AIAnalysisResults;
