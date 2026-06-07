import { useState, useMemo, useCallback, useEffect } from "react";
import lumofyLogo from "@/assets/lumofy-mark.png";
import { Link } from "react-router-dom";
import {
  Briefcase, Users, BarChart3, ChevronDown,
  Eye, EyeOff, MapPin, Clock, FileText, Star, MessageSquare,
  ArrowLeft, ExternalLink, LogOut, Plus, Pencil, Trash2, Copy, Brain,
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
import CVLibrary from "@/components/careers/CVLibrary";
import SettlementCalculator from "@/components/careers/SettlementCalculator";
import ApplicantsListView from "@/components/careers/ApplicantsListView";
import PipelineHealthScorecard from "@/components/careers/pipeline/PipelineHealthScorecard";
import StageCapacityLimits, { DEFAULT_CAPACITIES } from "@/components/careers/pipeline/StageCapacityLimits";

type Tab = "overview" | "jobs" | "applicants" | "pipeline" | "cv-library" | "eos-calculator";

// Client-side gate for pipeline stage moves. Server-side enforcement is handled
// separately; this just prevents obviously-illegal drags in the UI.
// A candidate may advance to the next stage(s), be rejected from any active
// stage, or be moved back one step (to correct mistakes). "hired"/"rejected"
// are terminal except for reverting out of them.
const ALLOWED_TRANSITIONS: Record<ApplicantStatus, ApplicantStatus[]> = {
  new: ["reviewing", "shortlisted", "rejected"],
  reviewing: ["new", "shortlisted", "interview", "rejected"],
  shortlisted: ["reviewing", "interview", "rejected"],
  interview: ["shortlisted", "hired", "rejected"],
  hired: ["interview"],
  rejected: ["new", "reviewing", "shortlisted", "interview"],
};

const Dashboard = () => {
  const { jobs, applicants, loading, sessionToken, authReady, addJob, updateJob, deleteJob, deleteApplicant, updateApplicantStatus, addApplicantNote, updateApplicantAI } = useCareers();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [selectedJobId, setSelectedJobId] = useState<string>("all");
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [jobFormOpen, setJobFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [stageCapacities, setStageCapacities] = useState<Record<string, number>>(DEFAULT_CAPACITIES);
  const [deleteJobTarget, setDeleteJobTarget] = useState<Job | null>(null);
  const [deletingJob, setDeletingJob] = useState(false);

  // Confirmation dialog state for drag-and-drop
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    applicantId: string;
    applicantName: string;
    targetStatus: ApplicantStatus;
    sourceStatus: ApplicantStatus;
  }>({ open: false, applicantId: "", applicantName: "", targetStatus: "new", sourceStatus: "new" });

  const mainTabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: "jobs", label: "Jobs", icon: <Briefcase className="w-4 h-4" /> },
    { id: "applicants", label: "Applicants", icon: <Users className="w-4 h-4" /> },
    { id: "pipeline", label: "Pipeline", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "cv-library", label: "CV Library", icon: <Library className="w-4 h-4" /> },
    { id: "eos-calculator", label: "End of Service", icon: <Calculator className="w-4 h-4" /> },
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

  const handleConfirmDeleteJob = async () => {
    if (!deleteJobTarget) return;
    setDeletingJob(true);
    try {
      await deleteJob(deleteJobTarget.id);
      toast.success("Job deleted");
      setDeleteJobTarget(null);
    } catch {
      toast.error("Failed to delete job");
    } finally {
      setDeletingJob(false);
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

    // Ignore illegal stage transitions (e.g. new → hired directly).
    if (!ALLOWED_TRANSITIONS[sourceStatus]?.includes(targetStatus)) {
      toast.error(
        `Can't move from "${APPLICANT_STATUSES.find(s => s.value === sourceStatus)?.label ?? sourceStatus}" to "${APPLICANT_STATUSES.find(s => s.value === targetStatus)?.label ?? targetStatus}".`
      );
      return;
    }

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

  const handleSessionExpired = useCallback(async () => {
    await supabase.auth.signOut();
    toast.error("Session expired. Please log in again.");
  }, []);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    toast.success("Signed out.");
  }, []);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!sessionToken) {
    return <DashboardAuth />;
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
      <aside className="w-64 bg-card border-r border-border flex-shrink-0 hidden lg:flex flex-col dark:particles-bg">
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
            {mainTabs.map((tab, i) => (
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

          </LayoutGroup>
        </nav>
        <div className="p-3 border-t border-border relative z-10 space-y-1">
          <Link to="/" className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ExternalLink className="w-4 h-4" />
            View Careers Page
          </Link>
          <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-destructive transition-colors">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 glass border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Link to="/" className="flex items-center gap-2">
            <img src={lumofyLogo} alt="Lumofy logo" className="w-7 h-7 object-contain rounded-md bg-white/90 p-0.5" />
            <span className="font-bold text-sm">Lumofy HR</span>
          </Link>
          <ThemeToggle />
        </div>
        {/* Horizontally scrollable tab strip — keeps all tabs reachable with
            ≥44px tap targets instead of cramming them into the header row. */}
        <nav
          aria-label="Dashboard sections"
          className="flex items-center gap-1.5 px-3 pb-2 overflow-x-auto scrollbar-none"
        >
          {mainTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedApplicant(null); }}
              aria-current={activeTab === tab.id ? "page" : undefined}
              className={`flex items-center gap-1.5 shrink-0 min-h-[44px] px-3.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "bg-secondary/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="flex items-center" aria-hidden="true">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8 pt-28 lg:pt-8">
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
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[hsl(var(--intel-success)/0.1)] border border-[hsl(var(--intel-success)/0.2)] text-xs font-medium text-[hsl(var(--intel-success))]">
                  <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--intel-success))] opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-[hsl(var(--intel-success))]" /></span>
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
                          job.status === "open" ? "bg-[hsl(var(--intel-success))]" : "bg-muted"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <h3 className="font-semibold truncate text-base group-hover:text-primary transition-colors">{job.title}</h3>
                            <Badge
                              variant="secondary"
                              className={`text-[10px] border-0 flex-shrink-0 ${
                                job.status === "open" ? "bg-[hsl(var(--intel-success)/0.15)] text-[hsl(var(--intel-success))]" : "bg-muted text-muted-foreground"
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
                          <Users className="w-3.5 h-3.5 mr-1" aria-hidden="true" />View
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg" onClick={() => { setEditingJob(job); setJobFormOpen(true); }} aria-label={`Edit ${job.title}`}>
                          <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg" onClick={() => handleDuplicateJob(job)} aria-label={`Duplicate ${job.title}`}>
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg" onClick={() => setDeleteJobTarget(job)} aria-label={`Delete ${job.title}`}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" aria-hidden="true" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg" onClick={async () => { await updateJob({ ...job, status: job.status === "open" ? "closed" : "open" }); toast.success("Status updated"); }} aria-label={job.status === "open" ? `Close ${job.title}` : `Reopen ${job.title}`}>
                          {job.status === "open" ? <EyeOff className="w-3.5 h-3.5" aria-hidden="true" /> : <Eye className="w-3.5 h-3.5" aria-hidden="true" />}
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
            </div>
          )}

          {/* CV LIBRARY TAB */}
          {activeTab === "cv-library" && sessionToken && (
            <CVLibrary sessionToken={sessionToken} jobs={jobs.map(j => ({ id: j.id, title: j.title, department: j.department, status: j.status, requirements: j.requirements as string[] }))} onSessionExpired={handleSessionExpired} />
          )}

          {/* EOS CALCULATOR TAB */}
          {activeTab === "eos-calculator" && (
            <SettlementCalculator />
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

      {/* Delete Job Confirmation */}
      <AlertDialog open={!!deleteJobTarget} onOpenChange={(open) => !open && !deletingJob && setDeleteJobTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this job?</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const count = deleteJobTarget ? getApplicantCount(deleteJobTarget.id) : 0;
                return (
                  <>
                    You're about to permanently delete <strong>{deleteJobTarget?.title}</strong>.
                    {count > 0 ? (
                      <>
                        {" "}This will also delete its{" "}
                        <strong>{count} applicant{count !== 1 ? "s" : ""}</strong> and their CVs.
                      </>
                    ) : (
                      " This job has no applicants."
                    )}
                    {" "}This action cannot be undone.
                  </>
                );
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingJob}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletingJob}
              onClick={(e) => { e.preventDefault(); handleConfirmDeleteJob(); }}
            >
              {deletingJob ? "Deleting..." : "Delete Job"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
