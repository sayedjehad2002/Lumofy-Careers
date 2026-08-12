import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Briefcase, Check, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import type { Job } from "@/types/careers";

interface JobFilterProps {
  jobs: Job[];
  /** Empty = every job. Never treated as "no jobs". */
  selected: readonly string[];
  /**
   * Must accept an updater, not just a value.
   *
   * Ticking two roles inside one React batch would otherwise have both toggles
   * derive their result from the same render's `selected`, and the second would
   * silently discard the first. The board's `onViewChange` carries the same
   * requirement for the same reason.
   */
  onChange: Dispatch<SetStateAction<string[]>>;
  className?: string;
}

/** Above this many roles, scanning beats scrolling — so a search box appears. */
const SEARCH_THRESHOLD = 8;

/**
 * Multi-select job scope, shared by the Applicants roster and the Pipeline board.
 *
 * A plain <Select> can only ever answer "which one job?", which forced HR to
 * look at three intern pipelines one at a time. This answers "which jobs?" and
 * keeps the single-job case just as fast — one click still narrows to one role.
 *
 * Built on Popover rather than DropdownMenu because a menu closes on every
 * activation; ticking four roles should not mean reopening the list four times.
 */
export default function JobFilter({ jobs, selected, onChange, className = "" }: JobFilterProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) => j.title.toLowerCase().includes(q));
  }, [jobs, query]);

  const toggle = (id: string) => {
    onChange((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // The trigger has to say what is actually filtered without growing with the
  // selection — a button listing four job titles would push the toolbar apart.
  const label = useMemo(() => {
    if (selected.length === 0) return "All jobs";
    if (selected.length === 1) {
      return jobs.find((j) => j.id === selected[0])?.title ?? "1 job";
    }
    return `${selected.length} jobs`;
  }, [selected, jobs]);

  const active = selected.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label={`Filter by job — ${label}`}
          className={`h-9 shrink-0 justify-between gap-2 rounded-xl border-border bg-card text-xs font-normal ${active ? "border-primary/40 text-foreground" : "text-muted-foreground"} ${className}`}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{label}</span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-64 p-0">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Filter by job
          </span>
          {active && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="flex items-center gap-1 rounded text-[11px] text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-3 w-3" aria-hidden="true" />
              Clear
            </button>
          )}
        </div>

        {jobs.length > SEARCH_THRESHOLD && (
          <div className="border-b border-border p-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search roles…"
              aria-label="Search roles"
              className="h-8 rounded-lg text-xs"
            />
          </div>
        )}

        <div className="max-h-64 overflow-y-auto scrollbar-slim p-1">
          {shown.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">No roles match.</p>
          ) : (
            shown.map((j) => {
              const on = selectedSet.has(j.id);
              return (
                <button
                  key={j.id}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggle(j.id)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${on ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
                    aria-hidden="true"
                  >
                    {on && <Check className="h-3 w-3" />}
                  </span>
                  <span className="truncate">{j.title}</span>
                </button>
              );
            })
          )}
        </div>

        {/* States the rule the empty selection encodes, so nobody reads a blank
            list of checkboxes as "nothing will be shown". */}
        {!active && (
          <p className="border-t border-border px-3 py-2 text-[10px] text-muted-foreground">
            Nothing ticked — showing every job.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
