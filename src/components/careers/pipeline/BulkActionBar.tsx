import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { APPLICANT_STATUSES, type ApplicantStatus } from "@/types/careers";
import { STATUS_COLORS } from "../statusColors";

interface BulkActionBarProps {
  count: number;
  /** Selected candidates the current search or triage filter is hiding, so the count is never a surprise. */
  hiddenCount: number;
  running: boolean;
  onMove: (status: ApplicantStatus) => void;
  onClear: () => void;
}

/**
 * Floating bar for the current selection.
 *
 * Anchored to the board rather than a toast: sonner cannot hold a persistent
 * control, and a bulk move of 40 candidates would otherwise fire 40 toasts —
 * the failure mode the CV Library bulk flows already ran into.
 */
export default function BulkActionBar({ count, hiddenCount, running, onMove, onClear }: BulkActionBarProps) {
  if (count === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-[hsl(var(--intel-border))] bg-[hsl(var(--intel-card))] px-3 py-2 shadow-lg">
        <span className="font-mono text-sm font-bold tabular-nums text-foreground">{count}</span>
        <span className="text-xs text-muted-foreground">
          selected
          {hiddenCount > 0 && (
            <span className="ml-1 text-muted-foreground/70" title="Still selected, but hidden by the current search or filter">
              ({hiddenCount} hidden)
            </span>
          )}
        </span>

        <div className="h-5 w-px bg-[hsl(var(--intel-border))]" aria-hidden="true" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="h-8 gap-1.5 text-xs" disabled={running}>
              {running && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              {running ? "Moving…" : "Move to stage"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-48">
            <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Move {count} to
            </DropdownMenuLabel>
            {APPLICANT_STATUSES.map((s) => (
              <DropdownMenuItem key={s.value} className="gap-2 text-xs cursor-pointer" onClick={() => onMove(s.value)}>
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

        <button
          type="button"
          onClick={onClear}
          disabled={running}
          aria-label="Clear selection"
          title="Clear selection"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-[hsl(var(--intel-card-hover))] hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
