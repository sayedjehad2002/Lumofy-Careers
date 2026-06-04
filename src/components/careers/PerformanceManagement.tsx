import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileSpreadsheet, Brain, Download, RotateCcw, Users,
  AlertTriangle, TrendingUp, CheckCircle2, XCircle,
  ChevronDown, Loader2, ArrowRight, Info, Sparkles,
  BarChart3, Grid3X3, Save, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import AnimatedCounter from "@/components/careers/AnimatedCounter";
import * as XLSX from "xlsx";
import NineBoxGrid from "@/components/careers/NineBoxGrid";
import AIAnalysisResults, { type AIAnalysisResult } from "@/components/careers/AIAnalysisResults";
import BellCurveCalibration from "@/components/careers/BellCurveCalibration";
import DepartmentHeatmap from "@/components/careers/DepartmentHeatmap";
import DepartmentComparison from "@/components/careers/DepartmentComparison";
import { supabase } from "@/integrations/supabase/client";
import { adminQuery } from "@/lib/adminQuery";
import { generatePerformanceReportPdf } from "@/utils/performanceReportPdf";
import { exportPerformanceToExcel } from "@/utils/performanceExportExcel";

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

interface ColumnMapping {
  [standardField: string]: string;
}

type ProcessingStep = "idle" | "uploading" | "parsing" | "mapping" | "ready" | "analyzing" | "complete";

const STANDARD_FIELDS = [
  { key: "employeeName", label: "Employee Name", required: true },
  { key: "email", label: "Employee Email", required: false },
  { key: "department", label: "Department", required: true },
  { key: "departmentGroup", label: "Department Group", required: false },
  { key: "jobTitle", label: "Job Title", required: false },
  { key: "lineManager", label: "Line Manager", required: false },
  { key: "selfRating", label: "Self Review Rating", required: false },
  { key: "managerRating", label: "Line Manager Rating", required: true },
  { key: "performanceComments", label: "Performance Comments", required: false },
];

// Smart column name matching
const COLUMN_ALIASES: Record<string, string[]> = {
  employeeName: [
    "employee name", "full name", "name", "employee", "staff name",
    "employee full name", "username", "emp name", "worker name"
  ],
  email: [
    "employee email", "email", "e-mail", "email address", "work email",
    "corporate email", "user email"
  ],
  department: [
    "department", "dept", "team", "function", "unit",
    "business unit", "org unit", "section"
  ],
  departmentGroup: [
    "department group", "dept group", "division", "division group",
    "group", "business division", "org division"
  ],
  jobTitle: [
    "job title", "title", "position", "role", "designation",
    "job role", "job position", "current role"
  ],
  lineManager: [
    "line manager", "reporting manager", "direct manager", "supervisor",
    "reporting to", "reports to", "manager name", "mgr name", "manager"
  ],
  selfRating: [
    "self rating", "self review", "self score", "self assessment",
    "self evaluation", "employee rating", "average of self-review rating",
    "self-review rating", "average of self review rating", "self review rating",
    "self review average", "average self", "self avg"
  ],
  managerRating: [
    "line manager rating", "line manager review", "line manager review rating",
    "manager rating", "manager score", "manager review", "manager assessment",
    "mgr rating", "average of 4 line manager review", "average of line manager review",
    "4 line manager review", "average of review 4 matrix manager rating",
    "matrix manager rating", "average of matrix manager rating",
    "review 4 matrix manager rating", "calibrated rating", "final rating",
    "lm rating", "lm review", "supervisor rating", "manager review average"
  ],
  performanceComments: [
    "performance comments", "comments", "notes", "feedback",
    "review comments", "performance notes", "manager comments",
    "review notes", "appraisal comments"
  ],
};

function smartMatch(columnName: string): string | null {
  const normalized = columnName.toLowerCase().trim();

  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.some(alias => normalized === alias)) return field;
  }

  const priorityOrder = [
    "email", "departmentGroup", "lineManager", "managerRating", "selfRating",
    "employeeName", "department", "jobTitle", "performanceComments"
  ];

  for (const field of priorityOrder) {
    const aliases = COLUMN_ALIASES[field];
    if (aliases && aliases.some(alias => normalized.includes(alias))) {
      if (field === "lineManager" && (normalized.includes("rating") || normalized.includes("review") || normalized.includes("score"))) continue;
      if (field === "department" && normalized.includes("group")) continue;
      return field;
    }
  }
  return null;
}

// ─── Component ─────────────────────────────────────────
const PerformanceManagement = ({ sessionToken }: { sessionToken: string }) => {
  const [step, setStep] = useState<ProcessingStep>("idle");
  const [fileName, setFileName] = useState("");
  const [rawColumns, setRawColumns] = useState<string[]>([]);
  const [rawData, setRawData] = useState<Record<string, any>[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [processingMessage, setProcessingMessage] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [aiAnalyzedAt, setAiAnalyzedAt] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);
  const [narrativeMode, setNarrativeMode] = useState(false);
  const [showBellCurve, setShowBellCurve] = useState(false);

  // ─── File Upload ─────────────────────────────────────
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext || "")) {
      toast.error("Please upload an Excel (.xlsx, .xls) or CSV file.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File size must be under 20MB.");
      return;
    }

    setFileName(file.name);
    setStep("uploading");
    setProcessingMessage("Reading file…");

    try {
      const buffer = await file.arrayBuffer();
      setStep("parsing");
      setProcessingMessage("Parsing spreadsheet data…");

      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

      if (jsonData.length === 0) {
        toast.error("The uploaded file contains no data rows.");
        setStep("idle");
        return;
      }

      const columns = Object.keys(jsonData[0]);
      setRawColumns(columns);
      setRawData(jsonData);

      const autoMapping: ColumnMapping = {};
      columns.forEach(col => {
        const match = smartMatch(col);
        if (match && !Object.values(autoMapping).includes(col)) {
          autoMapping[match] = col;
        }
      });
      setColumnMapping(autoMapping);
      setStep("mapping");
      setProcessingMessage("");
      toast.success(`${jsonData.length} records detected from "${sheetName}"`);
    } catch {
      toast.error("Failed to parse file. Please check the format.");
      setStep("idle");
    }
  }, []);

  // ─── Confirm Mapping ─────────────────────────────────
  const confirmMapping = useCallback(() => {
    const missing = STANDARD_FIELDS.filter(f => f.required && !columnMapping[f.key]);
    if (missing.length > 0) {
      toast.error(`Required columns missing: ${missing.map(m => m.label).join(", ")}`);
      return;
    }

    const mapped: EmployeeRecord[] = rawData.map(row => ({
      employeeName: String(row[columnMapping.employeeName] || "").trim(),
      email: columnMapping.email ? String(row[columnMapping.email] || "").trim() : undefined,
      department: String(row[columnMapping.department] || "").trim(),
      departmentGroup: columnMapping.departmentGroup ? String(row[columnMapping.departmentGroup] || "").trim() : undefined,
      jobTitle: columnMapping.jobTitle ? String(row[columnMapping.jobTitle] || "").trim() : "",
      lineManager: columnMapping.lineManager ? String(row[columnMapping.lineManager] || "").trim() : "",
      selfRating: columnMapping.selfRating ? parseFloat(row[columnMapping.selfRating]) || null : null,
      managerRating: columnMapping.managerRating ? parseFloat(row[columnMapping.managerRating]) || null : null,
      potentialScore: null,
      functionHeadNotes: "",
      performanceComments: columnMapping.performanceComments ? String(row[columnMapping.performanceComments] || "").trim() : "",
      reviewStatus: "",
    }));

    setEmployees(mapped);
    setStep("ready");
    toast.success(`${mapped.length} employee records mapped successfully.`);
  }, [rawData, columnMapping]);

  // ─── KPI Calculations ─────────────────────────────────
  const kpis = useMemo(() => {
    if (employees.length === 0) return {
      totalEmployees: 0, rated: 0, completionPct: 0,
      highPerformers: 0, redFlags: 0,
      missingManager: 0, missingSelf: 0,
    };

    const missingMgr = employees.filter(e => e.managerRating === null).length;
    const missingSelf = employees.filter(e => e.selfRating === null).length;
    const rated = employees.filter(e => e.managerRating !== null).length;

    const redFlags = employees.filter(e => {
      if (e.managerRating !== null && e.managerRating < 3.0) return true;
      if (e.selfRating !== null && e.managerRating !== null) {
        const gap = Math.abs(e.selfRating - e.managerRating);
        if (gap >= 1.5) return true;
      }
      return false;
    }).length;

    const highPerf = employees.filter(e => e.managerRating !== null && e.managerRating >= 3.5).length;

    return {
      totalEmployees: employees.length,
      rated,
      completionPct: employees.length > 0 ? Math.round((rated / employees.length) * 100) : 0,
      highPerformers: highPerf,
      redFlags,
      missingManager: missingMgr,
      missingSelf: missingSelf,
    };
  }, [employees]);

  // ─── Reset ─────────────────────────────────────────────
  const resetAnalysis = () => {
    setStep("idle");
    setFileName("");
    setRawColumns([]);
    setRawData([]);
    setColumnMapping({});
    setEmployees([]);
    setProcessingMessage("");
    setAiAnalysis(null);
    setAiAnalyzedAt("");
  };

  // ─── Generate AI Analysis ─────────────────────────────
  const generateAIAnalysis = useCallback(async () => {
    if (employees.length === 0) return;
    setIsAnalyzing(true);
    setStep("analyzing");
    toast.info("Generating AI analysis...");

    try {
      const { data, error } = await supabase.functions.invoke("analyze-performance", {
        body: { employees },
      });
      if (error) throw new Error(error.message || "AI analysis failed");
      if (data?.error) throw new Error(data.error);
      if (data?.analysis) {
        setAiAnalysis(data.analysis);
        setAiAnalyzedAt(data.analyzedAt || new Date().toISOString());
        setStep("complete");
        toast.success("AI analysis generated!");
      } else {
        throw new Error("No analysis returned");
      }
    } catch (err) {
      console.error("AI analysis error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to generate AI analysis");
      setStep("ready");
    } finally {
      setIsAnalyzing(false);
    }
  }, [employees]);

  // ─── Export Handlers ───────────────────────────────────
  const handleExportPdf = useCallback(() => {
    if (employees.length === 0) return;
    try {
      generatePerformanceReportPdf(employees, aiAnalysis);
      toast.success("PDF report downloaded!");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Failed to generate PDF");
    }
  }, [employees, aiAnalysis]);

  const handleExportExcel = useCallback(() => {
    if (employees.length === 0) return;
    try {
      exportPerformanceToExcel(employees, aiAnalysis);
      toast.success("Excel report downloaded!");
    } catch (err) {
      console.error("Excel export error:", err);
      toast.error("Failed to generate Excel file");
    }
  }, [employees, aiAnalysis]);

  // ─── Save Snapshot ─────────────────────────────────────
  const handleSaveSnapshot = useCallback(async () => {
    if (employees.length === 0) return;
    setIsSavingSnapshot(true);
    try {
      const ratedEmployees = employees.filter(e => e.managerRating !== null);
      const avgMgrRating = ratedEmployees.length > 0
        ? ratedEmployees.reduce((s, e) => s + (e.managerRating || 0), 0) / ratedEmployees.length
        : 0;

      const deptBreakdown = [...new Set(employees.map(e => e.department))].map(dept => {
        const deptEmps = employees.filter(e => e.department === dept);
        const deptRated = deptEmps.filter(e => e.managerRating !== null);
        const avgRating = deptRated.length > 0
          ? deptRated.reduce((s, e) => s + (e.managerRating || 0), 0) / deptRated.length
          : 0;
        return { department: dept, count: deptEmps.length, avgRating };
      });

      const { error } = await adminQuery(sessionToken, "insert", "performance_snapshots", {
        data: {
          snapshot_name: `Analysis ${new Date().toLocaleDateString()}`,
          total_employees: employees.length,
          avg_manager_rating: avgMgrRating,
          high_performers: kpis.highPerformers,
          red_flag_count: kpis.redFlags,
          high_potential: 0,
          department_breakdown: deptBreakdown,
          nine_box_distribution: {},
          ai_analysis: aiAnalysis as any,
          employee_data: employees.slice(0, 500) as any,
        },
      });

      if (error) throw new Error(error);
      toast.success("Snapshot saved!");
    } catch (err) {
      console.error("Save snapshot error:", err);
      toast.error("Failed to save snapshot");
    } finally {
      setIsSavingSnapshot(false);
    }
  }, [employees, kpis, aiAnalysis]);

  const isDataLoaded = step === "ready" || step === "analyzing" || step === "complete";

  // If bell curve view is active, render it
  if (showBellCurve && isDataLoaded) {
    return <BellCurveCalibration employees={employees} onBack={() => setShowBellCurve(false)} />;
  }

  // ─── Render ────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shadow-lg shadow-primary/20">
            <Grid3X3 className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Performance Management</h1>
            <p className="text-sm text-muted-foreground">
              Self Review vs Manager Review · 9-Box Alignment Grid
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Bell Curve button */}
          {isDataLoaded && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBellCurve(true)}
              className="border-violet-500/30 text-violet-400 hover:bg-violet-500/10 hover:text-violet-300"
            >
              <BarChart3 className="w-4 h-4 mr-1.5" />
              Bell Curve & Calibration
            </Button>
          )}

          <Button
            disabled={!isDataLoaded || isAnalyzing}
            onClick={generateAIAnalysis}
            size="sm"
          >
            {isAnalyzing ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Brain className="w-4 h-4 mr-1.5" />}
            {isAnalyzing ? "Analyzing…" : "AI Analysis"}
          </Button>

          <Select onValueChange={(val) => {
            if (val === "pdf") handleExportPdf();
            else if (val === "excel") handleExportExcel();
          }}>
            <SelectTrigger className="w-[120px] h-9 text-sm" disabled={!isDataLoaded}>
              <Download className="w-4 h-4 mr-1.5" />
              <span>Export</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">
                <div className="flex items-center gap-2"><FileText className="w-4 h-4" />PDF</div>
              </SelectItem>
              <SelectItem value="excel">
                <div className="flex items-center gap-2"><FileSpreadsheet className="w-4 h-4" />Excel</div>
              </SelectItem>
            </SelectContent>
          </Select>

          <Button
            disabled={!isDataLoaded || isSavingSnapshot}
            variant="outline"
            size="sm"
            onClick={handleSaveSnapshot}
          >
            {isSavingSnapshot ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
            Save
          </Button>

          <Button variant="ghost" onClick={resetAnalysis} size="icon" className="h-9 w-9">
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Processing State */}
      <AnimatePresence mode="wait">
        {(step === "uploading" || step === "parsing") && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <Card className="glass-card">
              <CardContent className="py-16 flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center animate-pulse-glow">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
                <p className="font-semibold text-lg">{processingMessage}</p>
                <p className="text-sm text-muted-foreground">This may take a moment for large files</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Column Mapping */}
        {step === "mapping" && (
          <motion.div
            key="mapping"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <Card className="glass-card">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileSpreadsheet className="w-5 h-5 text-primary" />
                      Column Mapping
                    </CardTitle>
                    <CardDescription className="mt-1">
                      <span className="font-medium text-foreground">{fileName}</span> — {rawData.length} rows · {rawColumns.length} columns
                    </CardDescription>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-0">
                    {Object.keys(columnMapping).length}/{STANDARD_FIELDS.length} mapped
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {STANDARD_FIELDS.map(field => (
                    <div key={field.key} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium">{field.label}</span>
                          {field.required && <span className="text-destructive text-xs">*</span>}
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <Select
                        value={columnMapping[field.key] || "__none__"}
                        onValueChange={val => {
                          setColumnMapping(prev => {
                            const next = { ...prev };
                            if (val === "__none__") delete next[field.key];
                            else next[field.key] = val;
                            return next;
                          });
                        }}
                      >
                        <SelectTrigger className="w-48 bg-background h-9 text-sm">
                          <SelectValue placeholder="Select column…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— Skip —</SelectItem>
                          {rawColumns.map(col => (
                            <SelectItem key={col} value={col}>{col}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {columnMapping[field.key] ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : field.required ? (
                        <XCircle className="w-4 h-4 text-destructive shrink-0" />
                      ) : (
                        <div className="w-4 h-4 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Data Preview */}
                <div className="p-4 rounded-xl bg-muted/20 border border-border/50">
                  <p className="text-xs font-medium text-muted-foreground mb-3">Data Preview</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          {rawColumns.slice(0, 6).map(col => (
                            <th key={col} className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">{col}</th>
                          ))}
                          {rawColumns.length > 6 && <th className="text-left px-3 py-2 text-muted-foreground">…</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {rawData.slice(0, 3).map((row, i) => (
                          <tr key={i} className="border-b border-muted/50">
                            {rawColumns.slice(0, 6).map(col => (
                              <td key={col} className="px-3 py-2 whitespace-nowrap truncate max-w-[150px]">{String(row[col] ?? "")}</td>
                            ))}
                            {rawColumns.length > 6 && <td className="px-3 py-2 text-muted-foreground">…</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="ghost" onClick={resetAnalysis}>Cancel</Button>
                  <Button onClick={confirmMapping}>
                    <CheckCircle2 className="w-4 h-4 mr-2" />Confirm & Process
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Idle State — Upload */}
      {step === "idle" && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
          <Card className="border-dashed border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.06),transparent_50%)]" />
            <CardContent className="py-16 relative">
              <label className="flex flex-col items-center justify-center w-full cursor-pointer group">
                <motion.div
                  className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center mb-5 group-hover:from-primary/25 group-hover:to-primary/10 transition-all duration-300"
                  whileHover={{ scale: 1.05, y: -2 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Upload className="w-9 h-9 text-primary" />
                </motion.div>
                <p className="text-lg font-semibold mb-1">Upload Performance Data</p>
                <p className="text-sm text-muted-foreground mb-5 max-w-sm text-center">
                  Upload your Excel file with employee self-review and manager review ratings
                </p>
                <div className="flex flex-wrap justify-center gap-2 mb-4">
                  {["Employee Name", "Self Review", "Manager Rating", "Department"].map(col => (
                    <Badge key={col} variant="secondary" className="text-xs font-normal">{col}</Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">.xlsx · .xls · .csv — max 20 MB</p>
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
              </label>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* KPI Strip */}
      {isDataLoaded && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: "Employees", value: kpis.totalEmployees, icon: Users, accent: "text-primary", bg: "bg-primary/10" },
              { label: "Rated", value: kpis.rated, icon: CheckCircle2, accent: "text-emerald-500", bg: "bg-emerald-500/10", sub: `${kpis.completionPct}%` },
              { label: "High Performers", value: kpis.highPerformers, icon: TrendingUp, accent: "text-emerald-500", bg: "bg-emerald-500/10" },
              { label: "Red Flags", value: kpis.redFlags, icon: AlertTriangle, accent: "text-destructive", bg: "bg-destructive/10" },
              { label: "Missing Data", value: kpis.missingManager + kpis.missingSelf, icon: Info, accent: "text-amber-500", bg: "bg-amber-500/10" },
            ].map((kpi, i) => (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className="glass-card overflow-hidden group">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{kpi.label}</span>
                      <div className={`w-7 h-7 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                        <kpi.icon className={`w-3.5 h-3.5 ${kpi.accent}`} />
                      </div>
                    </div>
                    <div className="flex items-end gap-2">
                      <AnimatedCounter value={kpi.value} className="text-2xl font-bold" />
                      {kpi.sub && <span className="text-sm text-muted-foreground mb-0.5">{kpi.sub}</span>}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* File badge */}
          <div className="flex items-center gap-3 mt-3 px-1">
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">{fileName}</span>
            <Badge className="bg-emerald-500/10 text-emerald-500 border-0 text-[10px]">
              <CheckCircle2 className="w-3 h-3 mr-1" />Processed
            </Badge>
          </div>
        </motion.div>
      )}

      {/* 9-Box Grid (contains its own validation summary, insights, missing data) */}
      {isDataLoaded && <NineBoxGrid employees={employees} />}

      {/* Department Analytics */}
      {isDataLoaded && employees.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Department Analytics
          </h2>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <DepartmentHeatmap employees={employees} />
            <DepartmentComparison employees={employees} />
          </div>
        </div>
      )}

      {/* AI Analysis */}
      {aiAnalysis && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              AI Executive Summary
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Style:</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${!narrativeMode ? "font-medium" : "text-muted-foreground"}`}>Bullets</span>
                <Switch checked={narrativeMode} onCheckedChange={setNarrativeMode} />
                <span className={`text-xs ${narrativeMode ? "font-medium" : "text-muted-foreground"}`}>Prose</span>
              </div>
            </div>
          </div>
          <AIAnalysisResults analysis={aiAnalysis} analyzedAt={aiAnalyzedAt} narrativeMode={narrativeMode} />
        </div>
      )}

      {/* AI Loading */}
      {isAnalyzing && (
        <Card className="glass-card">
          <CardContent className="py-12 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center animate-pulse-glow">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
            <p className="font-semibold">Analyzing Performance Data</p>
            <p className="text-sm text-muted-foreground">Detecting patterns, risks, and strategic recommendations…</p>
          </CardContent>
        </Card>
      )}

      {/* Prompt for AI */}
      {isDataLoaded && !aiAnalysis && !isAnalyzing && (
        <Card className="border-dashed bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="py-10 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Brain className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Ready for AI Analysis</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Get organizational insights, department analysis, red flag identification, and strategic recommendations.
              </p>
            </div>
            <Button onClick={generateAIAnalysis} size="sm">
              <Brain className="w-4 h-4 mr-2" />Generate Analysis
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PerformanceManagement;
