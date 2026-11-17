import { useMemo, useState, useCallback } from "react";
import {
  ArrowLeft, FileText, Download, Eye, Loader2, AlertCircle,
  MessageSquare, Star, User, Briefcase, MoreHorizontal, Sparkles,
  Mail, Phone, MapPin, ExternalLink, Linkedin, Calendar, Globe, Trash2, FileDown, Check, X } from
"lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from
"@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from
"@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { STATUS_COLORS, fitBand } from "@/components/careers/statusColors";
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
import { readApplicantCv } from "@/components/careers/applicants/useContactSweep";
import { contactPatch, repairGluedName } from "@/lib/cvContacts";
import { isLibraryCandidate } from "@/lib/candidateTimeline";
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
  // Delete goes through the shared AlertDialog rather than window.confirm.
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { updateApplicantFields, jobs, refreshData } = useCareers();

  // Who moved this candidate between stages, and who wrote each note.
  const { events, reload: reloadHistory } =
    useApplicantEvents(applicant.id, sessionToken);

  // Read the contact block off the CV. First without AI: the CV's own text and
  // links, pattern-matched in the browser (instant, free, cannot invent an
  // address). Only a CV with no text layer at all (a scan) goes to the AI, which
  // can read images. Either way only EMPTY fields are filled.
  const recoverContacts = useCallback(async () => {
    setRecovering(true);
    try {
      const reading = await readApplicantCv(applicant, sessionToken).catch(() => null);
      if (reading?.readable) {
        const patch = contactPatch(applicant, reading.contacts);
        const labels = Object.keys(patch).map((k) => (k === "linkedin" ? "LinkedIn" : k));
        if (labels.length > 0) {
          try {
            await updateApplicantFields(applicant.id, patch);
          } catch (e) {
            // One application per email per role: the CV's address is already on
            // another application for this role, so this one is a duplicate.
            if (!patch.email) throw e;
            const { email: _taken, ...rest } = patch;
            if (Object.keys(rest).length > 0) await updateApplicantFields(applicant.id, rest);
            toast.warning("The email on this CV is already on another application for this role, so this looks like a duplicate.");
            return;
          }
          toast.success(`Found ${labels.join(" + ")} in the CV`);
        } else if (!reading.contacts.email) {
          toast.info("This CV doesn't print an email. LinkedIn PDF exports usually leave it out.");
        } else {
          toast.info("Nothing new on the CV: what it prints is already on file");
        }
        return;
      }
      if (reading && reading.reason === "not_pdf") {
        toast.error("This CV isn't a PDF, so it can't be read here");
        return;
      }
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
  }, [applicant, sessionToken, refreshData, updateApplicantFields]);
  // A name stored as one run ("Sarahshaikh"): offer to split it, but only using
  // words the CV itself prints, so a genuine single name is never rewritten.
  const looksGlued = /^\p{L}{8,}$/u.test(applicant.fullName.trim()) && !!applicant.cvStoragePath;
  const [fixingName, setFixingName] = useState(false);
  const fixNameFromCv = useCallback(async () => {
    setFixingName(true);
    try {
      const reading = await readApplicantCv(applicant, sessionToken);
      const fixed = reading.readable ? repairGluedName(applicant.fullName, reading.text) : null;
      if (fixed) {
        await updateApplicantFields(applicant.id, { fullName: fixed });
        toast.success(`Name corrected to ${fixed}`);
      } else {
        toast.info("The CV doesn't print this name as separate words, so it was left as it is");
      }
    } catch {
      toast.error("Couldn't read the CV. Please try again");
    } finally {
      setFixingName(false);
    }
  }, [applicant, sessionToken, updateApplicantFields]);

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

      // The fit score is job-specific, but AI analysis is manual only: HR re-runs
      // it for the new role from this profile when they choose to.
      refreshData();
      toast.success(`${applicant.fullName || "Candidate"} moved to ${target.title}. Re-run AI analysis to score them for this role.`);
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

  const score = applicant.aiAnalysis?.fitScore;
  const fileSize = applicant.cvFileSize != null && applicant.cvFileSize > 0
    ? applicant.cvFileSize < 1024 * 1024
      ? `${(applicant.cvFileSize / 1024).toFixed(1)} KB`
      : `${(applicant.cvFileSize / 1024 / 1024).toFixed(2)} MB`
    : null;

  return (
    <div className="cv-detail pp">
      <button type="button" onClick={onBack} className="cv-back">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to applicants
      </button>

      {/* ===== Identity hero: who, for what, how to reach them, where they stand, and the actions ===== */}
      <motion.section
        className="cv-hero dx-card pp-hero"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        aria-label="Candidate">
        <div className="pp-hero__top">
          <div className="cv-hero__id">
            <span className="cv-hero__avatar" aria-hidden="true">{initials}</span>
            <div className="min-w-0">
              <h1 className="dx-title pp-name">
                <EditableText
                  value={applicant.fullName}
                  onSave={(v) => saveField("fullName", v)}
                  className="font-display font-extrabold"
                  ariaLabel="candidate name"
                  placeholder="Add candidate name"
                />
              </h1>
              <p className="pp-role">
                <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="truncate">{currentJobTitle}</span>
                <span className="pp-dot" aria-hidden="true" />
                {isLibraryCandidate(applicant) ? "Added from CV Library" : "Applied"} {new Date(applicant.appliedDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </p>
              {/* Contact line: how to reach them is the first thing HR needs after
                  knowing who they are. When it's missing, say so plainly and offer
                  the one-click CV read right where the gap is noticed. */}
              <div className="pp-contact">
                {applicant.email ? (
                  <a href={`mailto:${applicant.email}`} className="pp-contact__link" title={`Email ${displayName}`}>
                    <Mail className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                    <span className="truncate">{applicant.email}</span>
                  </a>
                ) : (
                  <span className="pp-contact__warn">
                    <Mail className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                    No email found on this CV
                    {applicant.cvStoragePath && (
                      <button type="button" onClick={recoverContacts} disabled={recovering} className="dx-link inline-flex items-center gap-1 disabled:opacity-60">
                        {recovering
                          ? <><Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Reading the CV…</>
                          : <><Sparkles className="h-3 w-3" aria-hidden="true" /> Look again</>}
                      </button>
                    )}
                  </span>
                )}
                {applicant.phone && (
                  <span className="pp-contact__item">
                    <Phone className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                    {applicant.phone}
                  </span>
                )}
              </div>
              {looksGlued && (
                <p className="pp-contact__item mt-1">
                  This name may be two words run together.
                  <button type="button" onClick={fixNameFromCv} disabled={fixingName} className="dx-link inline-flex items-center gap-1 disabled:opacity-60">
                    {fixingName
                      ? <><Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Reading the CV…</>
                      : "Check it against the CV"}
                  </button>
                </p>
              )}
              {!applicant.fullName && (
                <p className="pp-contact__warn mt-1">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                  No name found in the CV file name — click above to add it.
                </p>
              )}
              <div className="cv-hero__badges">
                <span className="ar-stage">
                  <i style={{ background: STATUS_COLORS[applicant.status] }} aria-hidden="true" />
                  {statusInfo.label}
                </span>
                {score != null && (
                  <span className={`ar-fit ar-fit--${fitBand(score)}`} title={`AI fit score ${score} of 100`}>{score}</span>
                )}
                {applicant.aiAnalysis?.recommendation && <span className="cv-rec">{applicant.aiAnalysis.recommendation}</span>}
                {avgRating && (
                  <span className="cv-rec inline-flex items-center gap-1" title="Average interviewer rating">
                    <Star className="h-3 w-3" aria-hidden="true" /> {avgRating}/5
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* The decision control, the CV (the artefact HR came for), everything
              rarer behind the overflow menu. */}
          <div className="cv-hero__actions pp-actions">
            <Select value={applicant.status} onValueChange={(v) => handleStatusChange(v as ApplicantStatus)}>
              <SelectTrigger aria-label="Update stage" className="dx-tool pp-stage-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPLICANT_STATUSES.map((st) => <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {applicant.cvStoragePath && (
              <>
                <button type="button" className="dx-btn dx-btn--primary" onClick={() => openCv(true)} disabled={cvLoading} title="View CV in a new tab">
                  <Eye aria-hidden="true" /> View CV
                </button>
                <button type="button" className="dx-btn dx-btn--secondary" onClick={() => openCv(false)} disabled={cvLoading} aria-label="Download CV" title="Download CV">
                  {cvLoading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />}
                </button>
              </>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="dx-btn dx-btn--secondary" aria-label="More actions" title="More actions">
                  <MoreHorizontal aria-hidden="true" />
                </button>
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
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setConfirmDelete(true)}>
                      <Trash2 className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                      Delete applicant
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* The path: the same lit line as the Overview, from first look to hire.
            Stages behind the candidate are lit; the outcome sits at the end. */}
        <ol className="pp-path" aria-label="Hiring stage">
          {TIMELINE_STAGES.map((stage, i) => {
            const isCurrent = applicant.status === stage;
            const isPast = isTerminal || stageIndex > i;
            return (
              <li
                key={stage}
                className={`pp-step${isCurrent ? " is-current" : isPast ? " is-past" : ""}`}
                aria-current={isCurrent ? "step" : undefined}>
                <span className="pp-step__node" aria-hidden="true">{isPast ? <Check className="h-3 w-3" /> : i + 1}</span>
                <span className="pp-step__label">{getStatusInfo(stage).label}</span>
              </li>
            );
          })}
          <li
            className={`pp-step pp-step--outcome${applicant.status === "hired" ? " is-hired" : applicant.status === "rejected" ? " is-rejected" : ""}`}
            aria-current={isTerminal ? "step" : undefined}>
            <span className="pp-step__node" aria-hidden="true">
              {applicant.status === "hired" ? <Check className="h-3 w-3" /> : applicant.status === "rejected" ? <X className="h-3 w-3" /> : "?"}
            </span>
            <span className="pp-step__label">
              {applicant.status === "hired" ? "Hired" : applicant.status === "rejected" ? "Rejected" : "Outcome"}
            </span>
          </li>
        </ol>
      </motion.section>

      {/* Change-job dialog: reassign this applicant to another open job's
          pipeline. Their stage is KEPT and the move is recorded as a note. */}
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
              Their stage ({statusInfo.label}) is kept and the move is logged in Notes. AI analysis is
              manual: re-run it from this profile to score them for the new role.
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

      {/* Delete confirmation (was window.confirm). */}
      {onDelete && (
        <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {displayName}'s application?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes the application, its notes and its AI analysis. It cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  onDelete(applicant.id).then(() => {
                    toast.success(`${displayName} has been removed`);
                    onBack();
                  }).catch(() => toast.error("Failed to delete applicant"));
                }}>
                Delete applicant
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <div className="cv-detail__grid pp-grid">
        {/* ===== Main column — judgment ===== */}
        <div className="cv-detail__main">
          {/* AI Hiring Intelligence — the decision-support core, straight under the header */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}>
            <AIAnalysisPanel
              applicant={applicant}
              job={job}
              sessionToken={sessionToken}
              onAnalysisComplete={(applicantId, analysis) => {
                onAIComplete(applicantId, analysis);
                // analyze-cv also backfills an EMPTY name / email / phone straight
                // from the CV it just read, so pull the row again — otherwise the
                // recovered contact details wouldn't appear until a manual reload.
                refreshData();
              }} />
          </motion.div>

          {/* Screening answers — what the candidate actually said */}
          {/* A library candidate was never asked the questions: an empty "0 of 4
              answered" panel reads as if they skipped them. */}
          {job && job.screeningQuestions.length > 0 && !(isLibraryCandidate(applicant) && answeredScreening.length === 0) && (
            <motion.section
              className="dx-card cv-panel"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              aria-labelledby="pp-screening">
              <div className="flex items-center justify-between gap-3">
                <h2 className="cv-panel__title" id="pp-screening">
                  <MessageSquare className="h-4 w-4" aria-hidden="true" /> Screening answers
                </h2>
                <span className="dx-count">{answeredScreening.length} of {job.screeningQuestions.length} answered</span>
              </div>
              {/* Answered questions get the space; the rest collapse to one line. */}
              {answeredScreening.length === 0 ? (
                <p className="cv-prose text-muted-foreground">
                  No screening answers on file — this candidate was added directly rather than through the application form.
                </p>
              ) : (
                <div className="pp-answers">
                  {answeredScreening.map((q) => (
                    <div key={q.id} className="pp-answer">
                      <p className="pp-answer__q">{q.question}</p>
                      <p className="pp-answer__a">{applicant.screeningAnswers[q.id]}</p>
                    </div>
                  ))}
                  {unansweredScreening.length > 0 && (
                    <p className="cv-hint">
                      {unansweredScreening.length} question{unansweredScreening.length === 1 ? "" : "s"} left unanswered.
                    </p>
                  )}
                </div>
              )}
            </motion.section>
          )}

          {/* Interview prep kit — judgment support for the next stage */}
          {/* The kit is assembled from the stored AI analysis, so there is nothing
              to build it from until one exists. */}
          {applicant.aiAnalysis && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15 }}>
              <InterviewPrep applicant={applicant} job={job} />
            </motion.div>
          )}
        </div>

        {/* ===== Rail — action ===== */}
        <aside className="pp-rail">
          {/* Internal notes */}
          <InternalNotes notes={applicant.notes} events={events} saving={noteSaving} onAdd={handleAddNote} />

          {/* Outreach — opened on demand; only one tool open at a time. */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}>
            {outreachTool === "none" ? (
              <section className="dx-card cv-panel" aria-labelledby="pp-outreach">
                <h2 className="cv-panel__title" id="pp-outreach">
                  <Mail className="h-4 w-4" aria-hidden="true" /> Outreach
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" className="dx-btn dx-btn--secondary" onClick={() => setOutreachTool("email")}>
                    <Mail aria-hidden="true" /> Write email
                  </button>
                  <button type="button" className="dx-btn dx-btn--secondary" onClick={() => setOutreachTool("meeting")}>
                    <Calendar aria-hidden="true" /> Schedule
                  </button>
                </div>
                {!applicant.email && (
                  <p className="cv-hint">
                    No email on file — email and scheduling need one. Use “Look again” under their name to read it off the CV.
                  </p>
                )}
              </section>
            ) : (
              <div className="space-y-2">
                <button type="button" onClick={() => setOutreachTool("none")} className="cv-back">
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
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

          {/* Details: the CV file and every contact field, inline-editable */}
          <motion.section
            className="dx-card cv-panel"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            aria-labelledby="pp-details">
            <h2 className="cv-panel__title" id="pp-details">
              <User className="h-4 w-4" aria-hidden="true" /> Candidate details
            </h2>

            {applicant.cvStoragePath ? (
              <div className="pp-file">
                <span className="pp-file__ic" aria-hidden="true"><FileText className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="pp-file__name" title={applicant.cvFileName}>{applicant.cvFileName}</span>
                  {fileSize && <span className="pp-file__meta">{fileSize}</span>}
                </span>
                <button type="button" className="ar-icon-btn" onClick={() => openCv(true)} disabled={cvLoading} aria-label="View CV" title="View CV">
                  <Eye className="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" className="ar-icon-btn" onClick={() => openCv(false)} disabled={cvLoading} aria-label="Download CV" title="Download CV">
                  {cvLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
            ) : (
              <p className="pp-contact__warn">
                <AlertCircle className="h-4 w-4" aria-hidden="true" /> No CV uploaded
              </p>
            )}

            {/* Inline-editable details — click any field to edit, auto-saves on blur/Enter. */}
            <dl className="pp-details">
              <DetailRow icon={<Mail />} label="Email">
                <EditableText value={applicant.email} inputType="email" onSave={(v) => saveField("email", v)} placeholder="Add email" ariaLabel="email" className="text-sm" />
              </DetailRow>
              <DetailRow icon={<Phone />} label="Phone">
                <EditableText value={applicant.phone} inputType="tel" onSave={(v) => saveField("phone", v)} placeholder="Add phone" ariaLabel="phone" className="text-sm" />
              </DetailRow>
              <DetailRow icon={<MapPin />} label="Location">
                <EditableText value={applicant.location} onSave={(v) => saveField("location", v)} placeholder="Add location" ariaLabel="location" className="text-sm" />
              </DetailRow>
              <DetailRow icon={<Globe />} label="Nationality">
                <EditableText value={applicant.nationality || ""} onSave={(v) => saveField("nationality", v)} placeholder="Add nationality" ariaLabel="nationality" className="text-sm" />
              </DetailRow>
              <DetailRow icon={<Linkedin />} label="LinkedIn">
                <EditableText value={applicant.linkedin || ""} inputType="url" onSave={(v) => saveField("linkedin", v)} placeholder="Add LinkedIn URL" ariaLabel="LinkedIn URL" className="text-sm" />
              </DetailRow>
              <DetailRow icon={<ExternalLink />} label="Portfolio">
                <EditableText value={applicant.portfolio || ""} inputType="url" onSave={(v) => saveField("portfolio", v)} placeholder="Add portfolio URL" ariaLabel="portfolio URL" className="text-sm" />
              </DetailRow>
              <DetailRow icon={<Calendar />} label="Applied">
                <span className="text-sm">{new Date(applicant.appliedDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
              </DetailRow>
            </dl>
          </motion.section>

          {/* Rating (when present) */}
          {applicant.rating && (
            <motion.section
              className="dx-card cv-panel"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              aria-labelledby="pp-rating">
              <h2 className="cv-panel__title" id="pp-rating">
                <Star className="h-4 w-4" aria-hidden="true" /> Rating
              </h2>
              <div className="space-y-2 text-sm">
                {Object.entries(applicant.rating).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="capitalize text-muted-foreground">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          aria-hidden="true"
                          className={`h-3.5 w-3.5 ${i <= val ? "fill-[hsl(var(--intel-warning))] text-[hsl(var(--intel-warning))]" : "text-muted"}`} />
                      ))}
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-border pt-2 font-medium">
                  <span>Average</span>
                  <span className="text-primary-readable">{avgRating}/5</span>
                </div>
              </div>
            </motion.section>
          )}

          {/* Candidate timeline */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
            <CandidateTimeline applicant={applicant} events={events} />
          </motion.div>
        </aside>
      </div>
    </div>
  );
};

/** One editable detail: small uppercase label with its icon, the value beneath. */
function DetailRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="pp-detail">
      <dt>
        <span className="cv-fact__ic" aria-hidden="true">{icon}</span>
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}

export default CandidateProfile;
