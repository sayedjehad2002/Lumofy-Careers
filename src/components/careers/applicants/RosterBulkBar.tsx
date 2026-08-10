import { Loader2, X, Sparkles, GitCompareArrows } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { APPLICANT_STATUSES, type ApplicantStatus } from "@/types/careers";
import { STATUS_COLORS } from "../statusColors";

export interface RosterBulkBarProps {
  count: number;
  /** Selected candidates the current facet or search is hiding, so the count is never a surprise. */
  hiddenCount: number;
  moving: boolean;
  /** Determinate progress for the AI run — null when not scoring. */
  analysis: { done: number; total: number; current: string | null } | null;
  onMove: (status: ApplicantStatus) => void;
  onAnalyze: () => void;
  onCompare: () => void;
  onCancelAnalysis: () => void;
  onClear: () => void;
}

/**
 * Floating bar for the current selection — same placement and language as the
 * Pipeline board's, so the two screens behave identically.
 *
 * Anchored to the page rather than a toast: sonner cannot hold a persistent
 * control, and a 40-candidate run would otherwise fire 40 toasts.
 */
export default function RosterBulkBar({
  count, hiddenCount, moving, analysis, onMove, onAnalyze, onCompare, onCancelAnalysis, onClear,
}: RosterBulkBarProps) {
  if (count === 0) return null;
  const busy = moving || analysis !== null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
      <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-3 rounded-xl border border-[hsl(var(--intel-border))] bg-[hsl(var(--intel-card))] px-3 py-2 shadow-lg">
        {analysis ? (
          // While scoring, the bar becomes the progress readout — determinate,
          // and naming who is in flight so a long run doesn't look frozen.
          <>
            <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
            <span className="text-xs text-foreground">
              Scoring{" "}
              <span className="font-mono font-bold tabular-nums">
                {analysis.done} of {analysis.total}
              </span>
              {analysis.current && <span className="text-muted-foreground"> — {analysis.current}</span>}
            </span>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onCancelAnalysis}>
              Stop
            </Button>
          </>
        ) : (
          <>
            <span className="font-mono text-sm font-bold tabular-nums text-foreground">{count}</span>
            <span className="text-xs text-muted-foreground">
              selected
              {hiddenCount > 0 && (
                <span
                  className="ml-1 text-muted-foreground/70"
                  title="Still selected, but hidden by the current search or filter"
                >
                  ({hiddenCount} hidden)
                </span>
              )}
            </span>

            <div className="h-5 w-px bg-[hsl(var(--intel-border))]" aria-hidden="true" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="h-8 gap-1.5 text-xs" disabled={busy}>
                  {moving && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                  {moving ? "Moving…" : "Move to stage"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-48">
                <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Move {count} to
                </DropdownMenuLabel>
                {APPLICANT_STATUSES.map((s) => (
                  <DropdownMenuItem key={s.value} className="gap-2 text-xs" onClick={() => onMove(s.value)}>
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: STATUS_COLORS[s.value] }}
                      aria-hidden="true"
                    />
                    {s.label}
                    {(s.value === "hired" || s.value === "rejected") && (
                      <span className="ml-auto text-[10px] text-muted-foreground">confirm</span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={onAnalyze} disabled={busy}>
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Run AI analysis
            </Button>

            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={onCompare} disabled={busy}>
              <GitCompareArrows className="h-3.5 w-3.5" aria-hidden="true" />
              Compare
            </Button>

            <button
              type="button"
              onClick={onClear}
              aria-label="Clear selection"
              title="Clear selection"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-[hsl(var(--intel-card-hover))] hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
