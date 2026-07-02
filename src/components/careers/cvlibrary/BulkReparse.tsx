import { useState } from "react";
import { RefreshCw, Loader2, Check, AlertCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { TONE_TEXT } from "@/components/careers/statusColors";

interface CVCandidate {
  id: string;
  name: string | null;
  status: string;
  skills: string[];
  uploaded_at: string;
  manual_department?: string | null;
  suggested_department?: string | null;
  classification_confidence?: string | null;
  ai_analysis?: { unreadable?: boolean; reason?: string } | null;
}

interface Props {
  candidates: CVCandidate[];
  filteredIds: string[];
  onReparse: (candidateId: string) => Promise<void>;
  onRefresh: () => void;
}

export default function BulkReparse({ candidates, filteredIds, onReparse, onRefresh }: Props) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [failed, setFailed] = useState(0);
  const [scope, setScope] = useState<"all" | "filtered" | "unparsed" | "incomplete">("incomplete");

  const unparsedCandidates = candidates.filter(c => !c.skills || c.skills.length === 0);
  // "Incomplete" = the candidates HR can't organize yet: no/low-confidence
  // classification (the folder tree's own Unclassified rule) OR missing name.
  // Deterministic unreadables are excluded — "word" files and blank/"no_text"
  // scans re-fail identically every run (they need a PDF re-upload, not a retry),
  // and including them would burn AI calls and keep the scope count from ever
  // reaching zero. Transient "ai_error" ones ARE included (retry is correct).
  const incompleteCandidates = candidates.filter(c => {
    const dept = c.manual_department || c.suggested_department;
    const unclassified = !dept || c.classification_confidence === "Low";
    const unnamed = !c.name;
    const deterministicUnreadable = c.ai_analysis?.unreadable === true &&
      (c.ai_analysis?.reason === "word" || c.ai_analysis?.reason === "no_text");
    return (unclassified || unnamed) && !deterministicUnreadable;
  });
  const targetIds = scope === "all" ? candidates.map(c => c.id) :
    scope === "filtered" ? filteredIds :
    scope === "incomplete" ? incompleteCandidates.map(c => c.id) :
    unparsedCandidates.map(c => c.id);

  const handleRun = async () => {
    if (targetIds.length === 0) {
      toast.info("No candidates to re-parse");
      return;
    }

    setRunning(true);
    setTotal(targetIds.length);
    setCompleted(0);
    setFailed(0);
    setProgress(0);

    let done = 0;
    let fail = 0;

    // Process STRICTLY ONE candidate at a time. Empirically (live-tested on this
    // project's Gemini key), solo calls succeed ~100% while even two concurrent
    // candidate chains trigger sustained "model overloaded" 5xx failures — the
    // API tier rejects parallel multimodal requests. Sequential is ~2x slower but
    // actually completes. Each candidate's own parse -> classify -> analyze chain
    // is already sequential inside processCandidate.
    for (let i = 0; i < targetIds.length; i++) {
      try {
        await onReparse(targetIds[i]);
        done++;
      } catch {
        fail++;
      }

      setCompleted(done);
      setFailed(fail);
      setProgress(Math.round(((done + fail) / targetIds.length) * 100));

      // Breather between candidates to stay clear of per-minute rate limits.
      if (i + 1 < targetIds.length) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    setRunning(false);
    onRefresh();
    toast.success(`Re-parse complete: ${done} succeeded, ${fail} failed`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg">Bulk AI Re-Parse</h3>
      </div>

      <div className="rounded-xl bg-card border border-border p-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          Re-analyze candidates with the latest AI model for improved extraction accuracy.
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ScopeCard
            active={scope === "incomplete"}
            onClick={() => setScope("incomplete")}
            label="Unclassified / Unnamed"
            count={incompleteCandidates.length}
            desc="No or low-confidence classification, or missing name"
          />
          <ScopeCard
            active={scope === "unparsed"}
            onClick={() => setScope("unparsed")}
            label="Unparsed Only"
            count={unparsedCandidates.length}
            desc="CVs with no extracted skills"
          />
          <ScopeCard
            active={scope === "filtered"}
            onClick={() => setScope("filtered")}
            label="Current Filter"
            count={filteredIds.length}
            desc="CVs matching active filters"
          />
          <ScopeCard
            active={scope === "all"}
            onClick={() => setScope("all")}
            label="All Candidates"
            count={candidates.length}
            desc="Re-parse entire library"
          />
        </div>

        {running ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                Processing {completed + failed} of {total}...
              </span>
              <span className="text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex gap-4 text-xs">
              <span className={`flex items-center gap-1 ${TONE_TEXT.success}`}><Check className="w-3 h-3" aria-hidden="true" /> {completed} done</span>
              {failed > 0 && <span className="text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" aria-hidden="true" /> {failed} failed</span>}
            </div>
          </div>
        ) : (
          <Button onClick={handleRun} disabled={targetIds.length === 0} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Re-parse {targetIds.length} candidate{targetIds.length !== 1 ? "s" : ""}
          </Button>
        )}

        <p className="text-[10px] text-muted-foreground">
          ⚡ Processing in small batches with delays to avoid rate limits. Manual HR overrides are preserved.
        </p>
      </div>
    </div>
  );
}

function ScopeCard({ active, onClick, label, count, desc }: {
  active: boolean; onClick: () => void; label: string; count: number; desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`h-full rounded-lg p-3 text-left border transition-colors ${active ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/30"}`}
    >
      <p className="text-sm font-semibold">{label}</p>
      <p className="text-xl font-bold mt-1">{count}</p>
      <p className="text-[10px] text-muted-foreground">{desc}</p>
    </button>
  );
}
