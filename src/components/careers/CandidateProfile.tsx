import { useMemo, useState, useCallback } from "react";
import {
  ArrowLeft, FileText, Download, Eye, Loader2, AlertCircle,
  MessageSquare, Star, User, Briefcase, MoreHorizontal, Sparkles,
  Mail, Phone, MapPin, ExternalLink, Linkedin, Calendar, Globe, Trash2, FileDown } from
"lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from
"@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from
"@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AIAnalysisPanel from "@/components/careers/AIAnalysisPanel";
import InterviewPrep from "@/components/careers/applicants/InterviewPrep";
import EmailTemplates from "@/components/careers/applicants/EmailTemplates";
import ScheduleMeeting from "@/components/careers/applicants/ScheduleMeeting";
import EditableText from "@/components/careers/applicants/EditableText";
import CandidateTimeline from "@/components/careers/applicants/CandidateTimeline";
import InternalNotes from "@/components/careers/applicants/InternalNotes";
import { useApplicantEvents } from "@/hooks/use-applicant-events";
import { useCareers } from "@/contexts/CareersContext";
import { toTitleCase } from "@/lib/utils";
import { APPLICANT_STATUSES, type ApplicantStatus, type Applicant, type Job, type AIAnalysis } from "@/types/careers";

type EditableField = "fullName" | "email" | "phone" | "location" | "nationality" | "linkedin" | "portfolio";

interface CandidateProfileProps {
  applicant: Applicant;
  job: Job | undefined;
  sessionToken: string | null;
  onBack: () => void;
  onStatusUpdate: (applicantId: string, status: ApplicantStatus) => Promise<void>;
  onAddNote: (applicantId: string, note: string) => Promise<void>;
  onAIComplete: (applicantId: string, analysis: AIAnalysis) => void;
  onDelete?: (applicantId: string) => Promise<void>;
}

const getStatusInfo = (status: ApplicantStatus) =>
APPLICANT_STATUSES.find((s) => s.value === status) || APPLICANT_STATUSES[0];

const TIMELINE_STAGES: ApplicantStatus[] = ["new", "reviewing", "shortlisted", "interview"];
const TERMINAL_STAGES: ApplicantStatus[] = ["rejected", "hired"];

// Decision-first layout: a full-width Candidate Decision Header (identity + AI fit
// + status + actions), then judgment on the left (AI Hiring Intelligence, screening
// answers, interview prep) and action on the right (notes, email, CV, metadata,
// rating, timeline). Replaces the old five-cards-before-the-analysis stack.
const CandidateProfile = ({
  applicant, job, sessionToken, onBack,
  onStatusUpdate, onAddNote, onAIComplete, onDelete
}: CandidateProfileProps) => {
  const [noteSaving, setNoteSaving] = useState(false);
  const [cvLoading, setCvLoading] = useState(false);
  const [outreachTool, setOutreachTool] = useState<"none" | "email" | "meeting">("none");
  const [recovering, setRecovering] = useState(false);

  const { updateApplicantFields, jobs, refreshData } = useCareers();

  // Who moved this candidate between stages, and who wrote each note.
  const { events, reload: reloadHistory } =
    useApplicantEvents(applicant.id, sessionToken);

  // Ask the AI to transcribe the contact block off the CV. Only ever fills fields
  // that are empty (server-enforced), so it can't overwrite anything HR typed.
  const recoverContacts = useCallback(async () => {
    setRecovering(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-cv", {
        body: { action: "extract-contacts", applicantId: applicant.id, sessionToken },
      });
      if (error) throw error;
      const patched = (data?.patched as string[] | undefined) ?? [];
      if (data?.ok && patched.length > 0) {
        toast.success(`Found ${patched.map((f) => f.replace("full_name", "name")).join(" + ")} in the CV`);
        refreshData();
      } else if (data?.reason === "no_readable_cv") {
        toast.error("This CV can't be read (Word files and scans aren't supported)");
      } else {
        toast.info("No contact details are printed on this CV");
      }
    } catch {
      toast.error("Couldn't read the CV — please try again");
    } finally {
      setRecovering(false);
    }
  }, [applicant.id, sessionToken, refreshData]);
  // "Change job": reassign this applicant to a different job's pipeline.
  const [moveJobOpen, setMoveJobOpen] = useState(false);
  const [targetJobId, setTargetJobId] = useState("");
  const [movingJob, setMovingJob] = useState(false);

  const currentJobTitle = job?.title || applicant.jobTitle || "Unknown Position";
  // Open jobs the applicant can be moved to (everything open except their current one).
  const moveTargets = useMemo(
    () => jobs.filter((j) => j.status === "open" && j.id !== applicant.jobId),
    [jobs, applicant.jobId]
  );

  const handleMoveToJob = async () => {
    const target = moveTargets.find((j) => j.id === targetJobId);
    if (!target) { toast.error("Pick a job to move this candidate to"); return; }
    setMovingJob(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-applicant", {
        body: {
          sessionToken,
          applicantId: applicant.id,
          updates: { job_id: target.id, job_title: target.title },
        },
      });
      if (error || data?.error) throw error || new Error(data.error);

      // Audit trail: record the move as a note (atomic server-side append).
      const moveNote = `Moved from "${currentJobTitle}" to "${target.title}" on ${new Date().toLocaleDateString()}`;
      onAddNote(applicant.id, moveNote).catch(() => { /* non-fatal */ });

      // The fit score is job-specific — re-run the analysis for the NEW role in the
      // background (same fire-and-forget pattern as the apply flow). Skipped for
      // Word CVs, which the AI can't read.
      const isWordCv = /\.docx?$/i.test(applicant.cvStoragePath || "");
      if (applicant.cvStoragePath && !isWordCv) {
        supabase.functions.invoke("auto-analyze-applicant", {
          body: { applicantId: applicant.id, sessionToken },
        }).catch(() => { /* non-blocking */ });
      }

      refreshData();
      toast.success(`${applicant.fullName || "Candidate"} moved to ${target.title} — re-running AI analysis for the new role`);
      setMoveJobOpen(false);
      setTargetJobId("");
    } catch (e: any) {
      toast.error(e?.message || "Couldn't move the candidate — is the latest update-applicant deployed?");
    } finally {
      setMovingJob(false);
    }
  };
  // Inline-edit a candidate field (Notion-style): persist, then reflect locally.
  // Throws on failure so the editor stays open for a retry.
  const saveField = async (field: EditableField, value: string) => {
    try {
      await updateApplicantFields(applicant.id, { [field]: value } as Partial<Pick<Applicant, EditableField>>);
      toast.success("Saved");
    } catch (e) {
      toast.error("Couldn't save changes");
      throw e;
    }
  };

  const statusInfo = getStatusInfo(applicant.status);

  // fullName can legitimately be "" (a CV whose file name carries no name, and the
  // AI hasn't backfilled one yet). Never render a fake "Unknown" — show a real
  // empty state and let HR type it. `displayName` is only for prose/toasts.
  const displayName = applicant.fullName || "This candidate";

  const [answeredScreening, unansweredScreening] = useMemo(() => {
    const qs = job?.screeningQuestions ?? [];
    const answered = qs.filter((q) => String(applicant.screeningAnswers?.[q.id] ?? "").trim());
    return [answered, qs.filter((q) => !answered.includes(q))];
  }, [job?.screeningQuestions, applicant.screeningAnswers]);
  const initials = useMemo(() => {
    const parts = applicant.fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "—";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [applicant.fullName]);

  const avgRating = applicant.rating ?
  (
  ((applicant.rating.communication ?? 0) +
  (applicant.rating.roleFit ?? 0) +
  (applicant.rating.technicalSkills ?? 0) +
  (applicant.rating.cultureFit ?? 0) +
  (applicant.rating.overallRecommendation ?? 0)) / 5).
  toFixed(1) :
  null;

  // Collapse exact duplicate notes into one entry with a count (graceful dupes).
  const openCv = useCallback(async (inline: boolean) => {
    if (!applicant.cvStoragePath) {
      toast.error("No CV file available");
      return;
    }
    setCvLoading(true);
    try {
      // Pass the applicantId so the edge function resolves the CV path
      // server-side (prevents IDOR via arbitrary storagePath). `inline` = View
      // (render the PDF in a new tab); otherwise Download (served as an attachment).
      const { data, error } = await supabase.functions.invoke("get-cv-url", {
        body: { applicantId: applicant.id, sessionToken, inline }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      let url: string = data.url;
      if (inline) {
        // Belt-and-braces: strip any download-disposition param so the browser
        // renders the PDF inline (View) even if a stale edge-function version
        // appended it. The param is not part of the signed token, so removing it
        // keeps the URL valid.
        try {
          const u = new URL(url);
          u.searchParams.delete("download");
          url = u.toString();
        } catch { /* keep original URL */ }
      }
      window.open(url, "_blank");
    } catch (e: any) {
      toast.error(e.message || (inline ? "Failed to open CV" : "Failed to download CV"));
    } finally {
      setCvLoading(false);
    }
  }, [applicant.cvStoragePath, applicant.id, sessionToken]);

  const handleAddNote = async (raw: string) => {
    const text = raw.trim();
    if (!text || noteSaving) return; // guard re-entry (double click / Enter+click)
    setNoteSaving(true);
    try {
      await onAddNote(applicant.id, text);
      // Pull the history back so the new note appears with your name on it
      // immediately, rather than only after a reload.
      void reloadHistory();
      toast.success("Note added");
    } catch {
      toast.error("Couldn't save the note. Please try again.");
    } finally {
      setNoteSaving(false);
    }
  };

  const handleStatusChange = async (status: ApplicantStatus) => {
    try {
      await onStatusUpdate(applicant.id, status);
      void reloadHistory();
    } catch {
      // onStatusUpdate already toasted; keep the profile showing the REAL status.
    }
  };

  // Stage strip state
  const stageIndex = TIMELINE_STAGES.indexOf(applicant.status);
  const isTerminal = TERMINAL_STAGES.includes(applicant.status);

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Back
      </button>

      {/* ===== Candidate Decision Header — identity, AI fit, status, actions ===== */}
      <motion.div
        className="mb-6 rounded-2xl border border-border bg-card p-5 light-glow"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}>

        {/* Identity | decision | actions. The fit score, confidence and rating
            chips that used to sit here were removed: all three are rendered in
            full below (score gauge + verdict line + Rating card), and repeating
            them competed for the same glance without adding information. */}
        <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
          <div className="flex min-w-0 flex-1 items-center gap-3.5">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold tracking-wide text-primary ring-1 ring-inset ring-primary/15">
              {initials}
            </div>
            <div className="min-w-0">
              <h1 className="min-w-0 text-xl font-bold tracking-tight">
                <EditableText
                  value={applicant.fullName}
                  onSave={(v) => saveField("fullName", v)}
                  className="text-xl font-bold"
                  ariaLabel="candidate name"
                  placeholder="Add candidate name"
                />
              </h1>
              <p className="truncate text-sm text-muted-foreground">
                {job?.title || applicant.jobTitle || "Unknown Position"} · Applied {new Date(applicant.appliedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
              {/* Contact line: how to reach them is the first thing HR needs after
                  knowing who they are, so it sits with the identity rather than
                  only in the sidebar. When it's missing, say so plainly and offer
                  the one-click CV read right where the gap is noticed. */}
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                {applicant.email ? (
                  <a
                    href={`mailto:${applicant.email}`}
                    className="inline-flex min-w-0 items-center gap-1.5 rounded text-primary-readable transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    title={`Email ${displayName}`}>
                    <Mail className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                    <span className="truncate">{applicant.email}</span>
                  </a>
                ) : (
                  <span className="inline-flex flex-wrap items-center gap-1.5 text-muted-foreground">
                    <Mail className="h-3 w-3 flex-shrink-0 text-[hsl(var(--intel-warning))]" aria-hidden="true" />
                    No email found on this CV
                    {applicant.cvStoragePath && (
                      <button
                        onClick={recoverContacts}
                        disabled={recovering}
                        className="inline-flex items-center gap-1 rounded font-medium text-primary-readable transition-colors hover:underline disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        {recovering
                          ? <><Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Reading the CV…</>
                          : <><Sparkles className="h-3 w-3" aria-hidden="true" /> Look again</>}
                      </button>
                    )}
                  </span>
                )}
                {applicant.phone && (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                    {applicant.phone}
                  </span>
                )}
              </div>
              {!applicant.fullName && (
                <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <AlertCircle className="h-3 w-3 flex-shrink-0 text-[hsl(var(--intel-warning))]" aria-hidden="true" />
                  No name found in the CV file name — click above to add it.
                </p>
              )}
            </div>
          </div>

          {/* One primary action (the CV is the artefact HR came for), the decision
              control beside it, everything rarer behind the overflow menu. */}
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={applicant.status}
              onValueChange={(v) => handleStatusChange(v as ApplicantStatus)}>
              <SelectTrigger aria-label="Update status" className={`h-9 w-36 border-0 text-xs font-medium transition-shadow hover:shadow-sm ${statusInfo.color}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPLICANT_STATUSES.map((s) =>
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                )}
              </SelectContent>
            </Select>
            {applicant.cvStoragePath && (
              <>
                <Button size="sm" className="h-9 gap-1.5" onClick={() => openCv(true)} disabled={cvLoading} title="View CV in a new tab">
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  View CV
                </Button>
                <Button
                  size="sm" variant="outline" className="h-9 w-9 p-0"
                  onClick={() => openCv(false)} disabled={cvLoading}
                  aria-label="Download CV" title="Download CV">
                  {cvLoading
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    : <Download className="h-3.5 w-3.5" aria-hidden="true" />}
                </Button>
              </>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-9 w-9 p-0" aria-label="More actions" title="More actions">
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => { setTargetJobId(""); setMoveJobOpen(true); }}>
                  <Briefcase className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                  Change job
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    // Defer the ~205KB jspdf/html2canvas stack until an export is actually requested.
                    const { generateCandidateReport } = await import("@/utils/candidateReportPdf");
                    // Async now: it waits on the letterhead logo before drawing.
                    await generateCandidateReport(applicant, job);
                  }}>
                  <FileDown className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                  Export PDF report
                </DropdownMenuItem>
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => {
                        if (window.confirm(`Delete ${displayName}'s application permanently?`)) {
                          onDelete(applicant.id).then(() => {
                            toast.success(`${displayName} has been removed`);
                            onBack();
                          }).catch(() => toast.error("Failed to delete applicant"));
                        }
                      }}>
                      <Trash2 className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                      Delete applicant
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Change-job dialog: reassign this applicant to another open job's
            pipeline. Their stage is KEPT, the move is recorded as a note, and the
            AI analysis re-runs in the background for the new role. */}
        <Dialog open={moveJobOpen} onOpenChange={setMoveJobOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" aria-hidden="true" />
                Move to another job
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-lg bg-secondary/30 p-3">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground">
                  Currently in <span className="font-medium text-foreground">{currentJobTitle}</span> · {statusInfo.label}
                </p>
              </div>
              <div>
                <p className="mb-2 text-sm text-muted-foreground">Move to:</p>
                <Select value={targetJobId} onValueChange={setTargetJobId}>
                  <SelectTrigger aria-label="Select target job"><SelectValue placeholder="Select a job..." /></SelectTrigger>
                  <SelectContent>
                    {moveTargets.map((j) => (
                      <SelectItem key={j.id} value={j.id}>
                        <span className="flex items-center gap-2">
                          <Briefcase className="h-3 w-3" aria-hidden="true" />
                          {j.title} · {j.department}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {moveTargets.length === 0 && (
                  <p className="mt-3 text-center text-sm text-muted-foreground">No other open jobs available</p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Their stage ({statusInfo.label}) is kept, the move is logged in Notes, and the AI
                fit score re-runs automatically for the new role.
              </p>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setMoveJobOpen(false)}>Cancel</Button>
              <Button onClick={handleMoveToJob} disabled={!moveTargets.find((j) => j.id === targetJobId) || movingJob}>
                {movingJob ? <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden="true" /> : <Briefcase className="mr-1 h-4 w-4" aria-hidden="true" />}
                Move candidate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Slim pipeline strip */}
        <div className="mt-4 flex items-center gap-0 border-t border-border pt-3.5">
          {TIMELINE_STAGES.map((stage, i) => {
            const isPast = stageIndex >= i || isTerminal;
            const isCurrent = applicant.status === stage;
            const info = getStatusInfo(stage);
            return (
              <div key={stage} className="flex flex-1 items-center">
                <div className="flex flex-1 flex-col items-center">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium transition-all ${
                    isCurrent ?
                    "bg-primary text-primary-foreground ring-4 ring-primary/20" :
                    isPast ?
                    "bg-primary/20 text-primary-readable" :
                    "bg-secondary text-muted-foreground"}`}>
                    {i + 1}
                  </div>
                  <span className={`mt-1 text-[10px] ${isCurrent ? "font-medium text-primary-readable" : "text-muted-foreground"}`}>
                    {info.label}
                  </span>
                </div>
                {i < TIMELINE_STAGES.length - 1 &&
                <div className={`-mx-1 h-0.5 flex-1 ${stageIndex > i || isTerminal ? "bg-primary/40" : "bg-border"}`} />
                }
              </div>);
          })}
          <div className="ml-2 flex flex-col items-center">
            {applicant.status === "rejected" ?
            <>
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive/20 text-[10px] font-medium text-destructive-readable ring-4 ring-destructive/10">✕</div>
                <span className="mt-1 text-[10px] font-medium text-destructive-readable">Rejected</span>
              </> :
            applicant.status === "hired" ?
            <>
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[hsl(var(--intel-success)/0.2)] text-[10px] font-medium text-[hsl(var(--intel-success))] ring-4 ring-[hsl(var(--intel-success)/0.1)]">✓</div>
                <span className="mt-1 text-[10px] font-medium text-[hsl(var(--intel-success))]">Hired</span>
              </> :
            <>
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-[10px] text-muted-foreground">?</div>
                <span className="mt-1 text-[10px] text-muted-foreground">Outcome</span>
              </>
            }
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ===== Left column — judgment ===== */}
        <div className="space-y-6 lg:col-span-2">
          {/* AI Hiring Intelligence — the decision-support core, straight under the header */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}>
            <AIAnalysisPanel
              applicant={applicant}
              job={job}
              sessionToken={sessionToken}
              onAnalysisComplete={(applicantId, analysis) => {
                onAIComplete(applicantId, analysis);
                // analyze-cv also backfills an EMPTY name / email / phone straight
                // from the CV it just read, so pull the row again — otherwise the
                // recovered contact details wouldn't appear until a manual reload
                // and Quick email would still look unavailable.
                refreshData();
              }} />
          </motion.div>

          {/* Screening answers — what the candidate actually said */}
          {job && job.screeningQuestions.length > 0 &&
          <motion.div
            className="rounded-2xl border border-border bg-card p-5 light-glow sm:p-6"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-semibold">Screening answers</h2>
                <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  {answeredScreening.length}/{job.screeningQuestions.length} answered
                </span>
              </div>
              {/* An unanswered question is not worth a full-width empty box: a
                  CV-Library candidate never sees the form at all, so rendering four
                  "—" panels filled a screen with nothing. Answered questions get the
                  space; the rest collapse to one line. */}
              {answeredScreening.length === 0 ? (
                <p className="rounded-lg bg-secondary/50 px-3 py-2.5 text-sm text-muted-foreground">
                  No screening answers on file — this candidate was added directly rather than through the application form.
                </p>
              ) : (
                <div className="space-y-4">
                  {answeredScreening.map((q) => (
                    <div key={q.id}>
                      <p className="mb-1 text-sm font-medium">{q.question}</p>
                      <p className="rounded-lg bg-secondary p-3 text-sm text-foreground/90">
                        {applicant.screeningAnswers[q.id]}
                      </p>
                    </div>
                  ))}
                  {unansweredScreening.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {unansweredScreening.length} question{unansweredScreening.length === 1 ? "" : "s"} left unanswered.
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          }

          {/* Interview prep kit — judgment support for the next stage */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}>
            <InterviewPrep applicant={applicant} job={job} />
          </motion.div>
        </div>

        {/* ===== Right column — action ===== */}
        <div className="space-y-6">
          {/* Internal notes */}
          <InternalNotes
            notes={applicant.notes}
            events={events}
            saving={noteSaving}
            onAdd={handleAddNote}
          />

          {/* Outreach — opened on demand. Both tools are full-height forms; left
              permanently expanded they pushed the CV, candidate details and
              timeline about two screens down, for actions HR usually isn't taking
              on a first review. Only one is open at a time (no nested cards). */}
          <motion.div
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}>
            {outreachTool === "none" ? (
              <div className="rounded-2xl border border-border bg-card p-4 light-glow">
                <h3 className="mb-3 flex items-center gap-2 font-semibold">
                  <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
                  Outreach
                </h3>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5 transition-transform hover:-translate-y-0.5" onClick={() => setOutreachTool("email")}>
                    <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                    Write email
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 transition-transform hover:-translate-y-0.5" onClick={() => setOutreachTool("meeting")}>
                    <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                    Schedule
                  </Button>
                </div>
                {/* The recovery action lives once, in the header contact line where
                    the missing email is actually noticed. */}
                {!applicant.email && (
                  <p className="mt-2.5 text-[11px] text-muted-foreground">
                    No email on file — email and scheduling need one. Use “Look again” under their name to read it off the CV.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => setOutreachTool("none")}
                  className="flex items-center gap-1.5 rounded-md text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <ArrowLeft className="h-3 w-3" aria-hidden="true" />
                  Back to outreach
                </button>
                {/* Hidden, not unmounted: collapsing must never discard a
                    half-written email or a chosen meeting time. */}
                <div className={outreachTool === "email" ? undefined : "hidden"}>
                  <EmailTemplates applicant={applicant} job={job} />
                </div>
                <div className={outreachTool === "meeting" ? undefined : "hidden"}>
                  <ScheduleMeeting applicant={applicant} job={job} />
                </div>
              </div>
            )}
          </motion.div>

          {/* CV / attachments */}
          <motion.div
            className="rounded-2xl border border-border bg-card p-5 light-glow"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}>
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <FileText className="w-4 h-4 text-primary" aria-hidden="true" />
              CV / Resume
            </h3>
            {applicant.cvStoragePath ?
            <div className="flex items-center justify-between gap-3 rounded-lg bg-secondary p-3">
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{applicant.cvFileName}</span>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                    {applicant.cvFileSize != null && applicant.cvFileSize > 0 &&
                  <span>{applicant.cvFileSize < 1024 * 1024 ? `${(applicant.cvFileSize / 1024).toFixed(1)} KB` : `${(applicant.cvFileSize / 1024 / 1024).toFixed(2)} MB`}</span>
                  }
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => openCv(true)} disabled={cvLoading}>
                    <Eye className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                    View
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openCv(false)} disabled={cvLoading}>
                    {cvLoading ?
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden="true" /> :
                  <Download className="mr-1 h-3.5 w-3.5" aria-hidden="true" />}
                    {cvLoading ? "Loading…" : "Download"}
                  </Button>
                </div>
              </div> :
            <div className="flex items-center gap-2 rounded-lg bg-secondary p-3 text-muted-foreground">
                <AlertCircle className="w-4 h-4" aria-hidden="true" />
                <span className="text-sm">No CV uploaded</span>
              </div>
            }
          </motion.div>

          {/* Candidate details (metadata) */}
          <motion.div
            className="rounded-2xl border border-border bg-card p-5 light-glow"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}>
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <User className="w-4 h-4 text-primary" aria-hidden="true" />
              Candidate Details
            </h3>
            {/* Inline-editable details — click any field to edit, auto-saves on blur/Enter. */}
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                <EditableText value={applicant.email} inputType="email" onSave={(v) => saveField("email", v)} placeholder="Add email" ariaLabel="email" className="text-sm" />
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                <EditableText value={applicant.phone} inputType="tel" onSave={(v) => saveField("phone", v)} placeholder="Add phone" ariaLabel="phone" className="text-sm" />
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                <EditableText value={applicant.location} onSave={(v) => saveField("location", v)} placeholder="Add location" ariaLabel="location" className="text-sm" />
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Globe className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                <EditableText value={applicant.nationality || ""} onSave={(v) => saveField("nationality", v)} placeholder="Add nationality" ariaLabel="nationality" className="text-sm" />
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                Applied {new Date(applicant.appliedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </div>
              <div className="flex items-center gap-2 border-t border-border pt-2.5 text-muted-foreground">
                <Linkedin className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                <EditableText value={applicant.linkedin || ""} inputType="url" onSave={(v) => saveField("linkedin", v)} placeholder="Add LinkedIn URL" ariaLabel="LinkedIn URL" className="text-sm" />
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                <EditableText value={applicant.portfolio || ""} inputType="url" onSave={(v) => saveField("portfolio", v)} placeholder="Add portfolio URL" ariaLabel="portfolio URL" className="text-sm" />
              </div>
            </div>
          </motion.div>

          {/* Rating (when present) */}
          {applicant.rating &&
          <motion.div
            className="rounded-2xl border border-border bg-card p-5 light-glow"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}>
              <h3 className="mb-3 flex items-center gap-2 font-semibold">
                <Star className="w-4 h-4 text-[hsl(var(--intel-warning))]" aria-hidden="true" />
                Rating
              </h3>
              <div className="space-y-2 text-sm">
                {Object.entries(applicant.rating).map(([key, val]) =>
              <div key={key} className="flex items-center justify-between">
                    <span className="capitalize text-muted-foreground">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((i) =>
                  <Star
                    key={i}
                    aria-hidden="true"
                    className={`h-3.5 w-3.5 ${
                    i <= val ? "fill-[hsl(var(--intel-warning))] text-[hsl(var(--intel-warning))]" : "text-muted"}`} />
                  )}
                    </div>
                  </div>
              )}
                <div className="flex items-center justify-between border-t border-border pt-2 font-medium">
                  <span>Average</span>
                  <span className="text-primary-readable">{avgRating}/5</span>
                </div>
              </div>
            </motion.div>
          }

          {/* Candidate timeline */}
          <motion.div
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}>
            <CandidateTimeline applicant={applicant} events={events} />
          </motion.div>
        </div>
      </div>
    </div>);

};

export default CandidateProfile;
