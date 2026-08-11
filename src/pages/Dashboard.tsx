import { useState, useMemo, useCallback, useEffect, lazy, Suspense } from "react";
import lumofyLogo from "@/assets/lumofy-mark.png";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Briefcase, Users, Columns3, ExternalLink, LogOut,
  Loader2, LayoutDashboard, Library, Search, UserCog, UserX
} from "lucide-react";
import CommandPalette from "@/components/careers/CommandPalette";
import { Button } from "@/components/ui/button";
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
import { emailInitials } from "@/lib/utils";
import { APPLICANT_STATUSES, type ApplicantStatus, type Applicant, type Job } from "@/types/careers";
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
import ThemeToggle from "@/components/ThemeToggle";
import DashboardAuth from "@/components/careers/DashboardAuth";
import JobFormModal from "@/components/careers/JobFormModal";
const DashboardOverview = lazy(() => import("@/components/careers/DashboardOverview")); // lazy: keeps the Overview screen's own code out of the dashboard's initial bundle, so first paint isn't gated on whichever tab loads it
import CandidateProfile from "@/components/careers/CandidateProfile";
import CVLibrary from "@/components/careers/CVLibrary";
import HrTeam from "@/components/careers/HrTeam";
import { jobApplyUrl, copyJobLink } from "@/components/careers/ShareJobLink";
import JobsView from "@/components/careers/jobs/JobsView";
import ApplicantsRoster from "@/components/careers/applicants/ApplicantsRoster";
// lazy: the board pulls in @hello-pangea/dnd, which no other tab needs — keeping
// it behind a dynamic import takes the whole drag-and-drop chunk off the
// dashboard's critical path, same as DashboardOverview above.
const PipelineBoard = lazy(() => import("@/components/careers/pipeline/PipelineBoard"));
// lazy: shares the recharts chunk — only loaded when the Sources sub-route opens.
const SourceAnalytics = lazy(() => import("@/components/careers/applicants/SourceAnalytics"));
// From its own module, deliberately: importing these from PipelineBoard.tsx would
// pull the board back into this chunk and undo the lazy split above.
import { INITIAL_PIPELINE_VIEW, type PipelineViewState } from "@/components/careers/pipeline/pipelineView";

type Tab = "overview" | "jobs" | "applicants" | "pipeline" | "cv-library" | "hr-team";

const TAB_IDS: Tab[] = ["overview", "jobs", "applicants", "pipeline", "cv-library", "hr-team"];
const isTab = (v: string | undefined): v is Tab => !!v && (TAB_IDS as string[]).includes(v);
/** Every section has its own path, e.g. /dashboard/cv-library/insights. */
export const dashboardPath = (tab: string, sub?: string) => `/dashboard/${tab}${sub ? `/${sub}` : ""}`;

/** framer-motion wrapper around react-router's Link, so nav items keep their
 *  animations while still rendering a real anchor the browser can open. */
const MotionLink = motion(Link);

// Client-side gate for pipeline stage moves. Server-side enforcement is handled
// separately; this just prevents obviously-illegal drags in the UI.
// A candidate may advance to the next stage(s), be rejected from any active
// stage, or be moved back one step (to correct mistakes). "hired"/"rejected"
// are terminal except for reverting out of them.
const Dashboard = () => {
  const { jobs, applicants, loading, sessionToken, authReady, isHrUser, hrEmail, hrRole, hrChecked, addJob, updateJob, archiveJob, restoreJob, deleteApplicant, updateApplicantStatus, updateApplicantStatusBulk, addApplicantNote, updateApplicantAI, refreshData } = useCareers();
  // The section lives in the URL rather than component state: every tab is then
  // bookmarkable, shareable, survives a refresh, and the browser's back button
  // and "open in new tab" behave the way people expect.
  const { tab: tabParam, sub: subParam } = useParams<{ tab?: string; sub?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab: Tab = isTab(tabParam) ? tabParam : "overview";
  const setActiveTab = useCallback(
    (t: Tab, sub?: string) => navigate(dashboardPath(t, sub)),
    [navigate]
  );
  const [selectedJobId, setSelectedJobId] = useState<string>("all");

  /**
   * The open candidate is the URL, not component state.
   *
   * `/dashboard/applicants/<id>` reuses the existing `:tab/:sub` route, so a
   * candidate can be bookmarked, shared with a hiring manager, opened in a new
   * tab, and survives a refresh.
   *
   * Deriving it from the live `applicants` array also removes a whole class of
   * bug: this used to be a snapshot COPY held in state, which meant every
   * mutation had to be hand-mirrored back into it (a status write and an
   * onApplicantChange callback both did) or the open profile silently showed
   * stale data. There is nothing to keep in sync now.
   */
  const openApplicantId = activeTab === "applicants" ? subParam : undefined;
  const selectedApplicant = useMemo(
    () => (openApplicantId ? applicants.find((a) => a.id === openApplicantId) ?? null : null),
    [applicants, openApplicantId]
  );
  /** Set when the id in the URL matches nobody — a deleted or mistyped link, once the data is in. */
  const applicantNotFound = !!openApplicantId && !selectedApplicant && !loading;

  /**
   * Which screen sent you here, so Close can put you back. Without this, closing a
   * candidate you opened from the board dropped you on the Applicants list and you
   * lost your place mid-triage. A shared link carries no origin and falls back to
   * the list.
   */
  const profileOrigin: Tab = isTab(searchParams.get("from") ?? undefined)
    ? (searchParams.get("from") as Tab)
    : "applicants";

  /** Open a candidate's page, remembering where the click came from. */
  const openApplicant = useCallback(
    (applicantId: string, from: Tab) =>
      navigate(`${dashboardPath("applicants", applicantId)}?from=${from}`),
    [navigate]
  );

  /** Href for a candidate, so names can be real anchors that middle-click and ⌘-click. */
  const applicantHref = useCallback(
    (applicantId: string, from: Tab) => `${dashboardPath("applicants", applicantId)}?from=${from}`,
    []
  );

  const closeApplicant = useCallback(
    () => navigate(dashboardPath(profileOrigin)),
    [navigate, profileOrigin]
  );

  /** Pre-bound per screen, and stable so memoized children stay memoized. */
  const pipelineApplicantHref = useCallback(
    (applicantId: string) => applicantHref(applicantId, "pipeline"),
    [applicantHref]
  );
  const listApplicantHref = useCallback(
    (applicantId: string) => applicantHref(applicantId, "applicants"),
    [applicantHref]
  );
  const overviewApplicantHref = useCallback(
    (applicantId: string) => applicantHref(applicantId, "overview"),
    [applicantHref]
  );
  const [jobFormOpen, setJobFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [deleteJobTarget, setDeleteJobTarget] = useState<Job | null>(null);
  const [deletingJob, setDeletingJob] = useState(false);

  // The board's search / sort / collapse choices live here rather than inside it:
  // the tab content unmounts on every tab switch, and losing a search halfway
  // through triage because you looked something up on Applicants is maddening.
  const [pipelineView, setPipelineView] = useState<PipelineViewState>(INITIAL_PIPELINE_VIEW);

  /**
   * The Pipeline board manages its own height; every other screen scrolls the
   * page. Opening a candidate now navigates to `/dashboard/applicants/<id>`, so
   * the profile is never rendered under the pipeline tab and this is simply
   * "is the board on screen".
   */
  const boardLayout = activeTab === "pipeline";

  const mainTabs: { id: Tab; label: string; icon: React.ReactNode; group: string }[] = [
    { id: "overview", label: "Overview", icon: <LayoutDashboard className="w-4 h-4" />, group: "Hiring" },
    { id: "jobs", label: "Jobs", icon: <Briefcase className="w-4 h-4" />, group: "Hiring" },
    { id: "applicants", label: "Applicants", icon: <Users className="w-4 h-4" />, group: "Hiring" },
    { id: "pipeline", label: "Pipeline", icon: <Columns3 className="w-4 h-4" />, group: "Hiring" },
    { id: "cv-library", label: "CV Library", icon: <Library className="w-4 h-4" />, group: "Talent" },
    { id: "hr-team", label: "HR Team", icon: <UserCog className="w-4 h-4" />, group: "Tools" },
  ];
  const navGroups = ["Hiring", "Talent", "Tools"];

  const filteredApplicants = useMemo(() => {
    if (selectedJobId === "all") return applicants;
    return applicants.filter((a) => a.jobId === selectedJobId);
  }, [applicants, selectedJobId]);

  const handleStatusUpdate = async (applicantId: string, status: ApplicantStatus) => {
    try {
      // No profile-mirroring step here any more: the open candidate is derived
      // from the URL against the live applicants array, so the optimistic update
      // inside updateApplicantStatus is already what the profile renders.
      await updateApplicantStatus(applicantId, status);
      toast.success(`Status updated to ${APPLICANT_STATUSES.find(s => s.value === status)?.label || status}`);
    } catch (e) {
      toast.error("Update failed. Please retry.");
      throw e; // let callers (profile select, batch move) know it did NOT stick
    }
  };

  const getJobTitle = (jobId: string) => jobs.find((j) => j.id === jobId)?.title || "Unknown";
  const getApplicantCount = (jobId: string) => applicants.filter((a) => a.jobId === jobId).length;
  const activeJobs = jobs.filter((j) => !j.archivedAt);
  const archivedJobs = jobs.filter((j) => j.archivedAt);
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
        try {
          await navigator.clipboard.writeText(jobApplyUrl(job.id));
          toast.success("Job created. Apply link copied, share it on LinkedIn!");
        } catch {
          toast.success("Job created successfully");
        }
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
      await archiveJob(deleteJobTarget.id);
      toast.success("Job archived. Applicants are kept, restore it anytime.");
      setDeleteJobTarget(null);
    } catch {
      toast.error("Failed to archive job");
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

  const handleToggleJobStatus = async (job: Job) => {
    try {
      await updateJob({ ...job, status: job.status === "open" ? "closed" : "open" });
      toast.success(job.status === "open" ? "Job closed to new applicants" : "Job reopened");
    } catch {
      toast.error("Could not change the job status.");
    }
  };

  const handleRestoreJob = async (job: Job) => {
    try {
      await restoreJob(job.id);
      toast.success("Job restored");
    } catch {
      toast.error("Could not restore the job.");
    }
  };

  /** Share actions live here so the row only has to call a named callback. */
  const shareJobToLinkedIn = (jobId: string) =>
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(jobApplyUrl(jobId))}`,
      "_blank", "noopener,noreferrer",
    );
  const openJobPublicPage = (jobId: string) =>
    window.open(jobApplyUrl(jobId), "_blank", "noopener,noreferrer");

  const handleSessionExpired = useCallback(async () => {
    await supabase.auth.signOut();
    toast.error("Session expired. Please log in again.");
  }, []);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    toast.success("Signed out.");
  }, []);

  if (!authReady || (sessionToken && !hrChecked)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!sessionToken) {
    return <DashboardAuth />;
  }

  // Signed in, but not on the HR allowlist → no access (the server denies the
  // data too; this is the matching UI).
  if (!isHrUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-semibold text-foreground">Access not authorized</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You're signed in, but this account isn't on the HR team yet. Ask an admin to send you an invite, then sign in again.
          </p>
          <Button variant="outline" size="sm" onClick={handleSignOut} className="mt-5 rounded-xl">Sign out</Button>
        </div>
      </div>
    );
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
  };

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <CommandPalette isDashboard onNavigateDashboard={handleTabNavigate} />

      {/* Sidebar */}
      <aside className="w-64 bg-[hsl(var(--intel-card))] border-r border-[hsl(var(--intel-border))] flex-shrink-0 hidden lg:flex flex-col">
        <div className="p-5 border-b border-border flex items-center justify-between relative z-10">
          <Link to="/" className="group flex items-center gap-2.5" aria-label="Lumofy HR Dashboard — home">
            <img src={lumofyLogo} alt="" aria-hidden="true" className="h-9 w-9 shrink-0 object-contain transition-transform duration-300 group-hover:scale-105" />
            <div>
              <span className="block text-base font-extrabold leading-none tracking-tight text-foreground">Lumofy</span>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">HR Dashboard</p>
            </div>
          </Link>        </div>

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

        <nav className="p-3 flex-1 space-y-4 relative z-10 overflow-y-auto">
          <LayoutGroup id="sidebar-nav">
            {navGroups.map((group) => (
              <div key={group} className="space-y-0.5">
                <p className="px-3 pb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/50">{group}</p>
                {mainTabs.filter((t) => t.group === group).map((tab) => (
                  // A real <a href>, not a button: only an anchor gives the
                  // browser's "Open link in new tab" on right-click, which is
                  // what made every section feel like one page.
                  <MotionLink
                    key={tab.id}
                    to={dashboardPath(tab.id)}
                    custom={mainTabs.indexOf(tab)}
                    variants={sidebarItemVariants}
                    initial="initial"
                    animate="animate"
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
                        className="absolute inset-0 rounded-lg bg-primary/10 dark:bg-primary/15"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center">{tab.icon}</span>
                    <span className="relative z-10">{tab.label}</span>
                    {tab.id === "applicants" && applicants.length > 0 && (
                      <span className="relative z-10 ml-auto rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        {applicants.length}
                      </span>
                    )}
                  </MotionLink>
                ))}
              </div>
            ))}
          </LayoutGroup>
        </nav>
        {/* Utilities first, identity last: the account block anchors the foot of
            the rail, which is where people reach for it, and it keeps Sign out
            grouped with the account it signs out of rather than floating among
            unrelated links. */}
        <div className="relative z-10 space-y-0.5 border-t border-border p-3">
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
            View careers page
          </Link>
          <div className="flex items-center justify-between rounded-lg px-3 py-1.5">
            <span className="text-sm text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>

          {/* The one branded surface in the chrome: Lumofy's grid motif, so the
              account block reads as part of the product rather than a form field. */}
          {hrEmail && (
            <div className="lx-grid-card group/account mt-2 rounded-xl border border-border/70 bg-secondary/30 p-2.5 transition-colors duration-200 hover:border-primary/30">
              <div className="flex items-center gap-2.5">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary ring-0 ring-primary/20 transition-all duration-200 group-hover/account:bg-primary/25 group-hover/account:ring-4"
                  aria-hidden="true"
                >
                  {emailInitials(hrEmail)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold leading-tight text-foreground" title={hrEmail}>
                    {hrEmail}
                  </p>
                  {/* Role is surfaced because it decides what the server will
                      accept: a viewer's edits come back refused, so it is fairer
                      to say so before they try than after. */}
                  {hrRole && (
                    <span
                      className={`mt-1 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium capitalize leading-none ${
                        hrRole === "owner"
                          ? "bg-primary/15 text-primary"
                          : hrRole === "viewer"
                            ? "bg-secondary text-muted-foreground"
                            : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {hrRole === "viewer" ? "Viewer · read-only" : hrRole}
                    </span>
                  )}
                </div>
              </div>
              {/* No divider rule here. The grid's vertical lines crossed it and
                  turned it into a row of tick marks that read as a second,
                  misaligned grid. Spacing separates the two blocks well enough. */}
              <div className="mt-2 pt-0.5">
                <button
                  onClick={handleSignOut}
                  className="group/signout flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors duration-200 hover:bg-destructive/10 hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50"
                >
                  {/* Leaving-the-building nudge: the icon slides out as you hover,
                      so the direction of the action is legible before you click. */}
                  <LogOut
                    className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover/signout:translate-x-0.5"
                    aria-hidden="true"
                  />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 glass border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <Link to="/" className="flex items-center gap-2" aria-label="Lumofy HR Dashboard — home">
            <img src={lumofyLogo} alt="" aria-hidden="true" className="h-7 w-7 shrink-0 object-contain" />
            <span className="text-sm font-extrabold tracking-tight text-foreground">
              Lumofy <span className="font-semibold text-muted-foreground">HR</span>
            </span>
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
            <Link
              key={tab.id}
              to={dashboardPath(tab.id)}
              aria-current={activeTab === tab.id ? "page" : undefined}
              className={`flex items-center gap-1.5 shrink-0 min-h-[44px] px-3.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "bg-secondary/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="flex items-center" aria-hidden="true">{tab.icon}</span>
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Main content.

          The Pipeline board is the one tab that fills the viewport instead of
          scrolling the page: a kanban whose columns scroll independently needs a
          known height. That takes an unbroken `min-h-0` chain from here down to
          the card lists — flex items default to `min-height: auto` and refuse to
          shrink below their content, which is why the board previously had to
          guess its own height with `max-h-[calc(100vh-20rem)]`.

          Every class below is conditional so the other five tabs keep scrolling
          the page exactly as before. */}
      <main id="main" className={`flex-1 min-h-0 ${boardLayout ? "flex flex-col overflow-hidden" : "overflow-y-auto"}`}>
        <div className={`p-6 lg:p-8 pt-28 lg:pt-8 ${boardLayout ? "flex min-h-0 flex-1 flex-col overflow-hidden" : ""}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + (selectedApplicant ? '-profile' : '')}
              variants={tabContentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className={boardLayout ? "flex min-h-0 flex-1 flex-col" : undefined}
            >
          {/* OVERVIEW TAB */}
          {/* Sources is analytics, so it lives with the Overview rather than on the
              roster. A sub-route, not a ninth block: the Overview was deliberately
              cut from 14 blocks to 8, and bolting this on would undo that. */}
          {activeTab === "overview" && subParam === "sources" && (
            <Suspense fallback={<div className="flex items-center justify-center py-32"><Loader2 className="w-6 h-6 animate-spin text-primary" aria-label="Loading" /></div>}>
              <div className="mb-3">
                <Link
                  to={dashboardPath("overview")}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  &larr; Back to Overview
                </Link>
              </div>
              <SourceAnalytics applicants={applicants} getJobTitle={getJobTitle} />
            </Suspense>
          )}

          {activeTab === "overview" && subParam !== "sources" && (
            <Suspense fallback={<div className="flex items-center justify-center py-32"><Loader2 className="w-6 h-6 animate-spin text-primary" aria-label="Loading" /></div>}>
              <DashboardOverview
                jobs={jobs}
                applicants={applicants}
                onNavigate={(tab) => setActiveTab(tab as Tab)}
                applicantHref={overviewApplicantHref}
                onOpenSources={() => setActiveTab("overview", "sources")}
              />
            </Suspense>
          )}

          {/* JOBS TAB */}
          {activeTab === "jobs" && (
            <JobsView
              jobs={activeJobs}
              applicants={applicants}
              archivedJobs={archivedJobs}
              onCreate={() => { setEditingJob(null); setJobFormOpen(true); }}
              onOpen={(jobId) => { setSelectedJobId(jobId); setActiveTab("applicants"); }}
              onEdit={(job) => { setEditingJob(job); setJobFormOpen(true); }}
              onDuplicate={handleDuplicateJob}
              onArchive={setDeleteJobTarget}
              onToggleStatus={handleToggleJobStatus}
              onRestore={handleRestoreJob}
              onCopyLink={copyJobLink}
              onShareLinkedIn={shareJobToLinkedIn}
              onOpenPublicPage={openJobPublicPage}
              applicantCount={getApplicantCount}
            />
          )}

          {/* APPLICANTS TAB — the list, unless the URL names a candidate.
              Keyed off the id in the URL rather than off a resolved applicant, so a
              cold deep link doesn't flash the whole list for a frame before the
              profile appears. */}
          {activeTab === "applicants" && !openApplicantId && (
            <ApplicantsRoster
              applicants={filteredApplicants}
              jobs={jobs}
              selectedJobId={selectedJobId}
              onJobChange={setSelectedJobId}
              applicantHref={listApplicantHref}
              onBulkStatusUpdate={updateApplicantStatusBulk}
              onDeleteApplicant={deleteApplicant}
              onAnalysisComplete={(applicantId, analysis) => {
                updateApplicantAI(applicantId, analysis).catch(() => {
                  toast.error("Analysis finished but could not be saved — please re-run it.");
                });
              }}
              getJobTitle={getJobTitle}
              sessionToken={sessionToken}
            />
          )}

          {/* A shared link opened cold: the applicants array arrives over the
              network, so hold the frame rather than claiming the person is gone. */}
          {activeTab === "applicants" && openApplicantId && !selectedApplicant && !applicantNotFound && (
            <div className="flex items-center justify-center py-32">
              <Loader2 className="w-6 h-6 animate-spin text-primary" aria-label="Loading candidate" />
            </div>
          )}

          {/* The id matched nobody — a deleted candidate or a mistyped link. Say so
              instead of silently showing the list under a URL that names a person. */}
          {activeTab === "applicants" && applicantNotFound && (
            <div className="flex flex-col items-center justify-center gap-3 py-32 text-center">
              <UserX className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="font-semibold">Candidate not found</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  This candidate may have been deleted, or the link is wrong.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={closeApplicant}>
                Back to {profileOrigin === "pipeline" ? "Pipeline" : "Applicants"}
              </Button>
            </div>
          )}

          {/* CANDIDATE PROFILE (replaces old applicant detail) */}
          {activeTab === "applicants" && selectedApplicant && (
            <CandidateProfile
              applicant={selectedApplicant}
              job={jobs.find(j => j.id === selectedApplicant.jobId)}
              sessionToken={sessionToken}
              onBack={closeApplicant}
              onStatusUpdate={handleStatusUpdate}
              onAddNote={addApplicantNote}
              onAIComplete={(applicantId, analysis) => {
                updateApplicantAI(applicantId, analysis).catch(() => {
                  toast.error("Analysis finished but could not be saved — please re-run it.");
                });
              }}
              onDelete={async (id) => {
                await deleteApplicant(id);
                closeApplicant();
              }}
            />
          )}

          {/* PIPELINE TAB */}
          {activeTab === "pipeline" && (
            <Suspense fallback={<div className="flex min-h-0 flex-1 items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" aria-label="Loading" /></div>}>
              <PipelineBoard
                applicants={applicants}
                jobs={jobs}
                selectedJobId={selectedJobId}
                onJobChange={setSelectedJobId}
                onStatusUpdate={handleStatusUpdate}
                onBulkStatusUpdate={updateApplicantStatusBulk}
                onOpenApplicant={(a) => openApplicant(a.id, "pipeline")}
                applicantHref={pipelineApplicantHref}
                view={pipelineView}
                onViewChange={setPipelineView}
              />
            </Suspense>
          )}

          {/* CV LIBRARY TAB */}
          {activeTab === "cv-library" && sessionToken && (
            <CVLibrary
              sessionToken={sessionToken}
              jobs={jobs.map(j => ({ id: j.id, title: j.title, department: j.department, status: j.status, requirements: j.requirements as string[] }))}
              onSessionExpired={handleSessionExpired}
              // Sub-tab is the third URL segment, e.g. /dashboard/cv-library/insights
              subTab={subParam}
              onSubTabChange={(sub) => navigate(dashboardPath("cv-library", sub), { replace: true })}
            />
          )}

          {/* HR TEAM TAB */}
          {activeTab === "hr-team" && sessionToken && (
            <HrTeam sessionToken={sessionToken} />
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

      {/* Delete Job Confirmation */}
      <AlertDialog open={!!deleteJobTarget} onOpenChange={(open) => !open && !deletingJob && setDeleteJobTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this job?</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const count = deleteJobTarget ? getApplicantCount(deleteJobTarget.id) : 0;
                return (
                  <>
                    You're about to archive <strong>{deleteJobTarget?.title}</strong>. It will be removed from the public careers site.
                    {count > 0 ? (
                      <>
                        {" "}Its <strong>{count} applicant{count !== 1 ? "s" : ""}</strong> are kept and stay in the dashboard.
                      </>
                    ) : (
                      " This job has no applicants."
                    )}
                    {" "}You can restore it anytime from the Archived list.
                  </>
                );
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingJob}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingJob}
              onClick={(e) => { e.preventDefault(); handleConfirmDeleteJob(); }}
            >
              {deletingJob ? "Archiving..." : "Archive Job"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
