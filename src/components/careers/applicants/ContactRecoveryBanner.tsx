import { useMemo, useRef, useState } from "react";
import { MailSearch, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Applicant } from "@/types/careers";

/**
 * Recovers missing contact details for a backlog of applicants.
 *
 * Only ONE function ever extracted email/phone (cv-library-parse), and it fails on
 * stubborn PDFs — so candidates can sit un-emailable even though the analyzer read
 * their CV fine. This runs a small transcription-only pass (analyze-cv
 * action:"extract-contacts") over everyone missing an email.
 *
 * Strictly sequential with a breather: concurrent Gemini calls on this project's key
 * cause sustained overload 5xx. The server fills EMPTY fields only, so nothing HR
 * typed can be overwritten.
 */
const ContactRecoveryBanner = ({
  applicants, sessionToken, onDone,
}: {
  applicants: Applicant[];
  sessionToken: string | null;
  onDone: () => void;
}) => {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [found, setFound] = useState(0);
  const [noneOnCv, setNoneOnCv] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const cancelRef = useRef(false);
  const runTotalRef = useRef(0);

  // Only applicants we can actually help: no email, and a CV the AI can read
  // (Gemini cannot read Word files).
  const targets = useMemo(
    () => applicants.filter(
      (a) => !a.email?.trim() && a.cvStoragePath && !/\.docx?$/i.test(a.cvStoragePath),
    ),
    [applicants],
  );

  if (targets.length === 0 && !finished) return null;

  const run = async () => {
    setRunning(true);
    cancelRef.current = false;
    const batch = targets;          // snapshot: targets shrinks as rows are patched
    runTotalRef.current = batch.length;
    let ok = 0, none = 0, failed = 0;
    for (let i = 0; i < batch.length; i++) {
      if (cancelRef.current) break;
      try {
        const { data } = await supabase.functions.invoke("analyze-cv", {
          body: { action: "extract-contacts", applicantId: batch[i].id, sessionToken },
        });
        if (data?.ok && (data.patched as string[] | undefined)?.length) ok++;
        else if (data?.ok) none++;   // CV read fine, but no contact details printed
        else failed++;               // unreadable CV / AI unavailable
      } catch { failed++; }
      setDone(i + 1);
      setFound(ok);
      setNoneOnCv(none);
      setFailedCount(failed);
      if (i + 1 < batch.length) await new Promise((r) => setTimeout(r, 1200));
    }
    setRunning(false);
    setFinished(true);
    onDone();
    // Report all three outcomes: "0 found" alone reads like a broken feature when
    // the real answer is usually "these CVs don't print an email" (LinkedIn PDF
    // exports omit it entirely).
    toast.success(
      `Found ${ok} email${ok === 1 ? "" : "s"}` +
      (none ? ` · ${none} CV${none === 1 ? "" : "s"} had none printed` : "") +
      (failed ? ` · ${failed} couldn't be read` : ""),
    );
  };

  // Denominator is frozen at run start: `targets` shrinks live as rows get
  // patched, which would otherwise make the progress bar jump backwards.
  const runTotal = runTotalRef.current || targets.length;
  const pct = runTotal ? Math.round((done / runTotal) * 100) : 0;

  return (
    <div className="mb-4 rounded-xl border border-primary/25 bg-primary/5 p-3.5">
      {finished && !running ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[hsl(var(--intel-success))]" aria-hidden="true" />
          <span>Recovered <span className="font-semibold">{found}</span> email{found === 1 ? "" : "s"}.</span>
          {noneOnCv > 0 && (
            <span className="text-muted-foreground">
              {noneOnCv} CV{noneOnCv === 1 ? "" : "s"} print no email at all (common for LinkedIn PDF exports) — those need asking the candidate directly.
            </span>
          )}
          {failedCount > 0 && <span className="text-muted-foreground">{failedCount} couldn't be read.</span>}
        </div>
      ) : running ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Reading CVs… {done} of {runTotal} · {found} found
            {noneOnCv > 0 && <span className="font-normal text-muted-foreground"> · {noneOnCv} print no email</span>}
          </p>
          <Progress value={pct} className="h-1.5" />
          <div className="flex items-center gap-3">
            <p className="text-[11px] text-muted-foreground">One at a time to keep the AI reliable. You can keep working.</p>
            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => { cancelRef.current = true; }}>
              Stop
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <MailSearch className="h-4 w-4 flex-shrink-0 text-primary" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-sm">
            <span className="font-semibold">{targets.length} candidate{targets.length === 1 ? "" : "s"}</span>
            <span className="text-muted-foreground"> can't be emailed — their address wasn't captured when the CV was uploaded. It's usually printed on the CV itself.</span>
          </p>
          <Button size="sm" className="gap-1.5" onClick={run}>
            <MailSearch className="h-3.5 w-3.5" aria-hidden="true" />
            Find their emails
          </Button>
        </div>
      )}
    </div>
  );
};

export default ContactRecoveryBanner;
