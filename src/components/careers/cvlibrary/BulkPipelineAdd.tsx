import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Briefcase, CheckCircle2, UserPlus, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useCareers } from "@/contexts/CareersContext";
import { toast } from "sonner";
import {
  addLibraryCandidateToJob, analyzeApplicant, isBulkRunActive, isWordCv,
  setBulkRunActive, type LibraryCandidateForAdd,
} from "./addToPipeline";

interface Job {
  id: string;
  title: string;
  department: string;
  status: string;
}

interface Props {
  /** The candidates currently selected in the library list. */
  candidates: LibraryCandidateForAdd[];
  jobs: Job[];
  sessionToken: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called once after the adds land (before the slow analysis phase) and again
      when the whole run finishes — parent refreshes pipeline + library data. */
  onRefresh: () => void;
  /** Library candidate ids that no longer need action (added OR skipped as
      already-in-job / in-batch duplicate) — parent clears them from the
      selection so only true failures stay selected for a retry. */
  onResolved: (resolvedCandidateIds: string[]) => void;
}

type Phase = "pick" | "adding" | "analyzing" | "done";

export default function BulkPipelineAdd({
  candidates, jobs, sessionToken, open, onOpenChange, onRefresh, onResolved,
}: Props) {
  const { applicants } = useCareers();
  const [selectedJobId, setSelectedJobId] = useState("");
  const [phase, setPhase] = useState<Phase>("pick");
  const [addTotal, setAddTotal] = useState(0);
  const [addDone, setAddDone] = useState(0);
  const [addFailed, setAddFailed] = useState(0);
  const [analyzeDone, setAnalyzeDone] = useState(0);
  const [analyzeFailed, setAnalyzeFailed] = useState(0);
  const [analyzeTotal, setAnalyzeTotal] = useState(0);
  const [runJobTitle, setRunJobTitle] = useState("");
  // Cancel must be a ref: a useState boolean read inside the running loop is a
  // stale closure and would never observe the click.
  const cancelRef = useRef(false);

  const openJobs = jobs.filter(j => j.status === "open");
  const selectedJob = openJobs.find(j => j.id === selectedJobId);
  const running = phase === "adding" || phase === "analyzing";
  // A run from a PREVIOUS mount of this dialog may still be executing (see the
  // module guard in addToPipeline.ts). If so, this fresh instance must not let
  // the user start a second one.
  const blockedByOtherRun = !running && phase === "pick" && isBulkRunActive();

  // Who is ALREADY in the selected job's pipeline (same matching as the single
  // add flow: exact CV path, or trimmed-lowercase email), plus a within-batch
  // seen-set so two library rows sharing a file/email can't both be added.
  const { toAdd, resolvedSkipIds, alreadyIn, batchDupes } = useMemo(() => {
    if (!selectedJob) return { toAdd: [] as LibraryCandidateForAdd[], resolvedSkipIds: [] as string[], alreadyIn: 0, batchDupes: 0 };
    const inJobPaths = new Set<string>();
    const inJobEmails = new Set<string>();
    for (const a of applicants) {
      if (a.jobId !== selectedJob.id) continue;
      if (a.cvStoragePath) inJobPaths.add(a.cvStoragePath);
      const em = a.email?.trim().toLowerCase();
      if (em) inJobEmails.add(em);
    }
    const seenPaths = new Set<string>();
    const seenEmails = new Set<string>();
    const list: LibraryCandidateForAdd[] = [];
    const skip: string[] = [];
    let already = 0, dupes = 0;
    for (const c of candidates) {
      const email = c.email?.trim().toLowerCase();
      if (inJobPaths.has(c.resume_file_path) || (!!email && inJobEmails.has(email))) { already++; skip.push(c.id); continue; }
      if (seenPaths.has(c.resume_file_path) || (!!email && seenEmails.has(email))) { dupes++; skip.push(c.id); continue; }
      seenPaths.add(c.resume_file_path);
      if (email) seenEmails.add(email);
      list.push(c);
    }
    return { toAdd: list, resolvedSkipIds: skip, alreadyIn: already, batchDupes: dupes };
  }, [selectedJob, applicants, candidates]);

  const wordCount = useMemo(() => toAdd.filter(c => isWordCv(c.resume_file_path)).length, [toAdd]);

  const reset = () => {
    setPhase("pick");
    setSelectedJobId("");
    setAddTotal(0); setAddDone(0); setAddFailed(0);
    setAnalyzeDone(0); setAnalyzeFailed(0); setAnalyzeTotal(0);
    setRunJobTitle("");
  };

  // Reopening the dialog after a run finished in the background (dialog was
  // closed) must start fresh at the pick screen, not on the stale summary.
  // The parent reopens via `open` directly, bypassing handleOpenChange.
  useEffect(() => {
    if (open && phase === "done" && !isBulkRunActive()) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    if (!next && running) {
      // Closing the dialog does NOT stop the run — the loop keeps going and a
      // summary toast lands at the end. Only a page reload interrupts it.
      toast.info("Continuing in the background — keep this page open. You'll get a summary when it finishes.");
      onOpenChange(false);
      return;
    }
    if (!next) reset();
    onOpenChange(next);
  };

  const run = async () => {
    if (!selectedJob || toAdd.length === 0) return;
    if (isBulkRunActive()) {
      toast.info("A bulk add is already running — let it finish first.");
      return;
    }
    const job = selectedJob;
    const batch = toAdd;                                    // snapshot — the prop shrinks once we clear the selection
    const allSelectedIds = candidates.map(c => c.id);       // snapshot for clearing
    cancelRef.current = false;
    setBulkRunActive(true);
    setRunJobTitle(job.title);
    setAddTotal(batch.length);

    try {
      // ---- Phase 1: create the applicants (fast, one at a time) ----
      setPhase("adding");
      const added: { candidateId: string; applicantId: string; word: boolean }[] = [];
      let failed = 0;
      for (let i = 0; i < batch.length; i++) {
        if (cancelRef.current) break;
        const c = batch[i];
        try {
          const applicantId = await addLibraryCandidateToJob(c, job, sessionToken);
          added.push({ candidateId: c.id, applicantId, word: isWordCv(c.resume_file_path) });
        } catch {
          failed++;
        }
        setAddDone(added.length);
        setAddFailed(failed);
        // >=1.1s per iteration keeps update-applicant + cv-library-manage under
        // their 60/min/IP limits regardless of network latency (each iteration
        // is two invokes). Bulk adds are a background task, so this is fine.
        if (i + 1 < batch.length) await new Promise(r => setTimeout(r, 1100));
      }
      const stoppedAdding = cancelRef.current;

      // Show the new cards in the pipeline right away, and clear everyone who no
      // longer needs action (added + skipped) from the selection — only true
      // failures stay selected for a retry.
      const failedIds = new Set(
        batch.filter(c => !added.some(a => a.candidateId === c.id)).map(c => c.id)
      );
      // If phase 1 was stopped early, the not-yet-processed candidates are NOT
      // failures — leave them selected too.
      if (stoppedAdding) {
        onResolved(added.map(a => a.candidateId).concat(resolvedSkipIds));
      } else {
        onResolved(allSelectedIds.filter(id => !failedIds.has(id)));
      }
      onRefresh();

      // ---- Phase 2: AI analysis, STRICTLY one at a time ----
      // Concurrent Gemini calls on this key cause sustained overload 5xx
      // (empirically proven), so each analysis is awaited with a breather.
      // Reset the cancel flag: "Stop adding" halts phase 1 but we still analyze
      // whatever landed. Phase 2 has its own stop button.
      cancelRef.current = false;
      const analyzable = added.filter(a => !a.word);
      setAnalyzeTotal(analyzable.length);
      setPhase("analyzing");
      let aDone = 0, aFail = 0;
      for (let i = 0; i < analyzable.length; i++) {
        if (cancelRef.current) break;
        try {
          const { data, error } = await analyzeApplicant(analyzable[i].applicantId, sessionToken);
          // Gateway failures come back as 200 + {error}; rate limits as a hard 429
          // error. Either way the applicant sits on "AI Pending" — count it.
          if (error || data?.error) aFail++; else aDone++;
        } catch {
          aFail++;
        }
        setAnalyzeDone(aDone);
        setAnalyzeFailed(aFail);
        if (i + 1 < analyzable.length) await new Promise(r => setTimeout(r, 3000));
      }
      const stoppedAnalyzing = cancelRef.current;

      setPhase("done");
      onRefresh();

      const note = stoppedAdding
        ? " (stopped adding early)"
        : stoppedAnalyzing ? " (analysis stopped — the rest stay on AI Pending)" : "";
      if (failed === 0 && aFail === 0) {
        toast.success(`Added ${added.length} candidate${added.length === 1 ? "" : "s"} to ${job.title}${aDone ? ` · ${aDone} analyzed` : ""}${note}`);
      } else {
        toast.warning(
          `${job.title}: ${added.length} added, ${failed} failed` +
          (analyzable.length ? ` · analyses: ${aDone} done, ${aFail} pending` : "") + note
        );
      }
    } finally {
      setBulkRunActive(false);
    }
  };

  const analyzeMinutes = Math.max(1, Math.round(((toAdd.length - wordCount) * 48) / 60));
  const progressPhaseDone = phase === "adding" ? addDone : analyzeDone;
  const progressPhaseFailed = phase === "adding" ? addFailed : analyzeFailed;
  const progressPhaseTotal = phase === "adding" ? addTotal : analyzeTotal;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" onInteractOutside={e => { if (running) e.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" />
            {phase === "pick"
              ? `Add ${candidates.length} candidate${candidates.length === 1 ? "" : "s"} to a pipeline`
              : `Adding to ${runJobTitle}`}
          </DialogTitle>
        </DialogHeader>

        {phase === "pick" && (
          <div className="space-y-4">
            {blockedByOtherRun && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                A bulk add is already running in the background. Let it finish before starting another.
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Everyone selected joins the job's <span className="font-medium text-foreground">New</span> stage.
              </p>
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
              {openJobs.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No open jobs available</p>
              )}
            </div>

            {selectedJob && (
              <div className="rounded-lg bg-secondary/30 p-3 space-y-1 text-xs text-muted-foreground">
                <p className="text-sm font-medium text-foreground">
                  {toAdd.length} will be added to {selectedJob.title}
                </p>
                {alreadyIn > 0 && <p>{alreadyIn} already in this job's pipeline — skipped automatically.</p>}
                {batchDupes > 0 && <p>{batchDupes} duplicate{batchDupes === 1 ? "" : "s"} within the selection (same CV file or email) — only the first copy is added.</p>}
                {wordCount > 0 && <p>{wordCount} Word CV{wordCount === 1 ? "" : "s"} — added without AI analysis (Gemini can't read .doc/.docx).</p>}
                {toAdd.length > wordCount && (
                  <p>
                    AI analysis runs one candidate at a time (~{analyzeMinutes} min total for {toAdd.length - wordCount}).
                    Keep this page open; you can keep working meanwhile.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {running && (
          <div className="space-y-3 py-2">
            {phase === "adding" ? (
              <>
                <p className="text-sm font-medium">Adding to {runJobTitle}… {addDone + addFailed} of {addTotal}</p>
                <Progress value={addTotal ? Math.round(((addDone + addFailed) / addTotal) * 100) : 0} />
              </>
            ) : (
              <>
                <p className="text-sm font-medium">
                  Analyzing candidates… {analyzeDone + analyzeFailed} of {analyzeTotal}
                </p>
                <Progress value={analyzeTotal ? Math.round(((analyzeDone + analyzeFailed) / analyzeTotal) * 100) : 100} />
                <p className="text-xs text-muted-foreground">
                  One at a time (~45s each) so the AI stays reliable. Closing this dialog won't stop it — just keep the page open.
                </p>
              </>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> {progressPhaseDone} done</span>
              {progressPhaseFailed > 0 && (
                <span className="flex items-center gap-1"><XCircle className="w-3.5 h-3.5 text-destructive" /> {progressPhaseFailed} {phase === "adding" ? "failed" : "pending"}</span>
              )}
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="space-y-2 py-2 text-sm">
            <p className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              {addDone} added to {runJobTitle}{addFailed > 0 ? ` · ${addFailed} failed (still selected — try again)` : ""}
            </p>
            {analyzeTotal > 0 && (
              <p className="text-xs text-muted-foreground">
                Analyses: {analyzeDone} completed{analyzeFailed > 0 ? `, ${analyzeFailed} still on AI Pending (open the applicant and run analysis manually, or retry later)` : ""}.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          {phase === "pick" && (
            <>
              <Button variant="ghost" onClick={() => handleOpenChange(false)}>Cancel</Button>
              <Button onClick={run} disabled={!selectedJob || toAdd.length === 0 || blockedByOtherRun}>
                <ArrowRight className="w-4 h-4 mr-1" />
                Add {selectedJob ? toAdd.length : ""} to pipeline
              </Button>
            </>
          )}
          {running && (
            <Button variant="outline" onClick={() => { cancelRef.current = true; }}>
              {phase === "adding" ? "Stop adding" : "Stop analyzing (keep added)"}
            </Button>
          )}
          {phase === "done" && (
            <Button onClick={() => handleOpenChange(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
