import { useMemo, useRef, useState, type DragEvent } from "react";
import { Check, FileText, Loader2, RotateCcw, UploadCloud, UserPlus, X, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCareers } from "@/contexts/CareersContext";
import type { AIAnalysis, Job } from "@/types/careers";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "../dashboard/primitives";
import CandidateAnalysis, { type CVAIAnalysis } from "../cvlibrary/CandidateAnalysis";

/**
 * CV Analyzer: attach a CV, pick a role, run the same AI analysis applicants get.
 *
 * No new backend. The file goes up through upload-cv (the apply form's upload:
 * storage only, no database row), then analyze-cv scores that file against the
 * chosen job's description, requirements and HR weights, and returns the result
 * without saving it anywhere (analyze-cv only writes when given an applicantId).
 * Nothing reaches a pipeline unless HR presses "Add to applicants", which creates
 * the applicant through update-applicant and stores this exact analysis on them.
 *
 * The AI is called once per click, never in the background (AI analysis is
 * manual-only, and concurrent Gemini calls overload this project's key).
 */

const MAX_BYTES = 10 * 1024 * 1024; // matches upload-cv and analyze-cv

type Phase = "idle" | "uploading" | "analyzing" | "done";

/** The analysis plus the identity fields analyze-cv reads off the CV. */
type RawAnalysis = CVAIAnalysis & { candidateName?: string; candidateEmail?: string; candidatePhone?: string };

/** A value the AI read off the CV, or nothing — never a placeholder like "Not mentioned". */
function realText(v: unknown, max = 80): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (s.length < 2 || s.length > max || !/\p{L}|\d/u.test(s)) return "";
  if (/^(n\/?a|none|null|unknown|not (available|mentioned|provided|found)|-+)$/i.test(s)) return "";
  return s;
}
const realEmail = (v: unknown) => {
  const s = realText(v, 120).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : "";
};

const fmtSize = (n: number) => (n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

export default function CvAnalyzer({
  jobs,
  onOpenApplicant,
}: {
  /** Open, non-archived roles. */
  jobs: Job[];
  onOpenApplicant: (applicantId: string) => void;
}) {
  const { sessionToken, hrRole, updateApplicantAI, addApplicantNote, refreshData } = useCareers();
  const canAdd = hrRole === "owner" || hrRole === "admin";

  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  // The uploaded copy of the CURRENT file, reused when only the role changes.
  const [uploaded, setUploaded] = useState<{ file: File; path: string } | null>(null);
  const [result, setResult] = useState<{ analysis: RawAnalysis; job: Job; fileName: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const sortedJobs = useMemo(
    () => [...jobs].sort((a, b) => a.department.localeCompare(b.department) || a.title.localeCompare(b.title)),
    [jobs],
  );
  const job = jobs.find((j) => j.id === jobId);
  const busy = phase === "uploading" || phase === "analyzing";
  const sameAsResult = !!result && result.job.id === jobId && uploaded?.file === file;

  const pickFile = (f: File | undefined | null) => {
    if (!f) return;
    const name = f.name.toLowerCase();
    if (name.endsWith(".doc") || name.endsWith(".docx")) {
      setError("Word files can't be read by the AI. Save the CV as a PDF and attach that.");
      return;
    }
    if (!name.endsWith(".pdf") && f.type !== "application/pdf") {
      setError("Attach the CV as a PDF.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setError(`That file is ${fmtSize(f.size)}. The limit is 10 MB.`);
      return;
    }
    setError("");
    setFile(f);
  };

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragOver(false);
    pickFile(e.dataTransfer.files?.[0]);
  };

  const run = async () => {
    if (!file || !job || busy) return;
    if (!sessionToken) { toast.error("Your session has expired. Sign in again."); return; }
    setError("");
    try {
      // 1 · Upload once per file; a role change re-uses the stored copy.
      let path = uploaded?.file === file ? uploaded.path : "";
      if (!path) {
        setPhase("uploading");
        const form = new FormData();
        form.append("file", file);
        form.append("jobId", job.id);
        form.append("contentType", file.type || "application/pdf");
        const { data, error: upErr } = await supabase.functions.invoke("upload-cv", { body: form });
        if (upErr || data?.error || !data?.storagePath) throw new Error(data?.error || "The CV couldn't be uploaded.");
        path = data.storagePath as string;
        setUploaded({ file, path });
      }

      // 2 · Score it against this role (same call and inputs as an applicant's analysis).
      setPhase("analyzing");
      const { data, error: aiErr } = await supabase.functions.invoke("analyze-cv", {
        body: {
          cvStoragePath: path,
          cvFileName: file.name,
          candidateName: "",
          jobTitle: job.title,
          jobDescription: job.description,
          responsibilities: job.responsibilities,
          requirements: job.requirements,
          screeningAnswers: {},
          sessionToken,
          aiScoringWeights: job.aiScoringWeights,
        },
      });
      if (aiErr) throw new Error(aiErr.message || "The AI analysis failed.");
      if (data?.error) throw new Error(data.error);
      const analysis = { ...data.analysis, analyzedAt: data.analyzedAt } as RawAnalysis;
      setResult({ analysis, job, fileName: file.name });
      setSavedId(null);
      setPhase("done");
      toast.success("Analysis complete");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(/429|rate/i.test(msg) ? "Too many analyses this hour. Try again in a little while." : msg);
      setPhase(result ? "done" : "idle");
    }
  };

  const reset = () => {
    setFile(null);
    setUploaded(null);
    setResult(null);
    setSavedId(null);
    setError("");
    setPhase("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  const addToApplicants = async () => {
    if (!result || !uploaded || !sessionToken || saving || savedId) return;
    setSaving(true);
    const id = crypto.randomUUID();
    try {
      const { analysis, job: forJob } = result;
      const { data, error: createErr } = await supabase.functions.invoke("update-applicant", {
        body: {
          sessionToken,
          action: "create",
          applicant: {
            id,
            job_id: forJob.id,
            // Only what the AI actually read off the CV. An empty name stays empty
            // (the column allows ""), so a later analysis can still fill it in.
            full_name: realText(analysis.candidateName),
            email: realEmail(analysis.candidateEmail) || null,
            phone: realText(analysis.candidatePhone, 40),
            cv_file_name: uploaded.file.name,
            cv_storage_path: uploaded.path,
            cv_file_type: uploaded.file.type || "application/pdf",
            cv_file_size: uploaded.file.size,
            status: "new",
          },
        },
      });
      if (createErr || data?.error) throw new Error(data?.error || "Couldn't add the applicant.");
      // Keep the analysis HR just read rather than paying for a second run.
      await updateApplicantAI(id, analysis as unknown as AIAnalysis);
      addApplicantNote(id, "Added from the CV Analyzer.").catch(() => { /* audit note is best-effort */ });
      refreshData();
      setSavedId(id);
      toast.success(`Added to ${forJob.title} applicants`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't add the applicant.");
    } finally {
      setSaving(false);
    }
  };

  const runLabel = busy
    ? phase === "uploading" ? "Uploading the CV…" : "Analyzing…"
    : result && !sameAsResult ? "Run analysis again" : "Run AI analysis";

  return (
    <div className="az">
      <PageHeader
        eyebrow="Hiring"
        title="CV Analyzer"
        summary={
          <>
            Attach a CV and choose the role. Lumofy AI scores it against that job with the same analysis your
            applicants get. <b>Nothing is added to a pipeline</b> unless you choose to.
          </>
        }
      />

      <div className="az-setup">
        {/* ── Step 1 · the CV ── */}
        <section className="dx-card az-step" aria-labelledby="az-s1">
          <p className="az-step__n" aria-hidden="true">1</p>
          <div className="az-step__body">
            <h2 className="az-step__title" id="az-s1">Attach the CV</h2>
            {file ? (
              <div className="az-file">
                <span className="az-file__ic" aria-hidden="true"><FileText className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="az-file__name" title={file.name}>{file.name}</span>
                  <span className="az-file__meta">{fmtSize(file.size)} · PDF</span>
                </span>
                <button type="button" className="ar-icon-btn" onClick={reset} disabled={busy} aria-label="Remove this CV" title="Remove">
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <label
                className={`az-drop${dragOver ? " is-over" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
              >
                <span className="az-drop__ic" aria-hidden="true"><UploadCloud className="h-6 w-6" /></span>
                <span className="az-drop__title">Drop a CV here, or <u>browse</u></span>
                <span className="az-drop__hint">PDF, up to 10 MB. Word files can't be read by the AI.</span>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="sr-only"
                  onChange={(e) => pickFile(e.target.files?.[0])}
                />
              </label>
            )}
          </div>
        </section>

        {/* ── Step 2 · the role ── */}
        <section className="dx-card az-step" aria-labelledby="az-s2">
          <p className="az-step__n" aria-hidden="true">2</p>
          <div className="az-step__body">
            <h2 className="az-step__title" id="az-s2">Choose the role</h2>
            <Select value={jobId} onValueChange={setJobId} disabled={busy}>
              <SelectTrigger className="dx-tool w-full" aria-label="Role to analyze against">
                <SelectValue placeholder={jobs.length ? "Select an open role" : "No open roles"} />
              </SelectTrigger>
              <SelectContent>
                {sortedJobs.map((j) => (
                  <SelectItem key={j.id} value={j.id}>
                    {j.title} · {j.department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="az-hint">
              {job
                ? `Scored against this role's description, ${job.requirements.length} requirement${job.requirements.length === 1 ? "" : "s"} and its scoring weights.`
                : "The score is specific to a role: the same CV can be a strong fit for one job and weak for another."}
            </p>
          </div>
        </section>
      </div>

      {/* ── Run ── */}
      <div className="az-run">
        <button
          type="button"
          className="dx-btn dx-btn--primary az-run__btn"
          onClick={run}
          disabled={!file || !job || busy || sameAsResult}
        >
          {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
          {runLabel}
        </button>
        <p className="az-hint" aria-live="polite">
          {busy
            ? phase === "uploading"
              ? "Uploading the CV securely…"
              : `Reading the CV against ${job?.title ?? "the role"}. This usually takes 20 to 60 seconds.`
            : sameAsResult
              ? "This CV has been analyzed for this role. Pick another role to compare."
              : !file || !job
                ? "Attach a CV and choose a role to start."
                : "Runs once, when you press the button."}
        </p>
      </div>

      {error && (
        <p className="az-error" role="alert">
          <X className="h-4 w-4 flex-none" aria-hidden="true" />
          {error}
        </p>
      )}

      {/* ── Result ── */}
      {busy && !result && (
        <div className="dx-card az-wait" aria-hidden="true">
          <span className={`az-wait__step${phase === "analyzing" ? " is-done" : " is-on"}`}>
            {phase === "analyzing" ? <Check className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
            Uploading the CV
          </span>
          <span className={`az-wait__step${phase === "analyzing" ? " is-on" : ""}`}>
            {phase === "analyzing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="az-wait__dot" />}
            Reading it against {job?.title ?? "the role"}
          </span>
          <span className="az-wait__step">
            <span className="az-wait__dot" />
            Writing the verdict
          </span>
        </div>
      )}

      {result && (
        <section className="az-result" aria-labelledby="az-result-title">
          <header className="az-result__head">
            <div className="min-w-0">
              <p className="dx-label">Result</p>
              <h2 className="az-result__title" id="az-result-title">
                {realText(result.analysis.candidateName) || result.fileName}
                <span> for {result.job.title}</span>
              </h2>
            </div>
            <div className="az-result__actions">
              {savedId ? (
                <button type="button" className="dx-btn dx-btn--secondary" onClick={() => onOpenApplicant(savedId)}>
                  <Check aria-hidden="true" /> Added · Open profile
                </button>
              ) : canAdd ? (
                <button type="button" className="dx-btn dx-btn--primary" onClick={addToApplicants} disabled={saving || busy}>
                  {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : <UserPlus aria-hidden="true" />}
                  Add to {result.job.title} applicants
                </button>
              ) : null}
              <button type="button" className="dx-btn dx-btn--secondary" onClick={reset} disabled={busy || saving}>
                <RotateCcw aria-hidden="true" /> Analyze another CV
              </button>
            </div>
          </header>
          <div className={busy ? "az-result__stale" : undefined}>
            <CandidateAnalysis ai={result.analysis} analyzing={false} onRun={run} disabled={busy} />
          </div>
        </section>
      )}
    </div>
  );
}
