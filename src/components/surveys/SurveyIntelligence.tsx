import { useState, useEffect, useRef, forwardRef, Component, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles, Loader2, TrendingUp, Users, AlertTriangle, ThumbsUp, ThumbsDown,
  Shield, Target, Brain, Building2, UserCheck, Minus, ChevronRight,
  BarChart3, MessageSquare, Zap, FileText, Download, Award, Eye, Star, ArrowUp
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadialBarChart, RadialBar
} from "recharts";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { Survey, SurveyResponse } from "@/types/surveys";

interface SurveyIntelligenceData {
  overall: {
    engagement_score: number;
    sentiment_distribution: { positive: number; neutral: number; negative: number };
    participation_quality: string;
    executive_summary: string;
    key_strengths: string[];
    major_concerns: string[];
    positive_negative_ratio: string;
  };
  question_insights: { question_text: string; average_score: number | null; sentiment: string; key_finding: string }[];
  department_insights: { department: string; avg_engagement: number; response_count: number; sentiment: string; key_concern: string; key_strength: string }[];
  employee_risk_signals: { name: string; department: string; risk_level: string; engagement_score: number; explanation: string; key_patterns: string[] }[];
  sentiment_analysis: {
    overall_sentiment: string;
    themes: { theme: string; sentiment: string; frequency: number; example_quotes: string[] }[];
    word_cloud_data: { text: string; value: number }[];
  };
  positive_signals: { name: string; department: string; insight: string; engagement_score: number }[];
  ai_recommendations: { priority: string; action: string; rationale: string; target_group: string }[];
  risk_summary: { total_green: number; total_yellow: number; total_red: number; departments_at_risk: string[]; top_risk_factors: string[] };
}

interface Props {
  survey: Survey;
  responses: SurveyResponse[];
  sessionToken: string;
}

// Error boundary to prevent blank page crashes
class IntelligenceErrorBoundary extends Component<{ children: ReactNode; onReset: () => void }, { hasError: boolean; error: string }> {
  state = { hasError: false, error: "" };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }
  componentDidCatch(error: Error) {
    console.error("SurveyIntelligence render error:", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-destructive/20">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-destructive" />
            <h3 className="text-base font-semibold mb-2">Dashboard Rendering Error</h3>
            <p className="text-sm text-muted-foreground mb-4">{this.state.error}</p>
            <Button onClick={() => { this.setState({ hasError: false, error: "" }); this.props.onReset(); }}>
              <Sparkles className="w-4 h-4 mr-1.5" /> Re-analyze
            </Button>
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 200, damping: 24 } },
};
const hoverLift = {
  whileHover: { y: -4, scale: 1.02, transition: { type: "spring" as const, stiffness: 400, damping: 20 } },
  whileTap: { scale: 0.98 },
};

const SENTIMENT_COLORS = {
  positive: { bg: "bg-intel-success-subtle", text: "text-intel-success", border: "border-intel-success/20", hex: "hsl(var(--intel-success))" },
  neutral: { bg: "bg-intel-warning-subtle", text: "text-intel-warning", border: "border-intel-warning/20", hex: "hsl(var(--intel-warning))" },
  negative: { bg: "bg-intel-danger-subtle", text: "text-intel-danger", border: "border-intel-danger/20", hex: "hsl(var(--intel-danger))" },
};

const RISK_CONFIG = {
  green: { bg: "bg-intel-success-subtle", text: "text-intel-success", border: "border-intel-success/20", hex: "hsl(var(--intel-success))", glow: "shadow-[0_0_12px_hsl(var(--intel-success)/0.15)]" },
  yellow: { bg: "bg-intel-warning-subtle", text: "text-intel-warning", border: "border-intel-warning/20", hex: "hsl(var(--intel-warning))", glow: "shadow-[0_0_12px_hsl(var(--intel-warning)/0.15)]" },
  red: { bg: "bg-intel-danger-subtle", text: "text-intel-danger", border: "border-intel-danger/20", hex: "hsl(var(--intel-danger))", glow: "shadow-[0_0_12px_hsl(var(--intel-danger)/0.15)]" },
};

const PRIORITY_CONFIG: Record<string, { bg: string; text: string; border: string; icon: any }> = {
  high: { bg: "bg-intel-danger-subtle", text: "text-intel-danger", border: "border-intel-danger/20", icon: AlertTriangle },
  medium: { bg: "bg-intel-warning-subtle", text: "text-intel-warning", border: "border-intel-warning/20", icon: Eye },
  low: { bg: "bg-intel-success-subtle", text: "text-intel-success", border: "border-intel-success/20", icon: ThumbsUp },
};

const PIE_COLORS_KEYS = ["--intel-success", "--intel-warning", "--intel-danger"];
const DEPT_GRADIENT = ["hsl(var(--intel-accent))", "hsl(217, 91%, 45%)"];

// Resolve HSL CSS variable to usable color string at render time
const resolveHSL = (varName: string) => {
  const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return val ? `hsl(${val})` : "#888";
};

// Fix: Use forwardRef to prevent Recharts ref warning that can cause render issues
const CustomTooltip = forwardRef<HTMLDivElement, any>(({ active, payload, label }, ref) => {
  if (!active || !payload?.length) return null;
  return (
    <div ref={ref} className="rounded-xl border border-intel-border bg-intel-card/95 backdrop-blur-xl px-4 py-3 shadow-2xl">
      {label && <p className="text-xs font-semibold text-intel-text-primary mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
          <span className="text-intel-text-secondary">{p.name}:</span>
          <span className="font-bold text-intel-text-primary">{p.value}</span>
        </div>
      ))}
    </div>
  );
});
CustomTooltip.displayName = "CustomTooltip";

const SurveyIntelligence = ({ survey, responses, sessionToken }: Props) => {
  const [intelligence, setIntelligence] = useState<SurveyIntelligenceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);

  const hasAutoRun = useRef(false);

  // Check for cached intelligence on mount
  useEffect(() => {
    if (responses.length > 0 && !hasAutoRun.current && !intelligence && !loading) {
      hasAutoRun.current = true;
      loadOrAnalyze();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responses]);

  const loadOrAnalyze = async () => {
    // Check cache from the separate intelligence table via admin proxy
    try {
      const { adminQuery } = await import("@/lib/adminQuery");
      const { data: cache } = await adminQuery(sessionToken, "select", "survey_intelligence_cache", {
        eq: { survey_id: survey.id },
        maybeSingle: true,
      });
      if (cache && cache.intelligence_response_count === responses.length && cache.cached_intelligence) {
        setIntelligence(cache.cached_intelligence as SurveyIntelligenceData);
        setIsCached(true);
        toast.success("Loaded cached analysis (no credits used)");
        return;
      }
    } catch {
      // No cache or error — proceed to fresh analysis
    }

    await runAnalysis();
  };

  const saveToCache = async (data: SurveyIntelligenceData) => {
    try {
      const { adminQuery } = await import("@/lib/adminQuery");
      await adminQuery(sessionToken, "upsert", "survey_intelligence_cache", {
        data: {
          survey_id: survey.id,
          cached_intelligence: data,
          intelligence_response_count: responses.length,
          intelligence_cached_at: new Date().toISOString(),
        },
        onConflict: "survey_id",
      });
    } catch (err) {
      if (import.meta.env.DEV) console.warn("[SurveyIntelligence] Failed to cache:", err);
    }
  };

  const runAnalysis = async () => {
    if (responses.length === 0) { toast.error("No responses to analyze"); return; }
    setLoading(true);
    setIsCached(false);
    setRenderError(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);
      
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/survey-intelligence`, {
        method: "POST",
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
          "x-session-token": sessionToken,
        },
        body: JSON.stringify({
          responses,
          questions: survey.questions || [],
          survey_title: survey.title,
          is_anonymous: survey.is_anonymous,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      
      if (res.status === 429) { toast.error("Rate limit exceeded. Try again later."); setLoading(false); return; }
      if (res.status === 402) { toast.error("AI credits exhausted."); setLoading(false); return; }
      if (!res.ok) { toast.error(`Analysis failed (status ${res.status})`); setLoading(false); return; }
      
      const json = await res.json();
      console.log("[SurveyIntelligence] Response received:", JSON.stringify(json).slice(0, 500));
      
      if (json.intelligence && !json.intelligence.error) {
        // Normalize data with safe defaults to prevent rendering crashes
        const raw = json.intelligence;
        const normalized: SurveyIntelligenceData = {
          overall: {
            engagement_score: Number(raw.overall?.engagement_score) || 0,
            sentiment_distribution: {
              positive: Number(raw.overall?.sentiment_distribution?.positive) || 0,
              neutral: Number(raw.overall?.sentiment_distribution?.neutral) || 0,
              negative: Number(raw.overall?.sentiment_distribution?.negative) || 0,
            },
            participation_quality: String(raw.overall?.participation_quality ?? "unknown"),
            executive_summary: String(raw.overall?.executive_summary ?? "No summary available."),
            key_strengths: Array.isArray(raw.overall?.key_strengths) ? raw.overall.key_strengths.filter(Boolean) : [],
            major_concerns: Array.isArray(raw.overall?.major_concerns) ? raw.overall.major_concerns.filter(Boolean) : [],
            positive_negative_ratio: String(raw.overall?.positive_negative_ratio ?? "N/A"),
          },
          question_insights: Array.isArray(raw.question_insights) ? raw.question_insights.map((qi: any) => ({
            question_text: String(qi?.question_text ?? ""),
            average_score: qi?.average_score != null ? Number(qi.average_score) : null,
            sentiment: String(qi?.sentiment ?? "neutral"),
            key_finding: String(qi?.key_finding ?? ""),
          })) : [],
          department_insights: Array.isArray(raw.department_insights) ? raw.department_insights.map((di: any) => ({
            department: String(di?.department ?? "Unknown"),
            avg_engagement: Number(di?.avg_engagement) || 0,
            response_count: Number(di?.response_count) || 0,
            sentiment: String(di?.sentiment ?? "neutral"),
            key_concern: String(di?.key_concern ?? "None"),
            key_strength: String(di?.key_strength ?? "None"),
          })) : [],
          employee_risk_signals: Array.isArray(raw.employee_risk_signals) ? raw.employee_risk_signals.map((e: any) => ({
            name: String(e?.name ?? "Unknown"),
            department: String(e?.department ?? "Unknown"),
            risk_level: String(e?.risk_level ?? "green"),
            engagement_score: Number(e?.engagement_score) || 0,
            explanation: String(e?.explanation ?? ""),
            key_patterns: Array.isArray(e?.key_patterns) ? e.key_patterns.filter(Boolean) : [],
          })) : [],
          sentiment_analysis: {
            overall_sentiment: String(raw.sentiment_analysis?.overall_sentiment ?? "neutral"),
            themes: Array.isArray(raw.sentiment_analysis?.themes) ? raw.sentiment_analysis.themes.map((t: any) => ({
              theme: String(t?.theme ?? ""),
              sentiment: String(t?.sentiment ?? "neutral"),
              frequency: Number(t?.frequency) || 0,
              example_quotes: Array.isArray(t?.example_quotes) ? t.example_quotes.filter(Boolean) : [],
            })) : [],
            word_cloud_data: Array.isArray(raw.sentiment_analysis?.word_cloud_data) ? raw.sentiment_analysis.word_cloud_data.map((w: any) => ({
              text: String(w?.text ?? ""),
              value: Number(w?.value) || 1,
            })) : [],
          },
          positive_signals: Array.isArray(raw.positive_signals) ? raw.positive_signals.map((p: any) => ({
            name: String(p?.name ?? "Unknown"),
            department: String(p?.department ?? "Unknown"),
            insight: String(p?.insight ?? ""),
            engagement_score: Number(p?.engagement_score) || 0,
          })) : [],
          ai_recommendations: Array.isArray(raw.ai_recommendations) ? raw.ai_recommendations.map((r: any) => ({
            priority: String(r?.priority ?? "medium"),
            action: String(r?.action ?? ""),
            rationale: String(r?.rationale ?? ""),
            target_group: String(r?.target_group ?? ""),
          })) : [],
          risk_summary: {
            total_green: Number(raw.risk_summary?.total_green) || 0,
            total_yellow: Number(raw.risk_summary?.total_yellow) || 0,
            total_red: Number(raw.risk_summary?.total_red) || 0,
            departments_at_risk: Array.isArray(raw.risk_summary?.departments_at_risk) ? raw.risk_summary.departments_at_risk.filter(Boolean) : [],
            top_risk_factors: Array.isArray(raw.risk_summary?.top_risk_factors) ? raw.risk_summary.top_risk_factors.filter(Boolean) : [],
          },
        };
        console.log("[SurveyIntelligence] Normalized data ready, setting state");
        setIntelligence(normalized);
        setIsCached(false);
        // Cache the result to avoid re-running
        saveToCache(normalized);
        toast.success("AI Intelligence analysis complete!");
      } else {
        const errorMsg = json.error || json.intelligence?.error || "Analysis failed";
        console.error("[SurveyIntelligence] Analysis error:", errorMsg);
        toast.error(errorMsg);
      }
    } catch (err: any) {
      console.error("[SurveyIntelligence] Fetch error:", err);
      if (err.name === "AbortError") {
        toast.error("Analysis timed out. Try again with fewer responses.");
      } else {
        toast.error(err.message || "Analysis failed");
      }
    }
    setLoading(false);
  };

  const exportPDF = () => {
    if (!intelligence) return;
    const d = intelligence;
    const doc = new jsPDF();
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 35, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text("Survey Intelligence Report", 14, 18);
    doc.setFontSize(10);
    doc.text(`${survey.title} | ${new Date().toLocaleDateString()}`, 14, 28);
    let y = 45;
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(14);
    doc.text("Executive Summary", 14, y); y += 8;
    doc.setFontSize(10);
    const summary = doc.splitTextToSize(d.overall.executive_summary, 180);
    doc.text(summary, 14, y); y += summary.length * 5 + 8;
    doc.text(`Engagement Score: ${d.overall.engagement_score}/10`, 14, y); y += 6;
    doc.text(`Sentiment: Positive ${d.overall.sentiment_distribution.positive} | Neutral ${d.overall.sentiment_distribution.neutral} | Negative ${d.overall.sentiment_distribution.negative}`, 14, y); y += 10;
    if (d.department_insights?.length) {
      doc.setFontSize(14); doc.text("Department Insights", 14, y); y += 4;
      autoTable(doc, { startY: y, head: [["Department", "Engagement", "Responses", "Sentiment", "Key Concern"]], body: d.department_insights.map(di => [di.department, `${di.avg_engagement}/10`, String(di.response_count), di.sentiment, di.key_concern]), styles: { fontSize: 8 }, headStyles: { fillColor: [15, 23, 42] } });
      y = (doc as any).lastAutoTable.finalY + 10;
    }
    if (d.employee_risk_signals?.length && !survey.is_anonymous) {
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFontSize(14); doc.text("Employee Risk Signals", 14, y); y += 4;
      autoTable(doc, { startY: y, head: [["Name", "Department", "Risk", "Score", "Explanation"]], body: d.employee_risk_signals.map(e => [e.name, e.department, e.risk_level.toUpperCase(), `${e.engagement_score}/10`, e.explanation]), styles: { fontSize: 8 }, headStyles: { fillColor: [15, 23, 42] } });
      y = (doc as any).lastAutoTable.finalY + 10;
    }
    if (d.ai_recommendations?.length) {
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFontSize(14); doc.text("AI Recommendations", 14, y); y += 4;
      autoTable(doc, { startY: y, head: [["Priority", "Action", "Rationale", "Target"]], body: d.ai_recommendations.map(r => [r.priority.toUpperCase(), r.action, r.rationale, r.target_group]), styles: { fontSize: 8 }, headStyles: { fillColor: [15, 23, 42] } });
    }
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(150); doc.text(`Powered by Lumofy AI | Page ${i}/${pageCount}`, 105, 290, { align: "center" }); }
    doc.save(`${survey.title}-intelligence-report.pdf`);
    toast.success("PDF report downloaded!");
  };

  const exportExcel = () => {
    if (!intelligence) return;
    const d = intelligence;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
      { Metric: "Engagement Score", Value: `${d.overall.engagement_score}/10` },
      { Metric: "Positive Responses", Value: d.overall.sentiment_distribution.positive },
      { Metric: "Neutral Responses", Value: d.overall.sentiment_distribution.neutral },
      { Metric: "Negative Responses", Value: d.overall.sentiment_distribution.negative },
      { Metric: "Participation Quality", Value: d.overall.participation_quality },
      { Metric: "Executive Summary", Value: d.overall.executive_summary },
    ]), "Overview");
    if (d.department_insights?.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(d.department_insights.map(di => ({ Department: di.department, "Avg Engagement": di.avg_engagement, Responses: di.response_count, Sentiment: di.sentiment, "Key Concern": di.key_concern, "Key Strength": di.key_strength }))), "Departments");
    if (d.employee_risk_signals?.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(d.employee_risk_signals.map(e => ({ Name: e.name, Department: e.department, "Risk Level": e.risk_level, "Engagement Score": e.engagement_score, Explanation: e.explanation }))), "Risk Signals");
    if (d.ai_recommendations?.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(d.ai_recommendations.map(r => ({ Priority: r.priority, Action: r.action, Rationale: r.rationale, "Target Group": r.target_group }))), "Recommendations");
    XLSX.writeFile(wb, `${survey.title}-intelligence.xlsx`);
    toast.success("Excel report downloaded!");
  };

  // ─── PRE-ANALYSIS STATE ───
  if (!intelligence) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
        className="relative"
      >
        <Card className="relative overflow-hidden border-primary/20 bg-card">
          {/* Animated gradient bg */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-primary/[0.03]" />
          <motion.div
            className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-primary/[0.08] blur-3xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-primary/[0.06] blur-3xl"
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />

          <CardContent className="relative z-10 py-16 text-center">
            <motion.div
              className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center backdrop-blur-sm border border-primary/10"
              animate={loading
                ? { rotate: [0, 360], borderRadius: ["24%", "50%", "24%"] }
                : { scale: [1, 1.08, 1], rotate: [0, 5, -5, 0] }
              }
              transition={loading
                ? { duration: 2, repeat: Infinity, ease: "linear" }
                : { duration: 3, repeat: Infinity, ease: "easeInOut" }
              }
            >
              {loading
                ? <Loader2 className="w-9 h-9 text-primary animate-spin" />
                : <Brain className="w-9 h-9 text-primary" />
              }
            </motion.div>

            <motion.h3
              className="text-2xl font-bold mb-3 tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {loading ? "Analyzing Intelligence..." : "AI Survey Intelligence"}
            </motion.h3>

            <motion.p
              className="text-sm text-muted-foreground mb-8 max-w-lg mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {loading
                ? "Lumofy AI is processing all responses, detecting engagement patterns, risk signals, and generating actionable recommendations..."
                : "Transform survey data into strategic HR insights. Analyze engagement, detect risk signals, and get AI-powered recommendations."}
            </motion.p>

            {loading ? (
              <motion.div
                className="max-w-sm mx-auto space-y-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="relative overflow-hidden rounded-full h-2 bg-secondary">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-primary/80 to-primary rounded-full"
                    animate={{ width: ["0%", "100%"] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>
                <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
                  {["Parsing responses", "Detecting patterns", "Generating insights"].map((step, i) => (
                    <motion.span
                      key={step}
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.6 }}
                      className="flex items-center gap-1"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {step}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Button
                  onClick={runAnalysis}
                  size="lg"
                  className="gap-2.5 px-8 py-6 text-base font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
                  disabled={responses.length === 0}
                >
                  <Sparkles className="w-5 h-5" />
                  Analyze with Lumofy AI
                </Button>
                <p className="text-xs text-muted-foreground mt-4">{responses.length} responses ready for analysis</p>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // ─── DATA PREP ───
  const d = intelligence;
  const sentimentData = [
    { name: "Positive", value: d.overall.sentiment_distribution.positive },
    { name: "Neutral", value: d.overall.sentiment_distribution.neutral },
    { name: "Negative", value: d.overall.sentiment_distribution.negative },
  ];
  const riskData = [
    { name: "Safe", value: d.risk_summary?.total_green || 0 },
    { name: "Monitor", value: d.risk_summary?.total_yellow || 0 },
    { name: "At Risk", value: d.risk_summary?.total_red || 0 },
  ];
  const deptChartData = (d.department_insights || []).map(di => ({
    name: di.department.length > 14 ? di.department.slice(0, 14) + "…" : di.department,
    engagement: di.avg_engagement,
    responses: di.response_count,
  }));
  const engagementPct = (d.overall.engagement_score / 10) * 100;
  const engagementColor = d.overall.engagement_score >= 7 ? resolveHSL("--intel-success") : d.overall.engagement_score >= 5 ? resolveHSL("--intel-warning") : resolveHSL("--intel-danger");
  const radialData = [{ name: "Score", value: engagementPct, fill: engagementColor }];
  const PIE_COLORS = PIE_COLORS_KEYS.map(k => resolveHSL(k));

  // ─── ANALYSIS DASHBOARD ───
  return (
    <motion.div
      key="intelligence-dashboard"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
    >
      {/* ─── HEADER BAR ─── */}
      <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <motion.div
            className="p-2.5 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10"
            whileHover={{ rotate: 15, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <Sparkles className="w-5 h-5 text-primary" />
          </motion.div>
          <div>
            <h3 className="text-lg font-bold tracking-tight">AI Survey Intelligence</h3>
            <p className="text-xs text-muted-foreground">{survey.title} • {responses.length} responses analyzed</p>
          </div>
        </div>
        <div className="flex gap-2">
          {[
            { label: "PDF Report", icon: FileText, fn: exportPDF },
            { label: "Excel", icon: Download, fn: exportExcel },
          ].map((btn) => (
            <motion.div key={btn.label} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="outline" size="sm" onClick={btn.fn} className="gap-1.5 rounded-xl border-border hover:border-primary/30 hover:bg-primary/5 transition-all duration-200">
                <btn.icon className="w-3.5 h-3.5" /> {btn.label}
              </Button>
            </motion.div>
          ))}
          {isCached && (
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-lg border-intel-accent/30 text-intel-accent bg-intel-accent/5">
              Cached · No credits used
            </Badge>
          )}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button variant="ghost" size="sm" onClick={runAnalysis} disabled={loading} className="gap-1.5 rounded-xl hover:bg-primary/5 transition-all duration-200">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} {isCached ? "Re-analyze (uses credits)" : "Re-analyze"}
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* ─── KPI CARDS ─── */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Engagement", value: `${d.overall.engagement_score}/10`, icon: TrendingUp, color: d.overall.engagement_score >= 7 ? "text-intel-success" : d.overall.engagement_score >= 5 ? "text-intel-warning" : "text-intel-danger", bgColor: d.overall.engagement_score >= 7 ? "bg-intel-success-subtle" : d.overall.engagement_score >= 5 ? "bg-intel-warning-subtle" : "bg-intel-danger-subtle" },
          { label: "Positive", value: d.overall.sentiment_distribution.positive, icon: ThumbsUp, color: "text-intel-success", bgColor: "bg-intel-success-subtle" },
          { label: "At Risk", value: d.risk_summary?.total_red || 0, icon: AlertTriangle, color: "text-intel-danger", bgColor: "bg-intel-danger-subtle" },
          { label: "Departments", value: d.department_insights?.length || 0, icon: Building2, color: "text-intel-accent", bgColor: "bg-intel-accent-subtle" },
          { label: "Quality", value: d.overall.participation_quality, icon: Zap, color: "text-intel-warning", bgColor: "bg-intel-warning-subtle" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            variants={itemVariants}
            {...hoverLift}
          >
            <Card className="border-border/50 bg-card hover:border-primary/20 transition-all duration-300 cursor-default overflow-hidden group">
              <CardContent className="p-5 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent to-primary/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10 flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${stat.bgColor} ${stat.color} transition-transform duration-300 group-hover:scale-110`}>
                    <stat.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">{stat.label}</p>
                    <p className="text-2xl font-bold capitalize tracking-tight">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* ─── EXECUTIVE SUMMARY ─── */}
      <motion.div variants={itemVariants} {...hoverLift}>
        <Card className="border-primary/10 overflow-hidden group hover:border-primary/25 transition-all duration-300">
          <div className="h-1 bg-gradient-to-r from-primary via-primary/60 to-transparent" />
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <motion.div
                className="p-3 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 shrink-0"
                whileHover={{ rotate: 10 }}
                transition={{ type: "spring" }}
              >
                <Brain className="w-6 h-6 text-primary" />
              </motion.div>
              <div className="space-y-3 flex-1">
                <h4 className="text-base font-bold tracking-tight">Executive Summary</h4>
                <p className="text-sm text-foreground/80 leading-relaxed">{d.overall.executive_summary}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {d.overall.key_strengths?.map((s, i) => (
                    <motion.div key={`s-${i}`} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.05 }}>
                      <Badge className="bg-intel-success-subtle text-intel-success border border-intel-success/20 text-[10px] gap-1 hover:bg-intel-success/10 transition-colors cursor-default">
                        <ThumbsUp className="w-2.5 h-2.5" />{s}
                      </Badge>
                    </motion.div>
                  ))}
                  {d.overall.major_concerns?.map((c, i) => (
                    <motion.div key={`c-${i}`} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 + i * 0.05 }}>
                      <Badge className="bg-intel-warning-subtle text-intel-warning border border-intel-warning/20 text-[10px] gap-1 hover:bg-intel-warning/10 transition-colors cursor-default">
                        <AlertTriangle className="w-2.5 h-2.5" />{c}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── TABS ─── */}
      <motion.div variants={itemVariants}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap h-auto gap-1 bg-intel-tab-bg/60 backdrop-blur-sm p-1.5 rounded-2xl border border-intel-border/50">
            {[
              { id: "overview", label: "Overview", icon: BarChart3 },
              { id: "departments", label: "Departments", icon: Building2 },
              { id: "risk", label: "Risk Signals", icon: AlertTriangle },
              { id: "positive", label: "Champions", icon: Award },
              { id: "sentiment", label: "Sentiment", icon: MessageSquare },
              { id: "actions", label: "Actions", icon: Target },
            ].map(tab => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="gap-1.5 text-xs rounded-xl data-[state=active]:bg-intel-tab-active data-[state=active]:shadow-sm data-[state=active]:border-intel-border/50 transition-all duration-200 px-4 py-2.5"
              >
                <tab.icon className="w-3.5 h-3.5" />{tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ═══ OVERVIEW TAB ═══ */}
          <TabsContent value="overview" className="mt-6">
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Engagement Radial */}
                <motion.div variants={itemVariants} {...hoverLift}>
                  <Card className="border-border/50 hover:border-primary/20 transition-all duration-300 h-full">
                    <CardContent className="p-6 flex flex-col items-center justify-center">
                      <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Engagement Score</h5>
                      <div className="h-44 w-44 relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadialBarChart innerRadius="70%" outerRadius="100%" data={radialData} startAngle={180} endAngle={0} barSize={12}>
                            <RadialBar dataKey="value" cornerRadius={10} background={{ fill: "hsl(var(--secondary))" }} />
                          </RadialBarChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
                          <span className="text-4xl font-bold tracking-tighter" style={{ color: engagementColor }}>{d.overall.engagement_score}</span>
                          <span className="text-xs text-muted-foreground font-medium">/10</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        {d.overall.positive_negative_ratio && `Positive:Negative ${d.overall.positive_negative_ratio}`}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Sentiment Distribution - Donut */}
                <motion.div variants={itemVariants} {...hoverLift}>
                  <Card className="border-border/50 hover:border-primary/20 transition-all duration-300 h-full">
                    <CardContent className="p-6">
                      <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Sentiment Distribution</h5>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={sentimentData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} strokeWidth={3} stroke="hsl(var(--card))">
                              {sentimentData.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx]} />)}
                            </Pie>
                            <RechartsTooltip content={<CustomTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex justify-center gap-4 mt-2">
                        {sentimentData.map((s, i) => (
                          <div key={s.name} className="flex items-center gap-1.5 text-xs">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                            <span className="text-muted-foreground">{s.name}</span>
                            <span className="font-bold">{s.value}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Risk Distribution - Donut */}
                <motion.div variants={itemVariants} {...hoverLift}>
                  <Card className="border-border/50 hover:border-primary/20 transition-all duration-300 h-full">
                    <CardContent className="p-6">
                      <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Risk Distribution</h5>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={riskData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} strokeWidth={3} stroke="hsl(var(--card))">
                              {riskData.map((_, idx) => <Cell key={idx} fill={[RISK_CONFIG.green.hex, RISK_CONFIG.yellow.hex, RISK_CONFIG.red.hex][idx]} />)}
                            </Pie>
                            <RechartsTooltip content={<CustomTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex justify-center gap-4 mt-2">
                        {riskData.map((r, i) => (
                          <div key={r.name} className="flex items-center gap-1.5 text-xs">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: [RISK_CONFIG.green.hex, RISK_CONFIG.yellow.hex, RISK_CONFIG.red.hex][i] }} />
                            <span className="text-muted-foreground">{r.name}</span>
                            <span className="font-bold">{r.value}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Question Insights */}
              {d.question_insights?.length > 0 && (
                <motion.div variants={itemVariants}>
                  <Card className="border-border/50">
                    <CardContent className="p-6">
                      <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-5">Question-by-Question Insights</h5>
                      <div className="space-y-3">
                        {d.question_insights.map((qi, i) => {
                          const sc = SENTIMENT_COLORS[qi.sentiment as keyof typeof SENTIMENT_COLORS] || SENTIMENT_COLORS.neutral;
                          return (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -12 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.04, type: "spring", stiffness: 200 }}
                              whileHover={{ x: 4, backgroundColor: "hsl(var(--secondary) / 0.5)" }}
                              className="flex items-start gap-4 p-4 rounded-xl border border-border/50 bg-card/50 transition-all duration-200 cursor-default group"
                            >
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${sc.bg} ${sc.text} transition-transform duration-200 group-hover:scale-110`}>
                                {qi.average_score !== null
                                  ? <span className="text-sm font-bold">{qi.average_score}</span>
                                  : <MessageSquare className="w-4 h-4" />
                                }
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium leading-snug">{qi.question_text}</p>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{qi.key_finding}</p>
                              </div>
                              <Badge variant="outline" className={`text-[10px] shrink-0 ${sc.text} ${sc.border} rounded-lg`}>{qi.sentiment}</Badge>
                            </motion.div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          </TabsContent>

          {/* ═══ DEPARTMENTS TAB ═══ */}
          <TabsContent value="departments" className="mt-6">
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
              {deptChartData.length > 0 && (
                <motion.div variants={itemVariants} {...hoverLift}>
                  <Card className="border-border/50 hover:border-primary/20 transition-all duration-300">
                    <CardContent className="p-6">
                      <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-5">Department Engagement Comparison</h5>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={deptChartData} barSize={32}>
                            <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: "'Space Grotesk', sans-serif" }} axisLine={false} tickLine={false} />
                            <YAxis domain={[0, 10]} tick={{ fontSize: 11, fontFamily: "'Space Grotesk', sans-serif" }} axisLine={false} tickLine={false} />
                            <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--secondary) / 0.3)", radius: 8 }} />
                            <defs>
                              <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="hsl(217, 91%, 60%)" />
                                <stop offset="100%" stopColor="hsl(217, 91%, 45%)" />
                              </linearGradient>
                            </defs>
                            <Bar dataKey="engagement" fill="url(#engGrad)" radius={[8, 8, 4, 4]} name="Engagement" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(d.department_insights || []).map((di, i) => {
                  const sc = SENTIMENT_COLORS[di.sentiment as keyof typeof SENTIMENT_COLORS] || SENTIMENT_COLORS.neutral;
                  return (
                    <motion.div key={i} variants={itemVariants} {...hoverLift}>
                      <Card className="border-border/50 hover:border-primary/20 transition-all duration-300 h-full group overflow-hidden">
                        <div className={`h-1 bg-gradient-to-r ${di.sentiment === "positive" ? "from-intel-success to-intel-success/70" : di.sentiment === "negative" ? "from-intel-danger to-intel-danger/70" : "from-intel-warning to-intel-warning/70"}`} />
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                              <motion.div
                                className="p-2 rounded-xl bg-primary/10"
                                whileHover={{ rotate: 10 }}
                                transition={{ type: "spring" }}
                              >
                                <Building2 className="w-4 h-4 text-primary" />
                              </motion.div>
                              <h4 className="text-sm font-bold tracking-tight">{di.department}</h4>
                            </div>
                            <Badge className={`${sc.bg} ${sc.text} border ${sc.border} text-[10px] rounded-lg`}>{di.sentiment}</Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="p-3 rounded-xl bg-secondary/40 text-center group-hover:bg-secondary/60 transition-colors">
                              <p className="text-xl font-bold tracking-tight">{di.avg_engagement}<span className="text-xs text-muted-foreground font-normal">/10</span></p>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Engagement</p>
                            </div>
                            <div className="p-3 rounded-xl bg-secondary/40 text-center group-hover:bg-secondary/60 transition-colors">
                              <p className="text-xl font-bold tracking-tight">{di.response_count}</p>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Responses</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {di.key_strength && di.key_strength !== "None" && (
                              <p className="text-xs text-intel-success flex items-start gap-1.5 leading-relaxed">
                                <ThumbsUp className="w-3 h-3 mt-0.5 shrink-0" />{di.key_strength}
                              </p>
                            )}
                            {di.key_concern && di.key_concern !== "None" && (
                              <p className="text-xs text-intel-warning flex items-start gap-1.5 leading-relaxed">
                                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />{di.key_concern}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </TabsContent>

          {/* ═══ RISK SIGNALS TAB ═══ */}
          <TabsContent value="risk" className="mt-6">
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
              {d.risk_summary && (
                <motion.div variants={itemVariants}>
                  <Card className="border-intel-danger/10 overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-intel-success via-intel-warning to-intel-danger" />
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="p-2.5 rounded-xl bg-intel-danger-subtle">
                          <Shield className="w-5 h-5 text-intel-danger" />
                        </div>
                        <h4 className="text-base font-bold tracking-tight">Risk Summary</h4>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mb-5">
                        {[
                          { label: "Safe", count: d.risk_summary.total_green, config: RISK_CONFIG.green },
                          { label: "Monitor", count: d.risk_summary.total_yellow, config: RISK_CONFIG.yellow },
                          { label: "At Risk", count: d.risk_summary.total_red, config: RISK_CONFIG.red },
                        ].map((r, i) => (
                          <motion.div
                            key={i}
                            whileHover={{ scale: 1.05, y: -2 }}
                            className={`p-4 rounded-2xl border ${r.config.bg} ${r.config.border} text-center transition-all duration-200 cursor-default`}
                          >
                            <p className={`text-3xl font-bold ${r.config.text} tracking-tight`}>{r.count}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{r.label}</p>
                          </motion.div>
                        ))}
                      </div>
                      {d.risk_summary.top_risk_factors?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold mb-2 tracking-wide">Top Risk Factors</p>
                          <div className="flex flex-wrap gap-2">
                            {d.risk_summary.top_risk_factors.map((f, i) => (
                              <motion.div key={i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                                <Badge variant="outline" className="text-[10px] text-intel-danger border-intel-danger/30 rounded-lg hover:bg-intel-danger-subtle transition-colors cursor-default">{f}</Badge>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              <div className="flex items-center gap-2.5 mb-1">
                <AlertTriangle className="w-4 h-4 text-intel-danger" />
                <h4 className="text-sm font-bold tracking-tight">Employee Risk Signals</h4>
              </div>

              <div className="space-y-3">
                {(d.employee_risk_signals || [])
                  .sort((a, b) => {
                    const order = { red: 0, yellow: 1, green: 2 };
                    return (order[a.risk_level as keyof typeof order] ?? 2) - (order[b.risk_level as keyof typeof order] ?? 2);
                  })
                  .map((emp, i) => {
                    const rc = RISK_CONFIG[emp.risk_level as keyof typeof RISK_CONFIG] || RISK_CONFIG.green;
                    return (
                      <motion.div key={i} variants={itemVariants} {...hoverLift}>
                        <Card className={`border-l-4 ${rc.border} border-border/50 hover:shadow-lg ${rc.glow} transition-all duration-300 overflow-hidden group`}>
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <motion.div
                                  className={`w-10 h-10 rounded-xl ${rc.bg} flex items-center justify-center transition-transform duration-200 group-hover:scale-110`}
                                  whileHover={{ rotate: 5 }}
                                >
                                  <span className={`text-sm font-bold ${rc.text}`}>{(emp.name || "?")[0]}</span>
                                </motion.div>
                                <div>
                                  <p className="text-sm font-bold tracking-tight">{emp.name}</p>
                                  <p className="text-[11px] text-muted-foreground">{emp.department}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2.5">
                                <span className="text-lg font-bold tracking-tight">{emp.engagement_score}<span className="text-xs text-muted-foreground font-normal">/10</span></span>
                                <Badge className={`${rc.bg} ${rc.text} border ${rc.border} text-[10px] rounded-lg font-bold`}>{emp.risk_level.toUpperCase()}</Badge>
                              </div>
                            </div>
                            <p className="text-xs text-foreground/75 leading-relaxed mb-3">{emp.explanation}</p>
                            {emp.key_patterns?.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {emp.key_patterns.map((p, pi) => (
                                  <Badge key={pi} variant="secondary" className="text-[9px] rounded-lg hover:bg-secondary/80 transition-colors cursor-default">{p}</Badge>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
              </div>
            </motion.div>
          </TabsContent>

          {/* ═══ CHAMPIONS TAB ═══ */}
          <TabsContent value="positive" className="mt-6">
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
              <div className="flex items-center gap-2.5">
                <Award className="w-4 h-4 text-intel-success" />
                <h4 className="text-sm font-bold tracking-tight">Culture Champions</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(d.positive_signals || []).map((emp, i) => (
                  <motion.div key={i} variants={itemVariants} {...hoverLift}>
                    <Card className="border-intel-success/10 hover:border-intel-success/30 transition-all duration-300 overflow-hidden group">
                      <div className="h-1 bg-gradient-to-r from-intel-success to-intel-success/70" />
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <motion.div
                              className="w-10 h-10 rounded-xl bg-intel-success-subtle flex items-center justify-center group-hover:scale-110 transition-transform"
                              whileHover={{ rotate: 10 }}
                            >
                              <Star className="w-4 h-4 text-intel-success" />
                            </motion.div>
                            <div>
                              <p className="text-sm font-bold tracking-tight">{emp.name}</p>
                              <p className="text-[11px] text-muted-foreground">{emp.department}</p>
                            </div>
                          </div>
                          <Badge className="bg-intel-success-subtle text-intel-success border border-intel-success/20 text-[10px] rounded-lg font-bold">
                            {emp.engagement_score}/10
                          </Badge>
                        </div>
                        <p className="text-xs text-foreground/75 leading-relaxed">{emp.insight}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </TabsContent>

          {/* ═══ SENTIMENT TAB ═══ */}
          <TabsContent value="sentiment" className="mt-6">
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
              <motion.div variants={itemVariants}>
                <Card className="border-border/50">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2.5 rounded-xl bg-primary/10">
                        <MessageSquare className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h5 className="text-base font-bold tracking-tight">Sentiment Analysis</h5>
                        <p className="text-xs text-muted-foreground capitalize">Overall: {d.sentiment_analysis?.overall_sentiment}</p>
                      </div>
                    </div>

                    {/* Themes */}
                    <h6 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">Detected Themes</h6>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                      {(d.sentiment_analysis?.themes || []).map((theme, i) => {
                        const sc = SENTIMENT_COLORS[theme.sentiment as keyof typeof SENTIMENT_COLORS] || SENTIMENT_COLORS.neutral;
                        return (
                          <motion.div
                            key={i}
                            variants={itemVariants}
                            whileHover={{ scale: 1.02, y: -2 }}
                            className={`p-4 rounded-xl border ${sc.border} ${sc.bg} transition-all duration-200 cursor-default group`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold tracking-tight">{theme.theme}</span>
                              <div className="flex items-center gap-1.5">
                                <Badge variant="secondary" className="text-[9px] rounded-lg">{theme.frequency}x</Badge>
                                <Badge className={`${sc.bg} ${sc.text} border ${sc.border} text-[9px] rounded-lg`}>{theme.sentiment}</Badge>
                              </div>
                            </div>
                            {theme.example_quotes?.length > 0 && (
                              <p className="text-[11px] text-muted-foreground italic leading-relaxed mt-1.5">"{theme.example_quotes[0]}"</p>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Word Cloud */}
                    {d.sentiment_analysis?.word_cloud_data?.length > 0 && (
                      <div>
                        <h6 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-4">Key Terms</h6>
                        <div className="flex flex-wrap gap-2 items-center justify-center p-6 rounded-2xl bg-secondary/30 border border-border/30">
                          {d.sentiment_analysis.word_cloud_data.slice(0, 24).map((w, i) => {
                            const scale = w.value >= 5 ? 1.4 : w.value >= 3 ? 1.1 : 0.85;
                            const opacity = w.value >= 5 ? 1 : w.value >= 3 ? 0.8 : 0.55;
                            return (
                              <motion.span
                                key={i}
                                initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
                                animate={{ opacity, scale, rotate: 0 }}
                                transition={{ delay: i * 0.03, type: "spring", stiffness: 200 }}
                                whileHover={{ scale: scale * 1.2, color: "hsl(217, 91%, 60%)" }}
                                className="px-3 py-1.5 rounded-xl bg-primary/[0.06] border border-primary/10 font-semibold text-foreground/80 cursor-default transition-colors duration-200"
                                style={{ fontSize: `${Math.max(11, 11 * scale)}px` }}
                              >
                                {w.text}
                              </motion.span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </TabsContent>

          {/* ═══ RECOMMENDATIONS TAB ═══ */}
          <TabsContent value="actions" className="mt-6">
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
              <div className="flex items-center gap-2.5">
                <Target className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-bold tracking-tight">AI Recommendations</h4>
              </div>
              <div className="space-y-3">
                {(d.ai_recommendations || []).map((rec, i) => {
                  const pc = PRIORITY_CONFIG[rec.priority] || PRIORITY_CONFIG.medium;
                  const PIcon = pc.icon;
                  return (
                    <motion.div key={i} variants={itemVariants} {...hoverLift}>
                      <Card className="border-border/50 hover:border-primary/20 transition-all duration-300 group overflow-hidden">
                        <CardContent className="p-5">
                          <div className="flex items-start gap-4">
                            <motion.div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${pc.bg} ${pc.text} transition-transform duration-200 group-hover:scale-110`}
                              whileHover={{ rotate: 10 }}
                            >
                              <PIcon className="w-4 h-4" />
                            </motion.div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2.5 mb-1.5">
                                <p className="text-sm font-bold tracking-tight">{rec.action}</p>
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed mb-2">{rec.rationale}</p>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[9px] rounded-lg">{rec.target_group}</Badge>
                                <Badge className={`${pc.bg} ${pc.text} border ${pc.border} text-[9px] rounded-lg font-bold`}>{rec.priority.toUpperCase()}</Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
};

const SurveyIntelligenceWrapper = (props: Props) => {
  const [resetKey, setResetKey] = useState(0);
  return (
    <IntelligenceErrorBoundary
      key={resetKey}
      onReset={() => setResetKey(k => k + 1)}
    >
      <SurveyIntelligence {...props} />
    </IntelligenceErrorBoundary>
  );
};

export default SurveyIntelligenceWrapper;
