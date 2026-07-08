import { useMemo, useState } from "react";
import { ArrowRight, Briefcase, Check, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCareers } from "@/contexts/CareersContext";
import { candidateDisplayName } from "@/lib/utils";
import { toast } from "sonner";
import { addLibraryCandidateToJob, analyzeApplicant, isWordCv } from "./addToPipeline";

interface CVCandidate {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  location: string | null;
  skills: string[];
  resume_file_name: string;
  resume_file_path: string;
  resume_file_type: string | null;
  resume_file_size: number | null;
}

interface Job {
  id: string;
  title: string;
  department: string;
  status: string;
}

interface Props {
  candidate: CVCandidate;
  jobs: Job[];
  sessionToken: string;
  onDone?: () => void;
  /** True when this candidate already exists as an applicant in the pipeline. */
  inPipeline?: boolean;
}

export default function PipelineIntegration({ candidate, jobs, sessionToken, onDone, inPipeline = false }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { applicants } = useCareers();

  // Jobs this candidate is ALREADY an applicant for (matched by the CV file path —
  // deterministic even with no email — or by email). Hidden from the picker so
  // "Add to another job" can't create a duplicate card in the same pipeline
  // (and a duplicate auto-analyze AI spend).
  const candidateEmail = candidate.email?.trim().toLowerCase();
  const jobsAlreadyIn = useMemo(() => new Set(
    applicants
      .filter(a =>
        (a.cvStoragePath && a.cvStoragePath === candidate.resume_file_path) ||
        (!!candidateEmail && a.email?.trim().toLowerCase() === candidateEmail))
      .map(a => a.jobId)
  ), [applicants, candidate.resume_file_path, candidateEmail]);

  const openJobs = jobs.filter(j => j.status === "open" && !jobsAlreadyIn.has(j.id));
  const selectedJob = openJobs.find(j => j.id === selectedJobId);

  const handleAddToJob = async () => {
    if (!selectedJob) {
      toast.error("Pick a job to add this candidate to");
      return;
    }

    setSubmitting(true);
    try {
      // Shared with the bulk flow (BulkPipelineAdd): creates the applicant and
      // marks the library row Shortlisted.
      const applicantId = await addLibraryCandidateToJob(candidate, selectedJob, sessionToken);

      // Kick off AI analysis for the new applicant right away (same fire-and-forget
      // pattern as the public apply flow) so the pipeline card shows a score instead
      // of sitting on "AI Pending". Skipped for Word CVs — Gemini can't read them,
      // and a zero-evidence "analysis" would be worse than an honest "AI Pending".
      if (!isWordCv(candidate.resume_file_path)) {
        analyzeApplicant(applicantId, sessionToken).catch(() => { /* non-blocking */ });
      }

      toast.success(`${candidateDisplayName(candidate.name, candidate.resume_file_name) || "Candidate"} added to ${selectedJob.title}`);
      setSelectedJobId(""); // never leave a stale id pointing at a now-hidden job
      setOpen(false);
      onDone?.();
    } catch (e: any) {
      if (import.meta.env.DEV) console.error("Pipeline integration error:", e);
      toast.error("Failed to add candidate to job pipeline");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {inPipeline ? (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <Check className="w-3.5 h-3.5 flex-shrink-0" />
            In pipeline — already tracked
          </div>
          <Button variant="ghost" size="sm" className="h-auto w-full justify-start gap-1.5 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground" onClick={() => { setSelectedJobId(""); setOpen(true); }}>
            <UserPlus className="w-3.5 h-3.5" />
            Add to another job
          </Button>
        </div>
      ) : (
        <Button size="sm" className="w-full gap-1.5" onClick={() => { setSelectedJobId(""); setOpen(true); }}>
          <UserPlus className="w-3.5 h-3.5" />
          Add to pipeline
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" />
              Add to Job Pipeline
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg bg-secondary/30 p-3">
              <p className="text-sm font-medium">{candidateDisplayName(candidate.name, candidate.resume_file_name) || "Unknown"}</p>
              <p className="text-xs text-muted-foreground">{candidate.email || "No email on file"}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">Select a job to add this candidate to:</p>
              <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                <SelectTrigger><SelectValue placeholder="Select a job..." /></SelectTrigger>
                <SelectContent>
                  {openJobs.map(j => (
                    <SelectItem key={j.id} value={j.id}>
                      <span className="flex items-center gap-2">
                        <Briefcase className="w-3 h-3" />
                        {j.title} · {j.department}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {openJobs.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No open jobs available</p>
            )}

            {!candidate.email && (
              <p className="text-xs text-muted-foreground">
                No email on file — you can still add this candidate. You won't be able to email or schedule with them (or auto-detect duplicates) until an email is added.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            {/* Gate on the RESOLVED job (not the raw id) — a stale id whose job left
                openJobs must not leave this button enabled. */}
            <Button onClick={handleAddToJob} disabled={!selectedJob || submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <ArrowRight className="w-4 h-4 mr-1" />}
              Add to pipeline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
