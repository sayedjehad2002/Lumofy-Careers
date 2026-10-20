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
 * stays neutral rather than competing for attention. Styles live in dx.css (.dx-fact).
 */
const TONE_CLASS: Record<TriageTone, string> = {
  accent: " is-accent",
  warning: " is-warn",
  muted: "",
  neutral: "",
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
            className={`dx-fact flex-1 sm:flex-none${empty ? "" : TONE_CLASS[fact.tone]}${isActive ? " is-on" : ""}`}
          >
            <span className="dx-fact__n">{fact.count}</span>
            <span className="dx-fact__label">{fact.label}</span>
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
