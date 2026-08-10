import { X } from "lucide-react";
import type { TriageFact, TriageFactId, TriageTone } from "@/lib/pipelineMetrics";

interface PipelineTriageBarProps {
  facts: TriageFact[];
  active: TriageFactId | null;
  onToggle: (id: TriageFactId | null) => void;
}

/**
 * Colour carries urgency, not decoration: only the two facts that represent
 * someone waiting on a human get a tint. "Arrived this week" is context, so it
 * stays neutral rather than competing for attention.
 */
const TONE_VALUE: Record<TriageTone, string> = {
  accent: "text-primary",
  warning: "text-[hsl(var(--intel-warning))]",
  muted: "text-foreground/70",
  neutral: "text-foreground/70",
};

const TONE_ACTIVE: Record<TriageTone, string> = {
  accent: "border-primary bg-primary/10",
  warning: "border-[hsl(var(--intel-warning))] bg-[hsl(var(--intel-warning))]/10",
  muted: "border-foreground/40 bg-[hsl(var(--intel-card-hover))]",
  neutral: "border-foreground/40 bg-[hsl(var(--intel-card-hover))]",
};

/**
 * Four facts that name what needs doing, each one a filter.
 *
 * Replaces the old PipelineHealthScorecard, whose composite score was pinned
 * near zero by construction: velocity bottomed out at an average of 12.5 days in
 * stage (the real figure is 27) and "distribution" scored the board down for
 * holding more people at the top of the funnel than the bottom, which is what a
 * funnel is. It reported 12/100 and could not respond to any amount of work.
 *
 * These numbers move the moment someone acts, and clicking one shows exactly
 * the people it counted.
 */
export default function PipelineTriageBar({ facts, active, onToggle }: PipelineTriageBarProps) {
  return (
    <div className="flex flex-wrap items-stretch gap-2" role="group" aria-label="Filter the board by what needs attention">
      {facts.map((fact) => {
        const isActive = active === fact.id;
        const empty = fact.count === 0;
        return (
          <button
            key={fact.id}
            type="button"
            disabled={empty}
            aria-pressed={isActive}
            title={empty ? `Nothing here right now — ${fact.hint}` : fact.hint}
            onClick={() => onToggle(isActive ? null : fact.id)}
            className={`group flex min-w-[132px] flex-1 items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors sm:flex-none ${
              isActive
                ? TONE_ACTIVE[fact.tone]
                : "border-[hsl(var(--intel-border))] bg-[hsl(var(--intel-card))]"
            } ${
              empty
                ? "cursor-default opacity-55"
                : "cursor-pointer hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            }`}
          >
            <span className={`font-mono text-xl font-bold tabular-nums leading-none ${empty ? "text-muted-foreground" : TONE_VALUE[fact.tone]}`}>
              {fact.count}
            </span>
            <span className="min-w-0 text-[11px] font-medium leading-tight text-muted-foreground">
              {fact.label}
            </span>
            {isActive && (
              <span className="ml-auto shrink-0 text-muted-foreground" aria-hidden="true">
                <X className="h-3.5 w-3.5" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
