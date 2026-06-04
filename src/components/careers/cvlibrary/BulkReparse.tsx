import { useState } from "react";
import { RefreshCw, Loader2, Check, AlertCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface CVCandidate {
  id: string;
  name: string | null;
  status: string;
  skills: string[];
  uploaded_at: string;
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
  const [scope, setScope] = useState<"all" | "filtered" | "unparsed">("unparsed");

  const unparsedCandidates = candidates.filter(c => !c.skills || c.skills.length === 0);
  const targetIds = scope === "all" ? candidates.map(c => c.id) :
    scope === "filtered" ? filteredIds :
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

    // Process in batches of 3
    for (let i = 0; i < targetIds.length; i += 3) {
      const batch = targetIds.slice(i, i + 3);
      const results = await Promise.allSettled(batch.map(id => onReparse(id)));

      results.forEach(r => {
        if (r.status === "fulfilled") done++;
        else fail++;
      });

      setCompleted(done);
      setFailed(fail);
      setProgress(Math.round(((done + fail) / targetIds.length) * 100));

      // Small delay between batches to avoid rate limits
      if (i + 3 < targetIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1500));
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

        <div className="grid grid-cols-3 gap-3">
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
              <span className="text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" /> {completed} done</span>
              {failed > 0 && <span className="text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {failed} failed</span>}
            </div>
          </div>
        ) : (
          <Button onClick={handleRun} disabled={targetIds.length === 0} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Re-Parse {targetIds.length} Candidate{targetIds.length !== 1 ? "s" : ""}
          </Button>
        )}

        <p className="text-[10px] text-muted-foreground">
          ⚡ Processing in batches of 3 with delays to avoid rate limits. Manual HR overrides are preserved.
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
      className={`rounded-lg p-3 text-left border transition-colors ${active ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/30"}`}
    >
      <p className="text-sm font-semibold">{label}</p>
      <p className="text-xl font-bold mt-1">{count}</p>
      <p className="text-[10px] text-muted-foreground">{desc}</p>
    </button>
  );
}
