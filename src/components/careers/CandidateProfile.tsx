import { useMemo, useState, useCallback } from "react";
import {
  ArrowLeft, FileText, Download, Loader2, AlertCircle,
  MessageSquare, Star, User, Brain,
  Mail, Phone, MapPin, ExternalLink, Calendar, Globe, Trash2, FileDown } from
"lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  onApplicantChange: (applicant: Applicant) => void;
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
  onStatusUpdate, onAddNote, onAIComplete, onApplicantChange, onDelete
}: CandidateProfileProps) => {
  const [noteInput, setNoteInput] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [cvLoading, setCvLoading] = useState(false);

  const { updateApplicantFields } = useCareers();
  // Inline-edit a candidate field (Notion-style): persist, then reflect locally.
  // Throws on failure so the editor stays open for a retry.
  const saveField = async (field: EditableField, value: string) => {
    try {
      await updateApplicantFields(applicant.id, { [field]: value } as Partial<Pick<Applicant, EditableField>>);
      onApplicantChange({ ...applicant, [field]: field === "fullName" ? toTitleCase(value) : value });
      toast.success("Saved");
    } catch (e) {
      toast.error("Couldn't save changes");
      throw e;
    }
  };

  const statusInfo = getStatusInfo(applicant.status);

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
  const dedupedNotes = useMemo(() => {
    const seen = new Map<string, { note: string; count: number; firstIndex: number }>();
    applicant.notes.forEach((note, i) => {
      const existing = seen.get(note);
      if (existing) existing.count += 1;
      else seen.set(note, { note, count: 1, firstIndex: i });
    });
    return Array.from(seen.values());
  }, [applicant.notes]);

  const handleCvDownload = useCallback(async () => {
    if (!applicant.cvStoragePath) {
      toast.error("No CV file available");
      return;
    }
    setCvLoading(true);
    try {
      // Pass the applicantId so the edge function resolves the CV path
      // server-side (prevents IDOR via arbitrary storagePath).
      const { data, error } = await supabase.functions.invoke("get-cv-url", {
        body: { applicantId: applicant.id, sessionToken }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      window.open(data.url, "_blank");
    } catch (e: any) {
      toast.error(e.message || "Failed to download CV");
    } finally {
      setCvLoading(false);
    }
  }, [applicant.cvStoragePath, applicant.id, sessionToken]);

  const handleAddNote = async () => {
    if (!noteInput.trim() || noteSaving) return; // guard re-entry (double click / Enter+click)
    const text = noteInput.trim();
    setNoteSaving(true);
    try {
      await onAddNote(applicant.id, text);
      onApplicantChange({ ...applicant, notes: [...applicant.notes, text] });
      setNoteInput("");
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
      onApplicantChange({ ...applicant, status, stageEnteredAt: new Date().toISOString() });
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

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
              {applicant.fullName.charAt(0)}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold min-w-0">
                <EditableText
                  value={applicant.fullName}
                  onSave={(v) => saveField("fullName", v)}
                  className="text-xl font-bold"
                  ariaLabel="candidate name"
                  placeholder="Name"
                />
              </h1>
              <p className="truncate text-sm text-muted-foreground">
                {job?.title || applicant.jobTitle || "Unknown Position"} · Applied {new Date(applicant.appliedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {applicant.aiAnalysis && (
              <span className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5">
                <Brain className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <span className="text-sm font-semibold tabular-nums text-primary-readable">
                  {applicant.aiAnalysis.fitScore}/100
                </span>
                {applicant.aiAnalysis.confidence && (
                  <span className="text-[11px] text-muted-foreground">· {applicant.aiAnalysis.confidence} confidence</span>
                )}
              </span>
            )}
            {avgRating && (
              <span className="flex items-center gap-1.5 rounded-lg bg-[hsl(var(--intel-warning)/0.1)] px-2.5 py-1.5">
                <Star className="h-3.5 w-3.5 fill-[hsl(var(--intel-warning))] text-[hsl(var(--intel-warning))]" aria-hidden="true" />
                <span className="text-sm font-semibold text-[hsl(var(--intel-warning))]">{avgRating}/5</span>
              </span>
            )}
            <Select
              value={applicant.status}
              onValueChange={(v) => handleStatusChange(v as ApplicantStatus)}>
              <SelectTrigger aria-label="Update status" className={`h-9 w-36 border-0 text-xs font-medium ${statusInfo.color}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPLICANT_STATUSES.map((s) =>
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                )}
              </SelectContent>
            </Select>
            {applicant.cvStoragePath && (
              <Button size="sm" variant="outline" className="h-9" onClick={handleCvDownload} disabled={cvLoading}>
                {cvLoading ?
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" /> :
                <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />}
                CV
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-9 px-2.5 text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary-readable"
              onClick={async () => {
                // Defer the ~205KB jspdf/html2canvas stack until an export is actually requested.
                const { generateCandidateReport } = await import("@/utils/candidateReportPdf");
                generateCandidateReport(applicant, job);
              }}
              aria-label="Export PDF report"
              title="Export PDF report">
              <FileDown className="w-4 h-4" aria-hidden="true" />
            </Button>
            {onDelete &&
            <Button
              size="sm"
              variant="ghost"
              className="h-9 w-9 p-0 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                if (window.confirm(`Delete ${applicant.fullName}'s application permanently?`)) {
                  onDelete(applicant.id).then(() => {
                    toast.success(`${applicant.fullName} has been removed`);
                    onBack();
                  }).catch(() => toast.error("Failed to delete applicant"));
                }
              }}
              aria-label="Delete applicant"
              title="Delete applicant">
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </Button>
            }
          </div>
        </div>

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
                onApplicantChange({ ...applicant, aiAnalysis: analysis });
              }} />
          </motion.div>

          {/* Screening answers — what the candidate actually said */}
          {job && job.screeningQuestions.length > 0 &&
          <motion.div
            className="rounded-2xl border border-border bg-card p-5 light-glow sm:p-6"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}>
              <h2 className="mb-3 font-semibold">Screening Answers</h2>
              <div className="space-y-4">
                {job.screeningQuestions.map((q) =>
              <div key={q.id}>
                    <p className="mb-1 text-sm font-medium">{q.question}</p>
                    <p className="rounded-lg bg-secondary p-3 text-sm text-muted-foreground">
                      {applicant.screeningAnswers[q.id] || "—"}
                    </p>
                  </div>
              )}
              </div>
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
          <motion.div
            className="rounded-2xl border border-border bg-card p-5 light-glow"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}>
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <MessageSquare className="w-4 h-4 text-primary" aria-hidden="true" />
              Internal Notes
            </h3>
            <div className="mb-3 max-h-64 space-y-2 overflow-y-auto">
              {dedupedNotes.map((n) =>
              <div key={n.firstIndex} className="rounded-lg bg-secondary p-2.5 text-sm text-muted-foreground">
                  <p>{n.note}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground/60">
                    Note #{n.firstIndex + 1}{n.count > 1 ? ` · added ${n.count}×` : ""}
                  </p>
                </div>
              )}
              {applicant.notes.length === 0 &&
              <p className="text-sm text-muted-foreground">No notes yet.</p>
              }
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add a note..."
                aria-label="Add a note"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                className="border-border bg-secondary text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleAddNote()} />
              <Button size="sm" onClick={handleAddNote} disabled={noteSaving}>
                {noteSaving ? "Saving…" : "Add"}
              </Button>
            </div>
          </motion.div>

          {/* Quick email */}
          <motion.div
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}>
            <EmailTemplates applicant={applicant} job={job} />
          </motion.div>

          {/* Schedule a meeting — opens Outlook (web) or downloads an .ics invite */}
          <ScheduleMeeting applicant={applicant} job={job} />

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
                <Button size="sm" variant="outline" onClick={handleCvDownload} disabled={cvLoading}>
                  {cvLoading ?
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden="true" /> :
                <Download className="mr-1 h-3.5 w-3.5" aria-hidden="true" />}
                  {cvLoading ? "Loading…" : "Download"}
                </Button>
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
                <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
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
            <CandidateTimeline applicant={applicant} />
          </motion.div>
        </div>
      </div>
    </div>);

};

export default CandidateProfile;
