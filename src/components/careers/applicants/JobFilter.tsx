import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Briefcase, Check, ChevronDown, Minus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import type { Job } from "@/types/careers";
import { jobFilterGroups, jobFilterLabel } from "@/lib/jobMetrics";

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
  /**
   * Applications per job id, counted over EVERY applicant rather than the list
   * already scoped by this filter, or every unticked role would read 0.
   */
  counts?: ReadonlyMap<string, number>;
  className?: string;
}

/** Above this many roles, scanning beats scrolling — so a search box appears. */
const SEARCH_THRESHOLD = 8;

type Tick = "all" | "some" | "none";

function TickBox({ state }: { state: Tick }) {
  return (
    <span
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${state === "none" ? "border-border" : "border-primary bg-primary text-primary-foreground"}`}
      aria-hidden="true"
    >
      {state === "all" && <Check className="h-3 w-3" />}
      {state === "some" && <Minus className="h-3 w-3" />}
    </span>
  );
}

/**
 * Multi-select job scope, shared by the Applicants roster and the Pipeline board.
 *
 * A plain <Select> can only ever answer "which one job?", which forced HR to
 * look at three intern pipelines one at a time. This answers "which jobs?" and
 * keeps the single-job case just as fast — one click still narrows to one role.
 *
 * Roles are grouped under their department because titles repeat across teams
 * (a "Full Stack Intern" for Sales and another for Engineering), and a flat list
 * of titles showed them as two identical lines. A department header also ticks
 * every role in that team at once.
 *
 * Built on Popover rather than DropdownMenu because a menu closes on every
 * activation; ticking four roles should not mean reopening the list four times.
 */
export default function JobFilter({ jobs, selected, onChange, counts, className = "" }: JobFilterProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const groups = useMemo(() => jobFilterGroups(jobs, query), [jobs, query]);

  const toggle = (id: string) => {
    onChange((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  /** All ticked → untick the lot; otherwise tick the ones that are missing. */
  const toggleGroup = (ids: string[], state: Tick) => {
    onChange((prev) => (state === "all"
      ? prev.filter((x) => !ids.includes(x))
      : [...prev, ...ids.filter((id) => !prev.includes(id))]));
  };

  // The trigger has to say what is actually filtered without growing with the
  // selection — a button listing four job titles would push the toolbar apart.
  const label = useMemo(() => jobFilterLabel(jobs, selected), [jobs, selected]);

  const active = selected.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label={`Filter by job — ${label}`}
          title={label}
          className={`dx-tool shrink-0 justify-between gap-2${active ? " is-on" : ""} ${className}`}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{label}</span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[min(20rem,calc(100vw-2rem))] p-0">
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
              Clear {selected.length}
            </button>
          )}
        </div>

        {jobs.length > SEARCH_THRESHOLD && (
          <div className="border-b border-border p-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search roles or departments…"
              aria-label="Search roles or departments"
              className="h-8 rounded-lg text-xs"
            />
          </div>
        )}

        <div className="max-h-72 overflow-y-auto scrollbar-slim p-1">
          {groups.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">No roles match.</p>
          ) : (
            groups.map((g) => {
              const ids = g.jobs.map((j) => j.id);
              const ticked = ids.filter((id) => selectedSet.has(id)).length;
              const state: Tick = ticked === 0 ? "none" : ticked === ids.length ? "all" : "some";
              return (
                <div key={g.department} role="group" aria-label={g.department} className="pb-1">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={state === "all" ? true : state === "some" ? "mixed" : false}
                    aria-label={`Every ${g.department} role`}
                    onClick={() => toggleGroup(ids, state)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 pb-1 pt-2 text-left transition-colors hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <TickBox state={state} />
                    <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {g.department}
                    </span>
                  </button>
                  {g.jobs.map((j) => {
                    const checked = selectedSet.has(j.id);
                    const count = counts ? (counts.get(j.id) ?? 0) : undefined;
                    return (
                      <button
                        key={j.id}
                        type="button"
                        role="checkbox"
                        aria-checked={checked}
                        onClick={() => toggle(j.id)}
                        className="flex w-full items-center gap-2 rounded-lg py-1.5 pl-6 pr-2 text-left text-xs transition-colors hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <TickBox state={checked ? "all" : "none"} />
                        <span className={`min-w-0 flex-1 truncate ${j.archivedAt ? "text-muted-foreground" : ""}`}>
                          {j.title}
                        </span>
                        {(j.archivedAt || j.status === "closed") && (
                          <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {j.archivedAt ? "Archived" : "Closed"}
                          </span>
                        )}
                        {count !== undefined && (
                          <span className="shrink-0 tabular-nums text-[11px] text-muted-foreground">{count}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
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
