import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, TrendingUp, TrendingDown, AlertTriangle, BarChart3, Brain,
  Download, ChevronDown, ChevronRight, Filter, Eye, ArrowLeft,
  Sparkles, Target, CheckCircle2, XCircle, Info, Loader2,
  FileText, FileSpreadsheet, ToggleLeft, Activity, Shield,
  Gauge, Crown, AlertCircle, Zap, PieChart, GitCompareArrows
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import AnimatedCounter from "@/components/careers/AnimatedCounter";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Line, ComposedChart, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ReferenceLine
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useCareers } from "@/contexts/CareersContext";
import { exportBellCurvePDF } from "@/utils/bellCurveReportPdf";
import { exportBellCurveExcel } from "@/utils/bellCurveReportExcel";
import GapAnalysis from "@/components/careers/bellcurve/GapAnalysis";
import ForcedDistribution from "@/components/careers/bellcurve/ForcedDistribution";
import PeerBenchmarking from "@/components/careers/bellcurve/PeerBenchmarking";
import DrillDownModal from "@/components/careers/bellcurve/DrillDownModal";
import ReviewCycleComparison from "@/components/careers/bellcurve/ReviewCycleComparison";
import AIRecommendations from "@/components/careers/bellcurve/AIRecommendations";
import DepartmentHeatmap from "@/components/careers/bellcurve/DepartmentHeatmap";
import CalibrationSession from "@/components/careers/bellcurve/CalibrationSession";
import DistributionOverlay from "@/components/careers/bellcurve/DistributionOverlay";
import BiasDetection from "@/components/careers/bellcurve/BiasDetection";
import WhatIfSimulator from "@/components/careers/bellcurve/WhatIfSimulator";
import CalibrationMinutes from "@/components/careers/bellcurve/CalibrationMinutes";
import ManagerAccountability from "@/components/careers/bellcurve/ManagerAccountability";
import CorrelationDashboard from "@/components/careers/bellcurve/CorrelationDashboard";
import PercentileRanking from "@/components/careers/bellcurve/PercentileRanking";

// ─── Types ─────────────────────────────────────────────
interface EmployeeRecord {
  employeeName: string;
  email?: string;
  department: string;
  departmentGroup?: string;
  jobTitle: string;
  lineManager: string;
  selfRating: number | null;
  managerRating: number | null;
  potentialScore: string | null;
  functionHeadNotes: string;
  performanceComments: string;
  reviewStatus: string;
  [key: string]: any;
}

interface BellCurveCalibrationProps {
  employees: EmployeeRecord[];
  onBack: () => void;
}

interface RatingBand {
  id: string;
  label: string;
  shortLabel: string;
  range: string;
  min: number;
  max: number;
  interpretation: string;
}

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

type RatingSource = "final" | "manager" | "self" | "gap";

const RATING_BANDS: RatingBand[] = [
  { id: "critical", label: "Critical Low", shortLabel: "Critical", range: "1.00 – 1.99", min: 1.0, max: 1.99, interpretation: "Critical low-performance cluster requiring immediate intervention" },
  { id: "below", label: "Below Expectations", shortLabel: "Below", range: "2.00 – 2.99", min: 2.0, max: 2.99, interpretation: "Below expectations — development plans recommended" },
  { id: "core", label: "Meets Expectations", shortLabel: "Meets", range: "3.00 – 3.49", min: 3.0, max: 3.49, interpretation: "Core performance population — solid contributors" },
  { id: "above", label: "Exceeds Expectations", shortLabel: "Exceeds", range: "3.50 – 3.99", min: 3.5, max: 3.99, interpretation: "Above expectations — strong performers" },
  { id: "top", label: "Top Performers", shortLabel: "Top", range: "4.00 – 5.00", min: 4.0, max: 5.0, interpretation: "Top performer band — high-impact talent" },
];

const BAND_COLORS = ["#ef4444", "#f97316", "#3b82f6", "#10b981", "#8b5cf6"];
const BAND_GRADIENTS = [
  "from-red-500/20 to-red-500/5",
  "from-orange-500/20 to-orange-500/5",
  "from-blue-500/20 to-blue-500/5",
  "from-emerald-500/20 to-emerald-500/5",
  "from-violet-500/20 to-violet-500/5",
];

const EXPECTED_DISTRIBUTION = { critical: 5, below: 10, core: 55, above: 20, top: 10 };

// ─── Helpers ───────────────────────────────────────────
function getRating(emp: EmployeeRecord, source: RatingSource): number | null {
  if (source === "final") return emp.managerRating ?? emp.selfRating;
  if (source === "manager") return emp.managerRating;
  if (source === "self") return emp.selfRating;
  if (source === "gap") {
    if (emp.selfRating !== null && emp.managerRating !== null) return emp.selfRating - emp.managerRating;
    return null;
  }
  return null;
}

function getManagerFlag(avgRating: number, spread: number, count: number, distribution: Record<string, number>): { flag: string; color: string; bg: string } {
  if (count < 3) return { flag: "Insufficient Sample", color: "text-muted-foreground", bg: "bg-muted" };
  const topPct = ((distribution.above || 0) + (distribution.top || 0)) / count * 100;
  if (topPct > 70) return { flag: "Rating Inflation Risk", color: "text-destructive", bg: "bg-destructive/10" };
  if (spread < 0.3 && count >= 5) return { flag: "Rating Compression", color: "text-amber-400", bg: "bg-amber-500/10" };
  if (avgRating < 2.5) return { flag: "High Strictness", color: "text-orange-400", bg: "bg-orange-500/10" };
  return { flag: "Balanced", color: "text-emerald-400", bg: "bg-emerald-500/10" };
}

function getCalibrationHealthScore(kpis: any, managerAnalysis: ManagerAnalysis[], deptAnalysis: any[]): number {
  let score = 100;
  if (kpis.highPerfPct > 35) score -= 15;
  if (kpis.lowPerfPct < 2 && kpis.totalReviewed > 15) score -= 10;
  if (kpis.meetsExpPct > 70) score -= 10;
  const inflationCount = managerAnalysis.filter(m => m.flag === "Rating Inflation Risk").length;
  const compressionCount = managerAnalysis.filter(m => m.flag === "Rating Compression").length;
  score -= inflationCount * 8;
  score -= compressionCount * 5;
  const inflatedDepts = deptAnalysis.filter(d => d.riskFlag === "Inflation Signal").length;
  score -= inflatedDepts * 7;
  return Math.max(0, Math.min(100, score));
}

// ─── Stagger animation variants ────────────────────────
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } } };

// ─── Component ─────────────────────────────────────────
const BellCurveCalibration = ({ employees, onBack }: BellCurveCalibrationProps) => {
  const { sessionToken } = useCareers();
  const [ratingSource, setRatingSource] = useState<RatingSource>("final");
  const [filterDept, setFilterDept] = useState("all");
  const [filterManager, setFilterManager] = useState("all");
  const [selectedBand, setSelectedBand] = useState<string | null>(null);
  const [showExpected, setShowExpected] = useState(true);
  const [activeSection, setActiveSection] = useState<"overview" | "departments" | "managers" | "gap" | "forced" | "benchmarking" | "comparison" | "insights" | "heatmap" | "session" | "overlay" | "bias" | "whatif" | "minutes" | "accountability" | "correlation" | "percentile">("overview");
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [hoveredBand, setHoveredBand] = useState<string | null>(null);

  const departments = useMemo(() => [...new Set(employees.map(e => e.department).filter(Boolean))].sort(), [employees]);
  const managers = useMemo(() => [...new Set(employees.map(e => e.lineManager).filter(Boolean))].sort(), [employees]);

  const filtered = useMemo(() => {
    let result = employees;
    if (filterDept !== "all") result = result.filter(e => e.department === filterDept);
    if (filterManager !== "all") result = result.filter(e => e.lineManager === filterManager);
    return result;
  }, [employees, filterDept, filterManager]);

  // Distribution
  const distribution = useMemo(() => {
    const rated = filtered.filter(e => getRating(e, ratingSource) !== null);
    const total = rated.length;
    if (total === 0) return { bands: [], total: 0, mean: 0, rated: [], stdDev: 0 };
    const ratings = rated.map(e => getRating(e, ratingSource)!);
    const mean = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    const variance = ratings.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / ratings.length;
    const stdDev = Math.sqrt(variance);
    const bands = RATING_BANDS.map(band => {
      const emps = rated.filter(e => { const r = getRating(e, ratingSource)!; return r >= band.min && r <= band.max; });
      return { ...band, count: emps.length, pct: total > 0 ? Math.round((emps.length / total) * 100) : 0, employees: emps };
    });
    return { bands, total, mean, rated, stdDev };
  }, [filtered, ratingSource]);

  // Department analysis
  const deptAnalysis = useMemo(() => {
    return departments.map(dept => {
      const deptEmps = filtered.filter(e => e.department === dept);
      const rated = deptEmps.filter(e => getRating(e, ratingSource) !== null);
      if (rated.length === 0) return null;
      const ratings = rated.map(e => getRating(e, ratingSource)!);
      const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      const spread = Math.max(...ratings) - Math.min(...ratings);
      const bandDist: Record<string, number> = {};
      RATING_BANDS.forEach(b => { bandDist[b.id] = rated.filter(e => { const r = getRating(e, ratingSource)!; return r >= b.min && r <= b.max; }).length; });
      const topPct = ((bandDist.above || 0) + (bandDist.top || 0)) / rated.length * 100;
      const lowPct = ((bandDist.critical || 0) + (bandDist.below || 0)) / rated.length * 100;
      let riskFlag = ""; let riskColor = "";
      if (topPct > 60) { riskFlag = "Inflation Signal"; riskColor = "text-destructive"; }
      else if (spread < 0.5 && rated.length >= 5) { riskFlag = "Compression Signal"; riskColor = "text-amber-400"; }
      else if (lowPct > 40) { riskFlag = "Low Performance Cluster"; riskColor = "text-orange-400"; }
      return { dept, count: rated.length, avg, spread, bandDist, topPct, lowPct, riskFlag, riskColor };
    }).filter(Boolean) as any[];
  }, [departments, filtered, ratingSource]);

  // Manager calibration
  const managerAnalysis: ManagerAnalysis[] = useMemo(() => {
    return managers.map(mgr => {
      const mgrEmps = filtered.filter(e => e.lineManager === mgr);
      const rated = mgrEmps.filter(e => getRating(e, ratingSource) !== null);
      if (rated.length === 0) return null;
      const ratings = rated.map(e => getRating(e, ratingSource)!);
      const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      const spread = Math.max(...ratings) - Math.min(...ratings);
      const dist: Record<string, number> = {};
      RATING_BANDS.forEach(b => { dist[b.id] = rated.filter(e => { const r = getRating(e, ratingSource)!; return r >= b.min && r <= b.max; }).length; });
      const { flag, color, bg } = getManagerFlag(avg, spread, rated.length, dist);
      return { name: mgr, directReports: rated.length, avgRating: avg, spread, distribution: dist, flag, flagColor: color, flagBg: bg };
    }).filter(Boolean) as ManagerAnalysis[];
  }, [managers, filtered, ratingSource]);

  // KPIs
  const kpis = useMemo(() => {
    const rated = filtered.filter(e => getRating(e, ratingSource) !== null);
    if (rated.length === 0) return { totalReviewed: 0, avgRating: 0, highestDept: "—", lowestDept: "—", highPerfPct: 0, lowPerfPct: 0, meetsExpPct: 0, compressedMgr: "—" };
    const ratings = rated.map(e => getRating(e, ratingSource)!);
    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    const highPerf = rated.filter(e => getRating(e, ratingSource)! >= 3.5).length;
    const lowPerf = rated.filter(e => getRating(e, ratingSource)! < 2.0).length;
    const meetsExp = rated.filter(e => { const r = getRating(e, ratingSource)!; return r >= 3.0 && r < 3.5; }).length;
    const highestDept = deptAnalysis.length > 0 ? deptAnalysis.reduce((a: any, b: any) => a.avg > b.avg ? a : b).dept : "—";
    const lowestDept = deptAnalysis.length > 0 ? deptAnalysis.reduce((a: any, b: any) => a.avg < b.avg ? a : b).dept : "—";
    const compressed = managerAnalysis.filter(m => m.flag === "Rating Compression");
    return {
      totalReviewed: rated.length, avgRating: avg, highestDept, lowestDept,
      highPerfPct: Math.round((highPerf / rated.length) * 100),
      lowPerfPct: Math.round((lowPerf / rated.length) * 100),
      meetsExpPct: Math.round((meetsExp / rated.length) * 100),
      compressedMgr: compressed.length > 0 ? compressed[0].name : "None detected",
    };
  }, [filtered, ratingSource, deptAnalysis, managerAnalysis]);

  const healthScore = useMemo(() => getCalibrationHealthScore(kpis, managerAnalysis, deptAnalysis), [kpis, managerAnalysis, deptAnalysis]);

  // Smooth bell curve data (gaussian approximation for visual overlay)
  const bellCurveData = useMemo(() => {
    if (distribution.total === 0) return [];
    const points: { x: number; actual: number; expected: number; label: string }[] = [];
    // Use histogram bins
    RATING_BANDS.forEach((band, i) => {
      const bandData = distribution.bands.find(b => b.id === band.id);
      const expected = EXPECTED_DISTRIBUTION[band.id as keyof typeof EXPECTED_DISTRIBUTION] || 0;
      points.push({
        x: (band.min + band.max) / 2,
        actual: bandData?.count || 0,
        expected: Math.round((expected / 100) * distribution.total),
        label: band.shortLabel,
      });
    });
    return points;
  }, [distribution]);

  // Generate AI Insights
  const generateAIInsights = useCallback(async () => {
    setIsGeneratingAI(true);
    try {
      const payload = {
        employees: filtered.slice(0, 200).map(e => ({
          name: e.employeeName, department: e.department, manager: e.lineManager,
          managerRating: e.managerRating, selfRating: e.selfRating,
        })),
        distribution: distribution.bands.map(b => ({ band: b.label, count: b.count, pct: b.pct })),
        deptAnalysis: deptAnalysis.slice(0, 10).map((d: any) => ({ dept: d.dept, avg: d.avg, count: d.count, riskFlag: d.riskFlag })),
        managerFlags: managerAnalysis.filter(m => m.flag !== "Balanced").slice(0, 10).map(m => ({ name: m.name, flag: m.flag, avg: m.avgRating, reports: m.directReports })),
        kpis,
      };
      const { data, error } = await supabase.functions.invoke("analyze-performance", {
        body: { employees: filtered, bellCurveContext: payload, sessionToken },
      });
      if (error) throw new Error(error.message);
      if (data?.analysis?.executiveSummary) {
        const summary = typeof data.analysis.executiveSummary === "string" ? data.analysis.executiveSummary : JSON.stringify(data.analysis.executiveSummary);
        setAiInsights(summary);
        toast.success("AI calibration insights generated!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate AI insights");
    } finally {
      setIsGeneratingAI(false);
    }
  }, [filtered, distribution, deptAnalysis, managerAnalysis, kpis]);

  // Org-level band distribution (for benchmarking)
  const orgBandDistribution = useMemo(() => {
    const result: Record<string, number> = {};
    distribution.bands.forEach(b => { result[b.id] = b.count; });
    return result;
  }, [distribution]);

  const sectionTabs = [
    { id: "overview" as const, label: "Distribution", icon: <Activity className="w-3.5 h-3.5" /> },
    { id: "heatmap" as const, label: "Heatmap", icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: "overlay" as const, label: "Overlay", icon: <Eye className="w-3.5 h-3.5" /> },
    { id: "departments" as const, label: "Departments", icon: <PieChart className="w-3.5 h-3.5" /> },
    { id: "managers" as const, label: "Managers", icon: <Users className="w-3.5 h-3.5" /> },
    { id: "accountability" as const, label: "Accountability", icon: <Shield className="w-3.5 h-3.5" /> },
    { id: "gap" as const, label: "Gap Analysis", icon: <GitCompareArrows className="w-3.5 h-3.5" /> },
    { id: "forced" as const, label: "Forced Dist.", icon: <Target className="w-3.5 h-3.5" /> },
    { id: "benchmarking" as const, label: "Benchmarking", icon: <Shield className="w-3.5 h-3.5" /> },
    { id: "session" as const, label: "Calibration", icon: <Zap className="w-3.5 h-3.5" /> },
    { id: "whatif" as const, label: "What-If", icon: <Filter className="w-3.5 h-3.5" /> },
    { id: "bias" as const, label: "Bias Detection", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
    { id: "correlation" as const, label: "Correlation", icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: "percentile" as const, label: "Percentiles", icon: <Crown className="w-3.5 h-3.5" /> },
    { id: "comparison" as const, label: "Cycle Compare", icon: <Gauge className="w-3.5 h-3.5" /> },
    { id: "minutes" as const, label: "Minutes", icon: <FileText className="w-3.5 h-3.5" /> },
    { id: "insights" as const, label: "AI Insights", icon: <Sparkles className="w-3.5 h-3.5" /> },
  ];

  const ratingSourceLabel = { final: "Final Calibrated", manager: "Manager", self: "Self Assessment", gap: "Self vs Manager Gap" }[ratingSource];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ═══════════════ HEADER ═══════════════ */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/8 via-card to-violet-500/5 border border-border/60 p-6"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.08),transparent_60%)]" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-violet-500/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-10 w-10 rounded-xl border border-border/50 hover:border-primary/30 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-primary flex items-center justify-center shadow-lg shadow-primary/25">
              <BarChart3 className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Bell Curve & Calibration</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Performance distribution · Calibration intelligence · {distribution.total} employees
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={ratingSource} onValueChange={(v) => setRatingSource(v as RatingSource)}>
              <SelectTrigger className="w-[155px] h-9 text-xs bg-card/80 backdrop-blur-sm border-border/50">
                <GitCompareArrows className="w-3.5 h-3.5 mr-1.5 text-primary" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="final">Final Rating</SelectItem>
                <SelectItem value="manager">Manager Rating</SelectItem>
                <SelectItem value="self">Self Rating</SelectItem>
                <SelectItem value="gap">Self vs Manager</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-[145px] h-9 text-xs bg-card/80 backdrop-blur-sm border-border/50">
                <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterManager} onValueChange={setFilterManager}>
              <SelectTrigger className="w-[140px] h-9 text-xs bg-card/80 backdrop-blur-sm border-border/50">
                <Users className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Manager" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Managers</SelectItem>
                {managers.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={generateAIInsights} disabled={isGeneratingAI}
              className="bg-gradient-to-r from-violet-600 to-primary hover:from-violet-700 hover:to-primary/90 shadow-lg shadow-primary/20 text-xs h-9"
            >
              {isGeneratingAI ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Brain className="w-3.5 h-3.5 mr-1.5" />}
              AI Insights
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="text-xs h-9 border-border/50">
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Export
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => {
                  exportBellCurvePDF({
                    kpis,
                    bands: distribution.bands.map(b => ({ label: b.label, range: b.range, count: b.count, pct: b.pct, interpretation: b.interpretation })),
                    deptAnalysis: deptAnalysis.map((d: any) => ({ dept: d.dept, count: d.count, avg: d.avg, riskFlag: d.riskFlag })),
                    managerAnalysis: managerAnalysis.map(m => ({ name: m.name, directReports: m.directReports, avgRating: m.avgRating, spread: m.spread, flag: m.flag })),
                    healthScore,
                    ratingSource: { final: "Final Calibrated", manager: "Manager", self: "Self Assessment", gap: "Self vs Manager Gap" }[ratingSource],
                    filterDept,
                    filterManager,
                    mean: distribution.mean,
                    stdDev: distribution.stdDev,
                    total: distribution.total,
                    aiInsights,
                  });
                  toast.success("PDF report downloaded!");
                }}>
                  <FileText className="w-4 h-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  exportBellCurveExcel({
                    kpis,
                    bands: distribution.bands.map(b => ({ label: b.label, range: b.range, count: b.count, pct: b.pct, interpretation: b.interpretation })),
                    deptAnalysis: deptAnalysis.map((d: any) => ({ dept: d.dept, count: d.count, avg: d.avg, riskFlag: d.riskFlag })),
                    managerAnalysis: managerAnalysis.map(m => ({ name: m.name, directReports: m.directReports, avgRating: m.avgRating, spread: m.spread, flag: m.flag })),
                    healthScore,
                    ratingSource: { final: "Final Calibrated", manager: "Manager", self: "Self Assessment", gap: "Self vs Manager Gap" }[ratingSource],
                    filterDept,
                    filterManager,
                    mean: distribution.mean,
                    stdDev: distribution.stdDev,
                    total: distribution.total,
                    aiInsights,
                    employees: filtered.map(e => ({
                      employeeName: e.employeeName,
                      department: e.department,
                      lineManager: e.lineManager,
                      rating: getRating(e, ratingSource),
                    })),
                  });
                  toast.success("Excel report downloaded!");
                }}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </motion.div>

      {/* ═══════════════ CALIBRATION HEALTH + KPI STRIP ═══════════════ */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Health Score — larger */}
        <motion.div variants={fadeUp} className="col-span-2 lg:col-span-1 row-span-2">
          <Card className="h-full border-border/50 bg-gradient-to-br from-card to-primary/3 overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardContent className="p-5 flex flex-col items-center justify-center h-full relative">
              <div className="relative w-28 h-28 mb-3">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--border))" strokeWidth="6" opacity="0.3" />
                  <motion.circle
                    cx="50" cy="50" r="42" fill="none"
                    stroke={healthScore >= 75 ? "hsl(var(--chart-3))" : healthScore >= 50 ? "hsl(var(--chart-5))" : "hsl(var(--destructive))"}
                    strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={`${(healthScore / 100) * 264} 264`}
                    initial={{ strokeDasharray: "0 264" }}
                    animate={{ strokeDasharray: `${(healthScore / 100) * 264} 264` }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.span className="text-3xl font-bold" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                    {healthScore}
                  </motion.span>
                </div>
              </div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Calibration Health</span>
              <Badge variant="secondary" className={`mt-2 text-[10px] border-0 ${
                healthScore >= 75 ? "bg-emerald-500/15 text-emerald-400" :
                healthScore >= 50 ? "bg-amber-500/15 text-amber-400" :
                "bg-destructive/15 text-destructive"
              }`}>
                {healthScore >= 75 ? "Healthy" : healthScore >= 50 ? "Needs Review" : "At Risk"}
              </Badge>
            </CardContent>
          </Card>
        </motion.div>

        {/* KPI Cards row 1 */}
        {[
          { label: "Reviewed", value: kpis.totalReviewed, icon: Users, gradient: "from-primary/15 to-primary/5", iconColor: "text-primary" },
          { label: "Avg Rating", value: kpis.avgRating.toFixed(2), icon: Target, gradient: "from-violet-500/15 to-violet-500/5", iconColor: "text-violet-400", isText: true },
          { label: "High Performers", value: `${kpis.highPerfPct}%`, icon: Crown, gradient: "from-emerald-500/15 to-emerald-500/5", iconColor: "text-emerald-400", isText: true },
          { label: "Low Performers", value: `${kpis.lowPerfPct}%`, icon: AlertCircle, gradient: "from-destructive/15 to-destructive/5", iconColor: "text-destructive", isText: true },
        ].map((kpi) => (
          <motion.div key={kpi.label} variants={fadeUp}>
            <Card className="border-border/50 overflow-hidden group hover:border-border transition-colors duration-300">
              <CardContent className="p-4 relative">
                <div className={`absolute inset-0 bg-gradient-to-br ${kpi.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">{kpi.label}</span>
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-muted/80 to-muted/40 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <kpi.icon className={`w-4 h-4 ${kpi.iconColor}`} />
                    </div>
                  </div>
                  {kpi.isText ? (
                    <motion.span className="text-2xl font-bold" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                      {kpi.value}
                    </motion.span>
                  ) : (
                    <AnimatedCounter value={kpi.value as number} className="text-2xl font-bold" />
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {/* Secondary KPIs row 2 */}
        {[
          { label: "Top Dept", value: kpis.highestDept, icon: TrendingUp },
          { label: "Bottom Dept", value: kpis.lowestDept, icon: TrendingDown },
          { label: "Meets Exp.", value: `${kpis.meetsExpPct}%`, icon: Target },
          { label: "Source", value: ratingSourceLabel, icon: GitCompareArrows },
        ].map((kpi) => (
          <motion.div key={kpi.label} variants={fadeUp}>
            <Card className="border-border/40 bg-card/60">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <kpi.icon className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-medium">{kpi.label}</span>
                </div>
                <p className="text-sm font-semibold truncate">{kpi.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* ═══════════════ SECTION TABS ═══════════════ */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        className="flex gap-1 p-1.5 rounded-2xl bg-muted/40 border border-border/40 backdrop-blur-sm overflow-x-auto scrollbar-none"
      >
        {sectionTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-medium transition-all duration-300 ${
              activeSection === tab.id
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* ═══════════════ DISTRIBUTION OVERVIEW ═══════════════ */}
      <AnimatePresence mode="wait">
      {activeSection === "overview" && (
        <motion.div key="overview" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }} className="space-y-6">
          {/* Bell Curve Chart */}
          <Card className="border-border/50 overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2.5 text-base">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Activity className="w-4 h-4 text-primary" />
                    </div>
                    Performance Distribution Curve
                  </CardTitle>
                  <CardDescription className="ml-[42px]">
                    {distribution.total} employees · μ = {distribution.mean.toFixed(2)} · σ = {distribution.stdDev.toFixed(2)}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Expected overlay</span>
                    <Switch checked={showExpected} onCheckedChange={setShowExpected} />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-[380px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={bellCurveData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                    <defs>
                      {BAND_COLORS.map((color, i) => (
                        <linearGradient key={i} id={`bandGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={color} stopOpacity={0.8} />
                          <stop offset="100%" stopColor={color} stopOpacity={0.25} />
                        </linearGradient>
                      ))}
                      <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={{ stroke: "hsl(var(--border))", opacity: 0.5 }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))", border: "1px solid hsl(var(--border))",
                        borderRadius: "16px", fontSize: "12px", padding: "12px 16px",
                        boxShadow: "0 20px 60px -15px rgba(0,0,0,0.3)",
                      }}
                      cursor={{ fill: "hsl(var(--muted))", opacity: 0.15 }}
                      formatter={(value: any, name: string) => [
                        `${value} employee${value !== 1 ? "s" : ""}`,
                        name === "actual" ? "Actual Count" : "Expected Count"
                      ]}
                    />
                    <Area type="monotone" dataKey="actual" fill="url(#areaFill)" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} />
                    <Bar dataKey="actual" name="actual" radius={[8, 8, 0, 0]} maxBarSize={55} animationDuration={800} animationEasing="ease-out">
                      {bellCurveData.map((_, i) => (
                        <Cell key={i} fill={`url(#bandGrad${i})`} stroke={BAND_COLORS[i]} strokeWidth={1} />
                      ))}
                    </Bar>
                    {showExpected && (
                      <Line type="monotone" dataKey="expected" name="expected" stroke="hsl(var(--muted-foreground))"
                        strokeWidth={2} strokeDasharray="8 5"
                        dot={{ r: 5, fill: "hsl(var(--card))", stroke: "hsl(var(--muted-foreground))", strokeWidth: 2 }}
                        animationDuration={1000}
                      />
                    )}
                    {distribution.mean > 0 && (
                      <ReferenceLine x={RATING_BANDS.reduce((closest, band) => {
                        const mid = (band.min + band.max) / 2;
                        return Math.abs(mid - distribution.mean) < Math.abs(((closest.min + closest.max) / 2) - distribution.mean) ? band : closest;
                      }).shortLabel} stroke="hsl(var(--primary))" strokeDasharray="3 3" opacity={0.5} label={{
                        value: `Mean ${distribution.mean.toFixed(2)}`, position: "top", fontSize: 10,
                        fill: "hsl(var(--primary))"
                      }} />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Band Cards (clickable) */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {distribution.bands.map((band, i) => {
              const expected = EXPECTED_DISTRIBUTION[band.id as keyof typeof EXPECTED_DISTRIBUTION] || 0;
              const variance = band.pct - expected;
              const isHovered = hoveredBand === band.id;
              return (
                <motion.div key={band.id}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.06 }}
                  onHoverStart={() => setHoveredBand(band.id)}
                  onHoverEnd={() => setHoveredBand(null)}
                >
                  <Card
                    className={`cursor-pointer border-border/40 overflow-hidden transition-all duration-300 hover:shadow-lg ${
                      isHovered ? "border-border scale-[1.02]" : ""
                    }`}
                    onClick={() => setSelectedBand(band.id)}
                  >
                    <CardContent className="p-4 relative">
                      <div className={`absolute inset-0 bg-gradient-to-br ${BAND_GRADIENTS[i]} opacity-60`} />
                      <div className="relative">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: BAND_COLORS[i] }} />
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{band.shortLabel}</span>
                        </div>
                        <div className="flex items-end justify-between">
                          <div>
                            <span className="text-2xl font-bold">{band.count}</span>
                            <span className="text-xs text-muted-foreground ml-1">({band.pct}%)</span>
                          </div>
                          {showExpected && (
                            <span className={`text-xs font-semibold ${
                              variance > 5 ? "text-destructive" : variance < -5 ? "text-amber-400" : "text-emerald-400"
                            }`}>
                              {variance > 0 ? "+" : ""}{variance}%
                            </span>
                          )}
                        </div>
                        <div className="mt-3 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: BAND_COLORS[i] }}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(band.pct, 100)}%` }}
                            transition={{ duration: 0.8, delay: 0.2 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2 line-clamp-1">{band.range}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Expected vs Actual comparison strip */}
          {showExpected && distribution.total > 0 && (
            <Card className="border-border/40">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">Expected vs Actual Distribution</span>
                </div>
                <div className="space-y-3">
                  {distribution.bands.map((band, i) => {
                    const expected = EXPECTED_DISTRIBUTION[band.id as keyof typeof EXPECTED_DISTRIBUTION] || 0;
                    return (
                      <div key={band.id} className="flex items-center gap-4">
                        <div className="w-24 flex items-center gap-2 flex-shrink-0">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: BAND_COLORS[i] }} />
                          <span className="text-xs font-medium">{band.shortLabel}</span>
                        </div>
                        <div className="flex-1 relative">
                          <div className="flex h-5 rounded-full overflow-hidden bg-muted/30">
                            <motion.div
                              className="h-full rounded-full relative"
                              style={{ backgroundColor: BAND_COLORS[i], opacity: 0.7 }}
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(band.pct, 100)}%` }}
                              transition={{ duration: 0.8, delay: i * 0.08 }}
                            />
                          </div>
                          {/* Expected marker */}
                          <div className="absolute top-0 h-full flex items-center" style={{ left: `${Math.min(expected, 100)}%` }}>
                            <div className="w-0.5 h-full bg-foreground/40 rounded-full" />
                          </div>
                        </div>
                        <div className="w-20 flex-shrink-0 text-right">
                          <span className="text-xs font-semibold">{band.pct}%</span>
                          <span className="text-[10px] text-muted-foreground ml-1">/ {expected}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      {/* ═══════════════ DEPARTMENT ANALYSIS ═══════════════ */}
      {activeSection === "departments" && (
        <motion.div key="departments" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }} className="space-y-4">
          {/* Summary bar chart */}
          {deptAnalysis.length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-violet-400" />
                  </div>
                  Department Average Ratings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptAnalysis.sort((a: any, b: any) => b.avg - a.avg)} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                      <XAxis dataKey="dept" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} angle={-20} textAnchor="end" />
                      <YAxis domain={[0, 5]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px" }} />
                      <ReferenceLine y={distribution.mean} stroke="hsl(var(--primary))" strokeDasharray="5 5" opacity={0.5} />
                      <Bar dataKey="avg" radius={[6, 6, 0, 0]} maxBarSize={40} animationDuration={800}>
                        {deptAnalysis.map((_: any, i: number) => (
                          <Cell key={i} fill={`hsl(var(--primary))`} fillOpacity={0.6 + (i * 0.05)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Department cards */}
          <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {deptAnalysis.map((dept: any, i: number) => (
              <motion.div key={dept.dept} variants={fadeUp}>
                <Card className="border-border/40 overflow-hidden group hover:border-border/60 transition-all duration-300">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-sm">{dept.dept}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground">{dept.count} employees</span>
                          <span className="text-xs font-semibold">Avg: {dept.avg.toFixed(2)}</span>
                        </div>
                      </div>
                      {dept.riskFlag ? (
                        <Badge variant="secondary" className="text-[10px] border-0 bg-destructive/10">
                          <AlertTriangle className={`w-3 h-3 mr-1 ${dept.riskColor}`} />
                          <span className={dept.riskColor}>{dept.riskFlag}</span>
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] border-0 bg-emerald-500/10 text-emerald-400">
                          <CheckCircle2 className="w-3 h-3 mr-1" />Normal
                        </Badge>
                      )}
                    </div>

                    {/* Segmented distribution bar */}
                    <div className="flex rounded-lg overflow-hidden h-4 bg-muted/30 mb-3">
                      {RATING_BANDS.map((band, bi) => {
                        const count = dept.bandDist[band.id] || 0;
                        const pct = dept.count > 0 ? (count / dept.count) * 100 : 0;
                        if (pct === 0) return null;
                        return (
                          <motion.div
                            key={band.id}
                            className="relative group/seg"
                            style={{ width: `${pct}%`, backgroundColor: BAND_COLORS[bi] }}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, delay: i * 0.05 + bi * 0.03 }}
                            title={`${band.label}: ${count} (${Math.round(pct)}%)`}
                          />
                        );
                      })}
                    </div>

                    <div className="flex gap-2 flex-wrap mb-4">
                      {RATING_BANDS.map((band, bi) => {
                        const count = dept.bandDist[band.id] || 0;
                        if (count === 0) return null;
                        return (
                          <span key={band.id} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: BAND_COLORS[bi] }} />
                            {band.shortLabel}: {count}
                          </span>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/40">
                      <div className="text-center">
                        <p className="text-lg font-bold text-emerald-400">{Math.round(dept.topPct)}%</p>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">High Perf</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold">{dept.spread.toFixed(1)}</p>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Spread</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-destructive">{Math.round(dept.lowPct)}%</p>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Low Perf</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
          {deptAnalysis.length === 0 && (
            <Card className="border-dashed border-2 border-border/30">
              <CardContent className="py-16 text-center">
                <PieChart className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No department data available with current filters</p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      {/* ═══════════════ MANAGER CALIBRATION ═══════════════ */}
      {activeSection === "managers" && (
        <motion.div key="managers" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }} className="space-y-4">
          {/* Risk summary strip */}
          <div className="flex flex-wrap gap-2">
            {[
              { flag: "Rating Inflation Risk", count: managerAnalysis.filter(m => m.flag === "Rating Inflation Risk").length, color: "bg-destructive/15 text-destructive border-destructive/20" },
              { flag: "Rating Compression", count: managerAnalysis.filter(m => m.flag === "Rating Compression").length, color: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
              { flag: "High Strictness", count: managerAnalysis.filter(m => m.flag === "High Strictness").length, color: "bg-orange-500/15 text-orange-400 border-orange-500/20" },
              { flag: "Balanced", count: managerAnalysis.filter(m => m.flag === "Balanced").length, color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
            ].filter(s => s.count > 0).map(s => (
              <Badge key={s.flag} variant="outline" className={`${s.color} text-xs py-1.5 px-3`}>
                {s.count} {s.flag}
              </Badge>
            ))}
          </div>

          {/* Manager cards (not a table — more visual) */}
          <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3">
            {managerAnalysis.sort((a, b) => {
              const order = ["Rating Inflation Risk", "Rating Compression", "High Strictness", "Insufficient Sample", "Balanced"];
              return order.indexOf(a.flag) - order.indexOf(b.flag);
            }).map((mgr, i) => (
              <motion.div key={mgr.name} variants={fadeUp}>
                <Card className={`border-border/40 overflow-hidden transition-all duration-300 hover:border-border/60 ${
                  mgr.flag === "Rating Inflation Risk" ? "border-l-2 border-l-destructive" :
                  mgr.flag === "Rating Compression" ? "border-l-2 border-l-amber-500" :
                  mgr.flag === "High Strictness" ? "border-l-2 border-l-orange-500" :
                  mgr.flag === "Balanced" ? "border-l-2 border-l-emerald-500" : ""
                }`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Manager info */}
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center text-sm font-bold">
                          {mgr.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{mgr.name}</p>
                          <p className="text-xs text-muted-foreground">{mgr.directReports} direct report{mgr.directReports !== 1 ? "s" : ""}</p>
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="flex items-center gap-6 flex-1">
                        <div className="text-center">
                          <p className={`text-lg font-bold ${mgr.avgRating >= 3.5 ? "text-emerald-400" : mgr.avgRating < 2.5 ? "text-destructive" : ""}`}>
                            {mgr.avgRating.toFixed(2)}
                          </p>
                          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Avg</p>
                        </div>
                        <div className="text-center">
                          <p className={`text-lg font-bold ${mgr.spread < 0.5 ? "text-amber-400" : ""}`}>{mgr.spread.toFixed(2)}</p>
                          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Spread</p>
                        </div>

                        {/* Distribution bar */}
                        <div className="flex-1 max-w-[300px]">
                          <div className="flex rounded-lg overflow-hidden h-3 bg-muted/30">
                            {RATING_BANDS.map((band, bi) => {
                              const count = mgr.distribution[band.id] || 0;
                              const pct = mgr.directReports > 0 ? (count / mgr.directReports) * 100 : 0;
                              if (pct === 0) return null;
                              return (
                                <div key={band.id} style={{ width: `${pct}%`, backgroundColor: BAND_COLORS[bi] }}
                                  title={`${band.label}: ${count} (${Math.round(pct)}%)`}
                                  className="transition-all duration-500"
                                />
                              );
                            })}
                          </div>
                          <div className="flex gap-1.5 mt-1.5">
                            {RATING_BANDS.map((band, bi) => {
                              const count = mgr.distribution[band.id] || 0;
                              if (count === 0) return null;
                              return (
                                <span key={band.id} className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: BAND_COLORS[bi] }} />
                                  {count}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Flag */}
                      <Badge variant="secondary" className={`${mgr.flagBg} ${mgr.flagColor} border-0 text-[10px] px-3 py-1 flex-shrink-0`}>
                        {mgr.flag === "Rating Inflation Risk" && <TrendingUp className="w-3 h-3 mr-1" />}
                        {mgr.flag === "Rating Compression" && <Zap className="w-3 h-3 mr-1" />}
                        {mgr.flag === "Balanced" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {mgr.flag}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
          {managerAnalysis.length === 0 && (
            <Card className="border-dashed border-2 border-border/30">
              <CardContent className="py-16 text-center">
                <Users className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No manager data available with current filters</p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      {/* ═══════════════ GAP ANALYSIS ═══════════════ */}
      {activeSection === "gap" && (
        <GapAnalysis employees={filtered} />
      )}

      {/* ═══════════════ FORCED DISTRIBUTION ═══════════════ */}
      {activeSection === "forced" && (
        <ForcedDistribution
          bands={distribution.bands}
          total={distribution.total}
          deptAnalysis={deptAnalysis}
          managerAnalysis={managerAnalysis}
          bandColors={BAND_COLORS}
        />
      )}

      {/* ═══════════════ PEER BENCHMARKING ═══════════════ */}
      {activeSection === "benchmarking" && (
        <PeerBenchmarking
          managerAnalysis={managerAnalysis}
          bandIds={RATING_BANDS.map(b => ({ id: b.id, shortLabel: b.shortLabel }))}
          orgDistribution={orgBandDistribution}
          total={distribution.total}
        />
      )}

      {/* ═══════════════ REVIEW CYCLE COMPARISON ═══════════════ */}
      {activeSection === "comparison" && (
        <ReviewCycleComparison
          currentBands={distribution.bands.map(b => ({ id: b.id, shortLabel: b.shortLabel, count: b.count, pct: b.pct }))}
          currentMean={distribution.mean}
          currentStdDev={distribution.stdDev}
          currentTotal={distribution.total}
          currentHealthScore={healthScore}
          bandColors={BAND_COLORS}
        />
      )}

      {/* ═══════════════ AI INSIGHTS & RECOMMENDATIONS ═══════════════ */}
      {activeSection === "insights" && (
        <AIRecommendations
          employees={filtered}
          distribution={distribution}
          deptAnalysis={deptAnalysis}
          managerAnalysis={managerAnalysis}
          kpis={kpis}
          healthScore={healthScore}
          aiInsights={aiInsights}
          onInsightsGenerated={setAiInsights}
        />
      )}

      {/* ═══════════════ DEPARTMENT HEATMAP ═══════════════ */}
      {activeSection === "heatmap" && (
        <DepartmentHeatmap
          employees={filtered}
          getRating={(emp) => getRating(emp, ratingSource)}
          orgMean={distribution.mean}
        />
      )}

      {/* ═══════════════ CALIBRATION SESSION ═══════════════ */}
      {activeSection === "session" && (
        <CalibrationSession
          employees={filtered}
          bands={RATING_BANDS}
          bandColors={BAND_COLORS}
          getRating={(emp) => getRating(emp, ratingSource)}
        />
      )}

      {/* ═══════════════ DISTRIBUTION OVERLAY ═══════════════ */}
      {activeSection === "overlay" && (
        <DistributionOverlay
          employees={filtered}
          bands={RATING_BANDS.map(b => ({ id: b.id, shortLabel: b.shortLabel, min: b.min, max: b.max }))}
          bandColors={BAND_COLORS}
        />
      )}

      {/* ═══════════════ BIAS DETECTION ═══════════════ */}
      {activeSection === "bias" && (
        <BiasDetection
          employees={filtered}
          managerAnalysis={managerAnalysis.map(m => ({ name: m.name, avgRating: m.avgRating, directReports: m.directReports, spread: m.spread, flag: m.flag }))}
          deptAnalysis={deptAnalysis.map((d: any) => ({ dept: d.dept, avg: d.avg, count: d.count }))}
        />
      )}

      {/* ═══════════════ WHAT-IF SIMULATOR ═══════════════ */}
      {activeSection === "whatif" && (
        <WhatIfSimulator
          employees={filtered}
          bands={RATING_BANDS}
          bandColors={BAND_COLORS}
          getRating={(emp) => getRating(emp, ratingSource)}
        />
      )}

      {/* ═══════════════ CALIBRATION MINUTES ═══════════════ */}
      {activeSection === "minutes" && (
        <CalibrationMinutes
          kpis={kpis}
          healthScore={healthScore}
          managerFlags={managerAnalysis.map(m => ({ name: m.name, flag: m.flag }))}
        />
      )}

      {/* ═══════════════ MANAGER ACCOUNTABILITY ═══════════════ */}
      {activeSection === "accountability" && (
        <ManagerAccountability
          managerAnalysis={managerAnalysis}
          employees={filtered}
          orgMean={distribution.mean}
          bandIds={RATING_BANDS.map(b => ({ id: b.id, shortLabel: b.shortLabel }))}
          bandColors={BAND_COLORS}
        />
      )}

      {/* ═══════════════ CORRELATION DASHBOARD ═══════════════ */}
      {activeSection === "correlation" && (
        <CorrelationDashboard
          employees={filtered}
          bands={RATING_BANDS.map(b => ({ id: b.id, shortLabel: b.shortLabel, min: b.min, max: b.max }))}
          bandColors={BAND_COLORS}
          getRating={(emp) => getRating(emp, ratingSource)}
        />
      )}

      {/* ═══════════════ PERCENTILE RANKING ═══════════════ */}
      {activeSection === "percentile" && (
        <PercentileRanking
          employees={filtered}
          getRating={(emp) => getRating(emp, ratingSource)}
        />
      )}

      </AnimatePresence>

      {/* ═══════════════ EMPLOYEE DRILL-DOWN MODAL ═══════════════ */}
      {selectedBand && (() => {
        const bandIndex = RATING_BANDS.findIndex(b => b.id === selectedBand);
        const bandData = distribution.bands.find(b => b.id === selectedBand);
        const bandInfo = RATING_BANDS.find(b => b.id === selectedBand);
        return (
          <DrillDownModal
            open={!!selectedBand}
            onClose={() => setSelectedBand(null)}
            bandLabel={bandInfo?.label || ""}
            bandRange={bandInfo?.range || ""}
            bandColor={BAND_COLORS[bandIndex] || "#888"}
            employees={bandData?.employees || []}
            getRating={(emp) => getRating(emp, ratingSource)}
          />
        );
      })()}
    </div>
  );
};

export default BellCurveCalibration;
