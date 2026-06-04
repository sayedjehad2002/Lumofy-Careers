import { useState, useMemo, useCallback, useEffect } from "react";
import lumofyLogo from "@/assets/lumofy-mark.png";
import { Link } from "react-router-dom";
import {
  Briefcase, Users, BarChart3, ChevronDown,
  Eye, EyeOff, MapPin, Clock, FileText, Star, MessageSquare,
  ArrowLeft, ExternalLink, Plus, Pencil, Trash2, Copy, Brain,
  Download, Loader2, AlertCircle, GripVertical, LayoutDashboard, AlertTriangle, Sparkles, Library, TrendingUp, Calculator, Search, ClipboardList, BookOpen, Zap, UsersRound
} from "lucide-react";
import CommandPalette from "@/components/careers/CommandPalette";
import PipelineCandidateCard from "@/components/careers/PipelineCandidateCard";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCareers } from "@/contexts/CareersContext";
import { supabase } from "@/integrations/supabase/client";
import { APPLICANT_STATUSES, STAGE_SLA_DAYS, type ApplicantStatus, type Applicant, type Job, type AIAnalysis } from "@/types/careers";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";

const tabContentVariants = {
  initial: { opacity: 0, y: 12, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
  exit: { opacity: 0, y: -8, filter: "blur(4px)", transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

const sidebarItemVariants = {
  initial: { opacity: 0, x: -12 },
  animate: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};
import { toast } from "sonner";
import DashboardAuth from "@/components/careers/DashboardAuth";
import JobFormModal from "@/components/careers/JobFormModal";
import DashboardOverview from "@/components/careers/DashboardOverview";
import CandidateProfile from "@/components/careers/CandidateProfile";
import ThemeToggle from "@/components/ThemeToggle";
import CopilotWidget, { type CopilotContext, type CrossModuleData } from "@/components/careers/CopilotWidget";
import CVLibrary from "@/components/careers/CVLibrary";
import TurnoverAnalytics from "@/components/careers/TurnoverAnalytics";
import SettlementCalculator from "@/components/careers/SettlementCalculator";
import ApplicantsListView from "@/components/careers/ApplicantsListView";
import PerformanceManagement from "@/components/careers/PerformanceManagement";
import SurveysDashboardTab from "@/components/surveys/SurveysDashboardTab";
import PoliciesTab from "@/components/careers/PoliciesTab";
import PipelineAutomation from "@/components/careers/PipelineAutomation";
import PipelineHealthScorecard from "@/components/careers/pipeline/PipelineHealthScorecard";
import StageCapacityLimits, { DEFAULT_CAPACITIES } from "@/components/careers/pipeline/StageCapacityLimits";
import StaleCandidateAlerts from "@/components/careers/pipeline/StaleCandidateAlerts";
import StageConversionHeatmap from "@/components/careers/pipeline/StageConversionHeatmap";
import BottleneckDetector from "@/components/careers/pipeline/BottleneckDetector";
import SmartAutoRouting from "@/components/careers/pipeline/SmartAutoRouting";
import PredictiveForecast from "@/components/careers/pipeline/PredictiveForecast";
import PipelineVelocityTrends from "@/components/careers/pipeline/PipelineVelocityTrends";
import StageGates, { DEFAULT_GATES, type StageGateConfig } from "@/components/careers/pipeline/StageGates";
import PipelineSnapshots from "@/components/careers/pipeline/PipelineSnapshots";
import RuleTemplates from "@/components/careers/pipeline/RuleTemplates";
import HeadcountPage from "@/components/headcount/HeadcountPage";

type Tab = "overview" | "jobs" | "applicants" | "pipeline" | "cv-library" | "analytics" | "eos-calculator" | "performance" | "copilot" | "surveys" | "policies" | "automation" | "headcount";

const Dashboard = () => {
  const { jobs, applicants, loading, sessionToken, setSessionToken, addJob, updateJob, deleteJob, deleteApplicant, updateApplicantStatus, addApplicantNote, updateApplicantAI, refreshData } = useCareers();
  const [authenticated, setAuthenticated] = useState(!!sessionToken);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [selectedJobId, setSelectedJobId] = useState<string>("all");
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [jobFormOpen, setJobFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [copilotContext, setCopilotContext] = useState<CopilotContext | null>(null);
  const [crossModuleData, setCrossModuleData] = useState<CrossModuleData>({});
  const [stageCapacities, setStageCapacities] = useState<Record<string, number>>(DEFAULT_CAPACITIES);
  const [stageGates, setStageGates] = useState<StageGateConfig[]>(DEFAULT_GATES);
  const [pipelineSubTab, setPipelineSubTab] = useState<"board" | "routing" | "alerts" | "analytics" | "gates" | "snapshots" | "templates">("board");

  const openCopilot = useCallback((ctx?: CopilotContext) => {
    setCopilotContext(ctx || null);
    setActiveTab("copilot");
  }, []);

  // Fetch cross-module data for Copilot intelligence
  useEffect(() => {
    if (!sessionToken) return;
    const fetchCrossModuleData = async () => {
      try {
        // Fetch surveys summary
        const surveyRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/survey-manage?action=list`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`, "x-session-token": sessionToken },
          body: JSON.stringify({}),
        });
        let surveys: CrossModuleData["surveys"] = [];
        if (surveyRes.ok) {
          const sData = await surveyRes.json();
          surveys = (sData.surveys || []).map((s: any) => ({
            id: s.id, title: s.title, status: s.status, category: s.category || "custom",
            responseCount: s.response_count || 0,
          }));
        }

        // Fetch turnover summary
        const turnoverRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/turnover-manage`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({ sessionToken, action: "list_entries", data: { year: new Date().getFullYear() } }),
        });
        let turnover: CrossModuleData["turnover"] = undefined;
        if (turnoverRes.ok) {
          const tData = await turnoverRes.json();
          const entries = tData.entries || [];
          const deptCounts: Record<string, number> = {};
          let voluntary = 0;
          for (const e of entries) {
            if (e.included !== false) {
              deptCounts[e.department || "Unknown"] = (deptCounts[e.department || "Unknown"] || 0) + 1;
              if (e.termination_type === "Resignation") voluntary++;
            }
          }
          const topDepts = Object.entries(deptCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([dept, count]) => ({ dept, count }));
          turnover = { totalExits: entries.length, voluntaryExits: voluntary, topDepartments: topDepts, period: `${new Date().getFullYear()}` };
        }

        // Fetch latest performance snapshot
        const perfRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-data`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({
            sessionToken, action: "select", table: "performance_snapshots",
            params: { select: "snapshot_name, total_employees, high_performers, high_potential, red_flag_count, avg_manager_rating", order: { column: "created_at", ascending: false }, limit: 1, maybeSingle: true },
          }),
        });
        let performance: CrossModuleData["performance"] = undefined;
        if (perfRes.ok) {
          const perfJson = await perfRes.json();
          const perfData = perfJson.data;
          if (perfData) {
            performance = {
              totalEmployees: perfData.total_employees,
              highPerformers: perfData.high_performers,
              highPotential: perfData.high_potential,
              redFlags: perfData.red_flag_count,
              avgRating: perfData.avg_manager_rating || 0,
              snapshotName: perfData.snapshot_name,
            };
          }
        }

        // Fetch CV Library stats
        const cvRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-data`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({
            sessionToken, action: "select", table: "cv_library_candidates",
            params: { select: "skills, suggested_department" },
          }),
        });
        let cvLibrary: CrossModuleData["cvLibrary"] = undefined;
        if (cvRes.ok) {
          const cvJson = await cvRes.json();
          const cvData = cvJson.data;
          if (cvData && cvData.length > 0) {
            const skillCounts: Record<string, number> = {};
            const deptCounts: Record<string, number> = {};
            for (const c of cvData) {
              if (c.skills) for (const s of (c.skills as string[])) skillCounts[s] = (skillCounts[s] || 0) + 1;
              if (c.suggested_department) deptCounts[c.suggested_department] = (deptCounts[c.suggested_department] || 0) + 1;
            }
            cvLibrary = {
              totalCVs: cvData.length,
              topSkills: Object.entries(skillCounts).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([skill, count]) => ({ skill, count })),
              departments: Object.entries(deptCounts).sort((a, b) => b[1] - a[1]).map(([dept, count]) => ({ dept, count })),
            };
          }
        }

        setCrossModuleData({ surveys, turnover, performance, cvLibrary });
      } catch {
        // Silent — cross-module is optional
      }
    };
    fetchCrossModuleData();
  }, [sessionToken]);

  // Confirmation dialog state for drag-and-drop
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    applicantId: string;
    applicantName: string;
    targetStatus: ApplicantStatus;
    sourceStatus: ApplicantStatus;
  }>({ open: false, applicantId: "", applicantName: "", targetStatus: "new", sourceStatus: "new" });

  const [analyticsOpen, setAnalyticsOpen] = useState(activeTab === "analytics" || activeTab === "eos-calculator" || activeTab === "performance" || activeTab === "policies");

  const mainTabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: "jobs", label: "Jobs", icon: <Briefcase className="w-4 h-4" /> },
    { id: "applicants", label: "Applicants", icon: <Users className="w-4 h-4" /> },
    { id: "pipeline", label: "Pipeline", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "automation", label: "Automation", icon: <Zap className="w-4 h-4" /> },
    { id: "cv-library", label: "CV Library", icon: <Library className="w-4 h-4" /> },
    { id: "surveys", label: "Surveys", icon: <ClipboardList className="w-4 h-4" /> },
    { id: "headcount", label: "Headcount", icon: <UsersRound className="w-4 h-4" /> },
    { id: "copilot", label: "Lumofy Copilot", icon: <Sparkles className="w-4 h-4" /> },
  ];

  const analyticsSubs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "analytics", label: "Turnover KPIs", icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: "eos-calculator", label: "End of Service", icon: <Calculator className="w-3.5 h-3.5" /> },
    { id: "performance", label: "Performance Management", icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: "policies", label: "Policies", icon: <BookOpen className="w-3.5 h-3.5" /> },
  ];

  const filteredApplicants = useMemo(() => {
    if (selectedJobId === "all") return applicants;
    return applicants.filter((a) => a.jobId === selectedJobId);
  }, [applicants, selectedJobId]);

  const handleStatusUpdate = async (applicantId: string, status: ApplicantStatus) => {
    try {
      await updateApplicantStatus(applicantId, status);
      if (selectedApplicant?.id === applicantId) {
        setSelectedApplicant(prev => prev ? { ...prev, status } : null);
      }
      toast.success(`Status updated to ${APPLICANT_STATUSES.find(s => s.value === status)?.label || status}`);
    } catch {
      toast.error("Update failed. Please retry.");
    }
  };

  const getJobTitle = (jobId: string) => jobs.find((j) => j.id === jobId)?.title || "Unknown";
  const getApplicantCount = (jobId: string) => applicants.filter((a) => a.jobId === jobId).length;
  const getStatusInfo = (status: ApplicantStatus) =>
    APPLICANT_STATUSES.find((s) => s.value === status) || APPLICANT_STATUSES[0];

  const avgRating = (a: Applicant) => {
    if (!a.rating) return null;
    const { communication, roleFit, technicalSkills, cultureFit, overallRecommendation } = a.rating;
    return ((communication + roleFit + technicalSkills + cultureFit + overallRecommendation) / 5).toFixed(1);
  };

  const handleSaveJob = async (job: Job) => {
    try {
      if (editingJob) {
        await updateJob(job);
        toast.success("Job updated successfully");
      } else {
        await addJob(job);
        toast.success("Job created successfully");
      }
    } catch {
      toast.error("Failed to save job");
    }
    setJobFormOpen(false);
    setEditingJob(null);
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!window.confirm("Are you sure you want to delete this job?")) return;
    try {
      await deleteJob(jobId);
      toast.success("Job deleted");
    } catch {
      toast.error("Failed to delete job");
    }
  };

  const handleDuplicateJob = async (job: Job) => {
    const dup: Job = { ...job, id: `job_${Date.now()}`, title: `${job.title} (Copy)`, status: "closed" };
    try {
      await addJob(dup);
      toast.success("Job duplicated as draft");
    } catch {
      toast.error("Failed to duplicate job");
    }
  };

  // --- Drag and Drop ---
  const handleDragEnd = useCallback((result: DropResult) => {
    const { draggableId, destination, source } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const targetStatus = destination.droppableId as ApplicantStatus;
    const sourceStatus = source.droppableId as ApplicantStatus;
    const applicant = applicants.find(a => a.id === draggableId);
    if (!applicant) return;

    if (targetStatus === "rejected" || targetStatus === "hired") {
      setConfirmDialog({
        open: true,
        applicantId: draggableId,
        applicantName: applicant.fullName,
        targetStatus,
        sourceStatus,
      });
      return;
    }

    handleStatusUpdate(draggableId, targetStatus);
  }, [applicants, handleStatusUpdate]);

  const handleConfirmMove = async () => {
    const { applicantId, targetStatus } = confirmDialog;
    setConfirmDialog(prev => ({ ...prev, open: false }));
    await handleStatusUpdate(applicantId, targetStatus);
  };

  const handleSessionExpired = useCallback(() => {
    setSessionToken(null);
    setAuthenticated(false);
    toast.error("Session expired. Please log in again.");
  }, [setSessionToken]);

  const handleAuthenticated = useCallback(async (token: string) => {
    setSessionToken(token);
    setAuthenticated(true);
    setTimeout(() => refreshData(), 100);
  }, [setSessionToken, refreshData]);

  if (!authenticated) {
    return <DashboardAuth onAuthenticated={handleAuthenticated} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const handleTabNavigate = (tab: string) => {
    setActiveTab(tab as Tab);
    setSelectedApplicant(null);
  };

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <CommandPalette isDashboard onNavigateDashboard={handleTabNavigate} />

      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex-shrink-0 hidden lg:flex flex-col dark:particles-bg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        <div className="p-5 border-b border-border flex items-center justify-between relative z-10">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={lumofyLogo} alt="Lumofy logo" className="w-8 h-8 object-contain rounded-md bg-white/90 p-0.5" />
            <div>
              <span className="font-semibold text-sm tracking-tight">Lumofy</span>
              <p className="text-[10px] text-muted-foreground tracking-wide uppercase font-medium">HR Dashboard</p>
            </div>
          </Link>
          <ThemeToggle />
        </div>

        {/* Search shortcut hint */}
        <div className="px-3 pt-3 relative z-10">
          <button
            onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 border border-border/50 text-xs text-muted-foreground hover:bg-secondary transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="flex-1 text-left">Search...</span>
            <span className="kbd">⌘K</span>
          </button>
        </div>

        <nav className="p-3 flex-1 space-y-0.5 relative z-10 overflow-y-auto">
          <LayoutGroup id="sidebar-nav">
            {mainTabs.slice(0, 6).map((tab, i) => (
              <motion.button
                key={tab.id}
                custom={i}
                variants={sidebarItemVariants}
                initial="initial"
                animate="animate"
                onClick={() => { setActiveTab(tab.id); setSelectedApplicant(null); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] tracking-wide transition-colors duration-200 relative overflow-hidden group ${
                  activeTab === tab.id
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground font-medium"
                }`}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="sidebar-active-bg"
                    className="absolute inset-0 bg-primary/10 dark:bg-primary/15 rounded-lg dark:shadow-[0_0_15px_hsl(217_100%_62%/0.15)]"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <motion.span
                  className="relative z-10 flex items-center"
                  animate={activeTab === tab.id ? { rotate: [0, -8, 8, 0] } : {}}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                >
                  {tab.icon}
                </motion.span>
                <span className="relative z-10">{tab.label}</span>
                {tab.id === "applicants" && applicants.length > 0 && (
                  <motion.span
                    className="ml-auto text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-semibold relative z-10"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  >
                    {applicants.length}
                  </motion.span>
                )}
              </motion.button>
            ))}

            {/* Analytics dropdown */}
            <div>
              <motion.button
                custom={6}
                variants={sidebarItemVariants}
                initial="initial"
                animate="animate"
                onClick={() => setAnalyticsOpen(!analyticsOpen)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[13px] tracking-wide transition-colors duration-200 relative overflow-hidden ${
                  (activeTab === "analytics" || activeTab === "eos-calculator" || activeTab === "performance" || activeTab === "policies")
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground font-medium"
                }`}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
              >
                {(activeTab === "analytics" || activeTab === "eos-calculator" || activeTab === "performance" || activeTab === "policies") && (
                  <motion.div
                    layoutId="sidebar-active-bg"
                    className="absolute inset-0 bg-primary/10 dark:bg-primary/15 rounded-lg dark:shadow-[0_0_15px_hsl(217_100%_62%/0.15)]"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="flex items-center gap-3 relative z-10">
                  <BarChart3 className="w-4 h-4" />
                  <span className="tracking-wide">Analytics</span>
                </span>
                <motion.span
                  className="relative z-10"
                  animate={{ rotate: analyticsOpen ? 180 : 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </motion.span>
              </motion.button>
              <AnimatePresence>
                {analyticsOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="ml-4 mt-1 space-y-0.5 border-l border-border/50 pl-3 overflow-hidden"
                  >
                    {analyticsSubs.map((sub, i) => (
                      <motion.button
                        key={sub.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05, duration: 0.25 }}
                        onClick={() => { setActiveTab(sub.id); setSelectedApplicant(null); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs tracking-wide transition-all duration-200 relative overflow-hidden ${
                          activeTab === sub.id ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-secondary font-medium"
                        }`}
                        whileHover={{ x: 2 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {activeTab === sub.id && (
                          <motion.div
                            layoutId="sidebar-active-bg"
                            className="absolute inset-0 bg-primary/10 dark:bg-primary/15 rounded-lg"
                            transition={{ type: "spring", stiffness: 350, damping: 30 }}
                          />
                        )}
                        <span className="relative z-10 flex items-center gap-2.5">
                          {sub.icon}
                          {sub.label}
                        </span>
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Remaining tabs */}
            {mainTabs.slice(6).map((tab, i) => (
              <motion.button
                key={tab.id}
                custom={7 + i}
                variants={sidebarItemVariants}
                initial="initial"
                animate="animate"
                onClick={() => { setActiveTab(tab.id); setSelectedApplicant(null); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] tracking-wide transition-colors duration-200 relative overflow-hidden group ${
                  activeTab === tab.id
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground font-medium"
                }`}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="sidebar-active-bg"
                    className="absolute inset-0 bg-primary/10 dark:bg-primary/15 rounded-lg dark:shadow-[0_0_15px_hsl(217_100%_62%/0.15)]"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <motion.span
                  className="relative z-10 flex items-center"
                  animate={activeTab === tab.id ? { rotate: [0, -8, 8, 0] } : {}}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                >
                  {tab.icon}
                </motion.span>
                <span className="relative z-10">{tab.label}</span>
              </motion.button>
            ))}
          </LayoutGroup>
        </nav>
        <div className="p-3 border-t border-border relative z-10">
          <Link to="/" className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ExternalLink className="w-4 h-4" />
            View Careers Page
          </Link>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 glass border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <span className="font-bold text-sm">Lumofy HR</span>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {[...mainTabs.slice(0, 5), { id: "analytics" as Tab, label: "Analytics", icon: <TrendingUp className="w-4 h-4" /> }, { id: "eos-calculator" as Tab, label: "EOS", icon: <Calculator className="w-4 h-4" /> }, ...mainTabs.slice(5)].map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSelectedApplicant(null); }}
                className={`px-3 py-1.5 rounded-md text-xs ${
                  activeTab === tab.id ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8 pt-20 lg:pt-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + (selectedApplicant ? '-profile' : '')}
              variants={tabContentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <DashboardOverview
              jobs={jobs}
              applicants={applicants}
              onNavigate={(tab) => setActiveTab(tab as Tab)}
            />
          )}

          {/* JOBS TAB */}
          {activeTab === "jobs" && (
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">Manage Jobs</h1>
                    <p className="text-sm text-muted-foreground">{jobs.length} vacancies · {jobs.filter(j => j.status === "open").length} open</p>
                  </div>
                </div>
                <Button onClick={() => { setEditingJob(null); setJobFormOpen(true); }} className="rounded-xl shadow-lg shadow-primary/20">
                  <Plus className="w-4 h-4 mr-2" />
                  New Job
                </Button>
              </div>

              {/* Job stat chips */}
              <div className="flex flex-wrap gap-2 mb-5">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400">
                  <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" /></span>
                  {jobs.filter(j => j.status === "open").length} open
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-xs font-medium text-muted-foreground">
                  {jobs.filter(j => j.status === "closed").length} closed
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-xs font-medium text-muted-foreground">
                  <Users className="w-3.5 h-3.5" />
                  {applicants.length} total applicants
                </div>
              </div>

              {/* Job cards */}
              <div className="space-y-3">
                {jobs.map((job, idx) => {
                  const appCount = getApplicantCount(job.id);
                  return (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: Math.min(idx * 0.04, 0.3), ease: [0.22, 1, 0.36, 1] }}
                      className={`group rounded-2xl bg-card border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 hover:shadow-lg ${
                        job.status === "open" ? "border-border hover:border-primary/20" : "border-border/50 opacity-75 hover:opacity-100"
                      }`}
                    >
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        {/* Left accent */}
                        <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${
                          job.status === "open" ? "bg-emerald-500" : "bg-muted"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <h3 className="font-semibold truncate text-base group-hover:text-primary transition-colors">{job.title}</h3>
                            <Badge
                              variant="secondary"
                              className={`text-[10px] border-0 flex-shrink-0 ${
                                job.status === "open" ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {job.status === "open" ? "Open" : "Closed"}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {job.location}</span>
                            <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {job.type}</span>
                            <span className="flex items-center gap-1.5"><Users className="w-3 h-3" /> {appCount} applicant{appCount !== 1 ? "s" : ""}</span>
                            <Badge variant="secondary" className="text-[10px] border-0 bg-secondary">{job.department}</Badge>
                          </div>
                          {job.deadline && (
                            <div className="mt-2">
                              {(() => {
                                const daysLeft = Math.ceil((new Date(job.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                if (daysLeft < 0) return <span className="text-[11px] text-muted-foreground">Deadline passed</span>;
                                if (daysLeft <= 7) return <span className="text-[11px] text-destructive font-medium">⏰ Closes in {daysLeft} day{daysLeft !== 1 ? "s" : ""}</span>;
                                return <span className="text-[11px] text-muted-foreground">{daysLeft} days remaining</span>;
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Button size="sm" variant="outline" className="rounded-xl h-8 text-xs" onClick={() => { setSelectedJobId(job.id); setActiveTab("applicants"); }}>
                          <Users className="w-3.5 h-3.5 mr-1" />View
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg" onClick={() => { setEditingJob(job); setJobFormOpen(true); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg" onClick={() => handleDuplicateJob(job)}>
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg" onClick={() => handleDeleteJob(job.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg" onClick={async () => { await updateJob({ ...job, status: job.status === "open" ? "closed" : "open" }); toast.success("Status updated"); }}>
                          {job.status === "open" ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
                {jobs.length === 0 && (
                  <div className="text-center py-20 text-muted-foreground">
                    <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
                      <Briefcase className="w-8 h-8 opacity-30" />
                    </div>
                    <p className="font-medium">No jobs created yet</p>
                    <p className="text-xs mt-1">Click "New Job" to create your first vacancy</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* APPLICANTS TAB */}
          {activeTab === "applicants" && !selectedApplicant && (
            <ApplicantsListView
              applicants={filteredApplicants}
              jobs={jobs}
              selectedJobId={selectedJobId}
              setSelectedJobId={setSelectedJobId}
              onSelectApplicant={setSelectedApplicant}
              onStatusUpdate={handleStatusUpdate}
              onDeleteApplicant={deleteApplicant}
              onOpenCopilot={openCopilot}
              getJobTitle={getJobTitle}
              avgRating={avgRating}
            />
          )}

          {/* CANDIDATE PROFILE (replaces old applicant detail) */}
          {activeTab === "applicants" && selectedApplicant && (
            <CandidateProfile
              applicant={selectedApplicant}
              job={jobs.find(j => j.id === selectedApplicant.jobId)}
              sessionToken={sessionToken}
              onBack={() => setSelectedApplicant(null)}
              onStatusUpdate={handleStatusUpdate}
              onAddNote={addApplicantNote}
              onAIComplete={(applicantId, analysis) => {
                updateApplicantAI(applicantId, analysis);
              }}
              onApplicantChange={setSelectedApplicant}
              onOpenCopilot={openCopilot}
              onDelete={async (id) => {
                await deleteApplicant(id);
                setSelectedApplicant(null);
              }}
            />
          )}

          {/* PIPELINE TAB */}
          {activeTab === "pipeline" && (
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">Pipeline Command Center</h1>
                    <p className="text-sm text-muted-foreground">Drag candidates between stages · {filteredApplicants.length} candidates</p>
                  </div>
                </div>
                <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                  <SelectTrigger className="w-56 bg-card border-border rounded-xl"><SelectValue placeholder="Filter by job" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Jobs</SelectItem>
                    {jobs.map((j) => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Health Scorecard */}
              <div className="mb-4">
                <PipelineHealthScorecard applicants={filteredApplicants} />
              </div>

              {/* Sub-tabs */}
              <div className="flex gap-1 p-1.5 rounded-2xl bg-muted/40 border border-border/40 backdrop-blur-sm overflow-x-auto scrollbar-none mb-5">
                {([
                  { id: "board" as const, label: "Kanban Board" },
                  { id: "routing" as const, label: "AI Routing" },
                  { id: "alerts" as const, label: "Alerts" },
                  { id: "analytics" as const, label: "Analytics" },
                  { id: "gates" as const, label: "Stage Gates" },
                  { id: "snapshots" as const, label: "Snapshots" },
                  { id: "templates" as const, label: "Templates" },
                ] as const).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setPipelineSubTab(tab.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-medium transition-all duration-300 whitespace-nowrap ${
                      pipelineSubTab === tab.id
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ═══ KANBAN BOARD ═══ */}
              {pipelineSubTab === "board" && (
                <>
                  {/* Stage summary chips */}
                  <div className="flex flex-wrap gap-2 mb-5">
                    {APPLICANT_STATUSES.map((status) => {
                      const count = filteredApplicants.filter(a => a.status === status.value).length;
                      const cap = stageCapacities[status.value] || 0;
                      const isOver = cap > 0 && count > cap;
                      return (
                        <div key={status.value} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${isOver ? "bg-destructive/10 border-destructive/20 text-destructive" : "bg-card border-border"}`}>
                          <div className={`w-2 h-2 rounded-full ${status.color.split(" ")[0]}`} />
                          {status.label}
                          <span className={isOver ? "text-destructive" : "text-muted-foreground"}>{count}{cap > 0 ? `/${cap}` : ""}</span>
                        </div>
                      );
                    })}
                  </div>

                  <DragDropContext onDragEnd={handleDragEnd}>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                      {APPLICANT_STATUSES.map((status) => {
                        const columnApplicants = filteredApplicants.filter((a) => a.status === status.value);
                        const cap = stageCapacities[status.value] || 0;
                        const isOver = cap > 0 && columnApplicants.length > cap;
                        return (
                          <Droppable droppableId={status.value} key={status.value}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={`min-h-[350px] rounded-2xl p-2.5 transition-all duration-200 ${
                                  snapshot.isDraggingOver
                                    ? "bg-primary/5 ring-2 ring-primary/20 border-primary/20"
                                    : isOver
                                    ? "bg-destructive/5 ring-1 ring-destructive/20"
                                    : "bg-secondary/30"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-3 px-1">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2.5 h-2.5 rounded-full ${status.color.split(" ")[0]}`} />
                                    <span className="text-xs font-semibold uppercase tracking-wider text-foreground">{status.label}</span>
                                  </div>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isOver ? "bg-destructive/20 text-destructive" : "bg-secondary text-muted-foreground"}`}>
                                    {columnApplicants.length}{cap > 0 ? `/${cap}` : ""}
                                  </span>
                                </div>
                                <div className="space-y-2">
                                  {columnApplicants.map((applicant, index) => (
                                    <Draggable key={applicant.id} draggableId={applicant.id} index={index}>
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                        >
                                          <PipelineCandidateCard
                                            applicant={applicant}
                                            jobTitle={getJobTitle(applicant.jobId)}
                                            avgRating={avgRating(applicant)}
                                            isDragging={snapshot.isDragging}
                                            onClick={() => { setSelectedApplicant(applicant); setActiveTab("applicants"); }}
                                            onOpenCopilot={() => {
                                              const jobTitle = getJobTitle(applicant.jobId);
                                              openCopilot({
                                                candidateId: applicant.id,
                                                jobId: applicant.jobId,
                                                autoPrompt: `Summarize ${applicant.fullName}'s fit for ${jobTitle} and explain their AI score.`,
                                              });
                                            }}
                                          />
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                  {columnApplicants.length === 0 && !snapshot.isDraggingOver && (
                                    <div className="text-center py-8 text-muted-foreground/40">
                                      <p className="text-[10px]">Drop here</p>
                                    </div>
                                  )}
                                  {provided.placeholder}
                                </div>
                              </div>
                            )}
                          </Droppable>
                        );
                      })}
                    </div>
                  </DragDropContext>

                  {/* Capacity Limits config */}
                  <div className="mt-5">
                    <StageCapacityLimits applicants={filteredApplicants} capacities={stageCapacities} onCapacitiesChange={setStageCapacities} />
                  </div>
                </>
              )}

              {/* ═══ AI ROUTING ═══ */}
              {pipelineSubTab === "routing" && (
                <div className="space-y-5">
                  <SmartAutoRouting applicants={filteredApplicants} onStatusUpdate={updateApplicantStatus} />
                  <PredictiveForecast applicants={filteredApplicants} />
                </div>
              )}

              {/* ═══ ALERTS ═══ */}
              {pipelineSubTab === "alerts" && (
                <StaleCandidateAlerts applicants={filteredApplicants} getJobTitle={getJobTitle} />
              )}

              {/* ═══ ANALYTICS ═══ */}
              {pipelineSubTab === "analytics" && (
                <div className="space-y-5">
                  <StageConversionHeatmap applicants={filteredApplicants} />
                  <PipelineVelocityTrends applicants={filteredApplicants} />
                  <BottleneckDetector applicants={filteredApplicants} />
                </div>
              )}

              {/* ═══ STAGE GATES ═══ */}
              {pipelineSubTab === "gates" && (
                <StageGates applicants={filteredApplicants} gates={stageGates} onGatesChange={setStageGates} />
              )}

              {/* ═══ SNAPSHOTS ═══ */}
              {pipelineSubTab === "snapshots" && (
                <PipelineSnapshots applicants={filteredApplicants} />
              )}

              {/* ═══ TEMPLATES ═══ */}
              {pipelineSubTab === "templates" && (
                <RuleTemplates onCreateRule={(template) => {
                  toast.success(`Template "${template.name}" — switch to Automation tab to manage rules`);
                }} />
              )}
            </div>
          )}

          {/* CV LIBRARY TAB */}
          {activeTab === "cv-library" && sessionToken && (
            <CVLibrary sessionToken={sessionToken} jobs={jobs.map(j => ({ id: j.id, title: j.title, department: j.department, status: j.status, requirements: j.requirements as string[] }))} onOpenCopilot={(ctx) => openCopilot({ candidateData: ctx.candidateData, autoPrompt: ctx.autoPrompt })} onSessionExpired={handleSessionExpired} />
          )}

          {/* ANALYTICS TAB */}
          {activeTab === "analytics" && sessionToken && (
            <TurnoverAnalytics sessionToken={sessionToken} />
          )}

          {/* EOS CALCULATOR TAB */}
          {activeTab === "eos-calculator" && (
            <SettlementCalculator />
          )}

          {/* PERFORMANCE MANAGEMENT TAB */}
          {activeTab === "performance" && (
            <PerformanceManagement sessionToken={sessionToken!} />
          )}

          {activeTab === "surveys" && sessionToken && (
            <SurveysDashboardTab sessionToken={sessionToken} />
          )}

          {activeTab === "policies" && (
            <PoliciesTab onAskCopilot={(prompt) => {
              setCopilotContext({ autoPrompt: prompt });
              setActiveTab("copilot");
            }} />
          )}

          {/* HEADCOUNT TAB */}
          {activeTab === "headcount" && sessionToken && (
            <HeadcountPage sessionToken={sessionToken} />
          )}

          {/* PIPELINE AUTOMATION TAB */}
          {activeTab === "automation" && sessionToken && (
            <PipelineAutomation sessionToken={sessionToken} jobs={jobs} />
          )}

          {activeTab === "copilot" && sessionToken && (
            <CopilotWidget
              jobs={jobs}
              applicants={applicants}
              sessionToken={sessionToken}
              initialContext={copilotContext}
              onClearContext={() => setCopilotContext(null)}
              onNavigateToCandidate={(applicant) => {
                setSelectedApplicant(applicant);
                setActiveTab("applicants");
              }}
              crossModuleData={crossModuleData}
              embedded
              onUpdateStatus={updateApplicantStatus}
              onAddNote={addApplicantNote}
              onRefreshData={refreshData}
            />
          )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Job Form Modal */}
      {jobFormOpen && (
        <JobFormModal
          job={editingJob}
          onSave={handleSaveJob}
          onClose={() => { setJobFormOpen(false); setEditingJob(null); }}
          sessionToken={sessionToken || ""}
        />
      )}

      {/* Confirmation Dialog for Rejected/Hired */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Move to {APPLICANT_STATUSES.find(s => s.value === confirmDialog.targetStatus)?.label}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to move <strong>{confirmDialog.applicantName}</strong> to{" "}
              <strong>{APPLICANT_STATUSES.find(s => s.value === confirmDialog.targetStatus)?.label}</strong>?
              This action can be reversed by dragging back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmMove}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
