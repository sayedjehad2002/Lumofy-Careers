import { useState, useCallback } from "react";
import {
  ArrowLeft, FileText, Download, Loader2, AlertCircle,
  MessageSquare, Star, Clock, User, Brain, Activity,
  Mail, Phone, MapPin, ExternalLink, Calendar, Globe, Trash2, FileDown } from
"lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from
"@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AIAnalysisPanel from "@/components/careers/AIAnalysisPanel";
import InterviewPrep from "@/components/careers/applicants/InterviewPrep";
import EmailTemplates from "@/components/careers/applicants/EmailTemplates";
import CandidateTimeline from "@/components/careers/applicants/CandidateTimeline";
import { APPLICANT_STATUSES, type ApplicantStatus, type Applicant, type Job, type AIAnalysis } from "@/types/careers";

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

const CandidateProfile = ({
  applicant, job, sessionToken, onBack,
  onStatusUpdate, onAddNote, onAIComplete, onApplicantChange, onDelete
}: CandidateProfileProps) => {
  const [noteInput, setNoteInput] = useState("");
  const [cvLoading, setCvLoading] = useState(false);

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
  }, [applicant.cvStoragePath, sessionToken]);

  const handleAddNote = async () => {
    if (!noteInput.trim()) return;
    const text = noteInput.trim();
    try {
      await onAddNote(applicant.id, text);
      onApplicantChange({ ...applicant, notes: [...applicant.notes, text] });
      setNoteInput("");
      toast.success("Note added");
    } catch {
      toast.error("Couldn't save the note. Please try again.");
    }
  };

  const handleStatusChange = async (status: ApplicantStatus) => {
    await onStatusUpdate(applicant.id, status);
    onApplicantChange({ ...applicant, status });
  };

  // Build timeline
  const stageIndex = TIMELINE_STAGES.indexOf(applicant.status);
  const isTerminal = TERMINAL_STAGES.includes(applicant.status);

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* A) Candidate Overview */}
          <motion.div
            className="rounded-xl bg-card border border-border p-6"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}>
            
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                  {applicant.fullName.charAt(0)}
                </div>
                <div>
                  <h1 className="text-xl font-bold">{applicant.fullName}</h1>
                  <p className="text-sm text-muted-foreground">
                    {job?.title || "Unknown Position"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className={`border-0 ${statusInfo.color}`}>
                  {statusInfo.label}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2.5 text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
                  onClick={async () => {
                    // Defer the ~205KB jspdf/html2canvas stack until an export is actually requested.
                    const { generateCandidateReport } = await import("@/utils/candidateReportPdf");
                    generateCandidateReport(applicant, job);
                  }}
                  title="Export PDF report">
                  
                  <FileDown className="w-4 h-4" />
                </Button>
                {onDelete &&
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  onClick={() => {
                    if (window.confirm(`Delete ${applicant.fullName}'s application permanently?`)) {
                      onDelete(applicant.id).then(() => {
                        toast.success(`${applicant.fullName} has been removed`);
                        onBack();
                      }).catch(() => toast.error("Failed to delete applicant"));
                    }
                  }}
                  title="Delete applicant">
                  
                    <Trash2 className="w-4 h-4" />
                  </Button>
                }
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-3.5 h-3.5" />
                <a href={`mailto:${applicant.email}`} className="hover:text-primary transition-colors">{applicant.email}</a>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-3.5 h-3.5" />
                {applicant.phone}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />
                {applicant.location}
              </div>
              {applicant.nationality &&
              <div className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="w-3.5 h-3.5" />
                  {applicant.nationality}
                </div>
              }
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                Applied {new Date(applicant.appliedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </div>
            </div>

            {(applicant.linkedin || applicant.portfolio) &&
            <div className="flex flex-wrap gap-3 mt-3">
                {applicant.linkedin &&
              <a
                href={applicant.linkedin.startsWith("http") ? applicant.linkedin : `https://${applicant.linkedin}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline">
                
                    <ExternalLink className="w-3 h-3" /> LinkedIn
                  </a>
              }
                {applicant.portfolio &&
              <a
                href={applicant.portfolio.startsWith("http") ? applicant.portfolio : `https://${applicant.portfolio}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline">
                
                    <ExternalLink className="w-3 h-3" /> Portfolio
                  </a>
              }
              </div>
            }

            {/* Quick Stats Row */}
            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-border">
              {applicant.aiAnalysis &&
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10">
                  <Brain className="w-3.5 h-3.5 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    AI Score: {applicant.aiAnalysis.fitScore}/100
                  </span>
                </div>
              }
              {avgRating &&
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[hsl(var(--intel-warning)/0.1)]">
                  <Star className="w-3.5 h-3.5 text-[hsl(var(--intel-warning))] fill-[hsl(var(--intel-warning))]" />
                  <span className="text-sm font-medium text-[hsl(var(--intel-warning))]">
                    {avgRating}/5
                  </span>
                </div>
              }
            </div>
          </motion.div>

          {/* D) Timeline View */}
          <motion.div
            className="rounded-xl bg-card border border-border p-6"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}>
            
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Application Timeline
            </h2>
            <div className="flex items-center gap-0">
              {TIMELINE_STAGES.map((stage, i) => {
                const isPast = stageIndex >= i || isTerminal;
                const isCurrent = applicant.status === stage;
                const info = getStatusInfo(stage);
                return (
                  <div key={stage} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                        isCurrent ?
                        "bg-primary text-primary-foreground ring-4 ring-primary/20" :
                        isPast ?
                        "bg-primary/20 text-primary" :
                        "bg-secondary text-muted-foreground"}`
                        }>
                        
                        {i + 1}
                      </div>
                      <span className={`text-[10px] mt-1 ${isCurrent ? "text-primary font-medium" : "text-muted-foreground"}`}>
                        {info.label}
                      </span>
                    </div>
                    {i < TIMELINE_STAGES.length - 1 &&
                    <div
                      className={`h-0.5 flex-1 -mx-1 ${
                      stageIndex > i || isTerminal ? "bg-primary/40" : "bg-border"}`
                      } />

                    }
                  </div>);

              })}

              {/* Terminal states */}
              <div className="flex flex-col items-center ml-2">
                {applicant.status === "rejected" ?
                <>
                    <div className="w-8 h-8 rounded-full bg-destructive/20 text-destructive flex items-center justify-center text-xs font-medium ring-4 ring-destructive/10">
                      ✕
                    </div>
                    <span className="text-[10px] mt-1 text-destructive font-medium">Rejected</span>
                  </> :
                applicant.status === "hired" ?
                <>
                    <div className="w-8 h-8 rounded-full bg-[hsl(var(--intel-success)/0.2)] text-[hsl(var(--intel-success))] flex items-center justify-center text-xs font-medium ring-4 ring-[hsl(var(--intel-success)/0.1)]">
                      ✓
                    </div>
                    <span className="text-[10px] mt-1 text-[hsl(var(--intel-success))] font-medium">Hired</span>
                  </> :

                <>
                    <div className="w-8 h-8 rounded-full bg-secondary text-muted-foreground flex items-center justify-center text-xs">
                      ?
                    </div>
                    <span className="text-[10px] mt-1 text-muted-foreground">Outcome</span>
                  </>
                }
              </div>
            </div>
          </motion.div>

          {/* B) CV Preview */}
          <motion.div
            className="rounded-xl bg-card border border-border p-6"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}>
            
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              CV / Resume
            </h2>
            {applicant.cvStoragePath ?
            <div className="space-y-3">
                <div className="flex items-center justify-between bg-secondary rounded-lg p-4">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium truncate block">{applicant.cvFileName}</span>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {applicant.cvFileSize != null && applicant.cvFileSize > 0 &&
                    <span>{applicant.cvFileSize < 1024 * 1024 ? `${(applicant.cvFileSize / 1024).toFixed(1)} KB` : `${(applicant.cvFileSize / 1024 / 1024).toFixed(2)} MB`}</span>
                    }
                      {applicant.cvFileType && <span>{applicant.cvFileType}</span>}
                    </div>
                  </div>
                  <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCvDownload}
                  disabled={cvLoading}>
                  
                    {cvLoading ?
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> :

                  <Download className="w-3.5 h-3.5 mr-1" />
                  }
                    {cvLoading ? "Loading..." : "Download"}
                  </Button>
                </div>
              </div> :

            <div className="flex items-center gap-2 bg-secondary rounded-lg p-3 text-muted-foreground">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">No CV uploaded</span>
              </div>
            }
          </motion.div>

          {/* Screening Answers */}
          {job && job.screeningQuestions.length > 0 &&
          <motion.div
            className="rounded-xl bg-card border border-border p-6"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}>
            
              <h2 className="font-semibold mb-3">Screening Answers</h2>
              <div className="space-y-4">
                {job.screeningQuestions.map((q) =>
              <div key={q.id}>
                    <p className="text-sm font-medium mb-1">{q.question}</p>
                    <p className="text-sm text-muted-foreground bg-secondary rounded-lg p-3">
                      {applicant.screeningAnswers[q.id] || "—"}
                    </p>
                  </div>
              )}
              </div>
            </motion.div>
          }

          {/* C) AI Rating & Feedback */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}>
            
            <AIAnalysisPanel
              applicant={applicant}
              job={job}
              sessionToken={sessionToken}
              onAnalysisComplete={(applicantId, analysis) => {
                onAIComplete(applicantId, analysis);
                onApplicantChange({ ...applicant, aiAnalysis: analysis });
              }} />
          </motion.div>



        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* H) Status Editor */}
          <motion.div
            className="rounded-xl bg-card border border-border p-5"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}>
            
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Update Status
            </h3>
            <Select
              value={applicant.status}
              onValueChange={(v) => handleStatusChange(v as ApplicantStatus)}>
              
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPLICANT_STATUSES.map((s) =>
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </motion.div>

          {/* Rating */}
          {applicant.rating &&
          <motion.div
            className="rounded-xl bg-card border border-border p-5"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}>
            
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-[hsl(var(--intel-warning))]" />
                Rating
              </h3>
              <div className="space-y-2 text-sm">
                {Object.entries(applicant.rating).map(([key, val]) =>
              <div key={key} className="flex items-center justify-between">
                    <span className="text-muted-foreground capitalize">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((i) =>
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${
                    i <= val ? "text-[hsl(var(--intel-warning))] fill-[hsl(var(--intel-warning))]" : "text-muted"}`
                    } />

                  )}
                    </div>
                  </div>
              )}
                <div className="pt-2 border-t border-border flex items-center justify-between font-medium">
                  <span>Average</span>
                  <span className="text-primary">{avgRating}/5</span>
                </div>
              </div>
            </motion.div>
          }

          {/* E) Internal Notes */}
          <motion.div
            className="rounded-xl bg-card border border-border p-5"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}>
            
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              Internal Notes
            </h3>
            <div className="space-y-2 mb-3 max-h-64 overflow-y-auto">
              {applicant.notes.map((note, i) =>
              <div key={i} className="text-sm text-muted-foreground bg-secondary rounded-lg p-2.5">
                  <p>{note}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    Note #{i + 1}
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
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                className="bg-secondary border-border text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleAddNote()} />
              
              <Button size="sm" onClick={handleAddNote}>Add</Button>
            </div>
          </motion.div>

          {/* F) Candidate Timeline */}
          <motion.div
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}>
            <CandidateTimeline applicant={applicant} />
          </motion.div>

          {/* G) Interview Prep Kit */}
          <motion.div
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}>
            <InterviewPrep applicant={applicant} job={job} />
          </motion.div>

          {/* H) Quick Email */}
          <motion.div
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}>
            <EmailTemplates applicant={applicant} job={job} />
          </motion.div>
        </div>
      </div>
    </div>);

};

export default CandidateProfile;