import { useMemo, useState } from "react";
import { Briefcase, Plus, ArchiveRestore, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Applicant, Job } from "@/types/careers";
import {
  JOB_FILTERS, JOB_SORT_LABELS, jobRows, jobsSummary, sortJobs,
  type JobFilter, type JobSort,
} from "@/lib/jobMetrics";
import { TONE_TEXT } from "../statusColors";
import JobRow from "./JobRow";

export interface JobsViewProps {
  jobs: Job[];
  applicants: Applicant[];
  archivedJobs: Job[];
  onCreate: () => void;
  onOpen: (jobId: string) => void;
  onEdit: (job: Job) => void;
  onDuplicate: (job: Job) => void;
  onArchive: (job: Job) => void;
  onToggleStatus: (job: Job) => void;
  onRestore: (job: Job) => void;
  onCopyLink: (jobId: string) => void;
  onShareLinkedIn: (jobId: string) => void;
  onOpenPublicPage: (jobId: string) => void;
  applicantCount: (jobId: string) => number;
}

export default function JobsView({
  jobs, applicants, archivedJobs, onCreate, onOpen, onEdit, onDuplicate, onArchive,
  onToggleStatus, onRestore, onCopyLink, onShareLinkedIn, onOpenPublicPage, applicantCount,
}: JobsViewProps) {
  const [filter, setFilter] = useState<JobFilter>("all");
  const [sort, setSort] = useState<JobSort>("attention");

  // Recomputed when the data changes rather than pinned at mount, so "open N days"
  // and the sourcing flag don't freeze on a long-lived tab.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = useMemo(() => Date.now(), [jobs, applicants]);

  const rows = useMemo(() => jobRows(jobs, applicants, now), [jobs, applicants, now]);
  const summary = useMemo(() => jobsSummary(rows), [rows]);

  const visible = useMemo(
    () => sortJobs(rows.filter(JOB_FILTERS[filter]), sort),
    [rows, filter, sort]
  );

  /**
   * Only chips with something behind them.
   *
   * The old header always rendered "0 closed" — a permanently dead control,
   * because no job here has ever been closed.
   */
  const chips = ([
    { id: "all", label: "All roles", count: rows.length },
    { id: "starving", label: "Needs sourcing", count: summary.starving },
    { id: "backlog", label: "Unopened backlog", count: summary.backlog },
    { id: "closed", label: "Closed", count: summary.closed },
  ] satisfies { id: JobFilter; label: string; count: number }[])
    .filter((c) => c.id === "all" || c.count > 0);

  return (
    <div>
      {/* ── Header: what is going on, in a sentence ── */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Briefcase className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">Jobs</h1>
            <p className="mt-0.5 text-sm">
              {rows.length === 0 ? (
                <span className="text-muted-foreground">No roles yet.</span>
              ) : (
                <>
                  <span className="text-muted-foreground">
                    {summary.open} open role{summary.open === 1 ? "" : "s"}
                  </span>
                  {summary.starving > 0 && (
                    <span className={TONE_TEXT.warning}>
                      {" · "}{summary.starving} need{summary.starving === 1 ? "s" : ""} sourcing
                    </span>
                  )}
                  {summary.unreviewed > 0 && (
                    <span className="text-muted-foreground">
                      {" · "}{summary.unreviewed} application{summary.unreviewed === 1 ? "" : "s"} never opened
                    </span>
                  )}
                </>
              )}
            </p>
          </div>
        </div>
        <Button onClick={onCreate} className="shrink-0 rounded-xl">
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          New job
        </Button>
      </div>

      {/* ── Filters + sort ── */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {chips.map((chip) => {
          const active = filter === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(chip.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                active
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-[hsl(var(--intel-border))] bg-[hsl(var(--intel-card))] text-muted-foreground hover:border-primary/40"
              }`}
            >
              {chip.label}
              <span className="ml-1.5 tabular-nums text-muted-foreground">{chip.count}</span>
            </button>
          );
        })}

        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 rounded-xl text-xs">
                Sort: {JOB_SORT_LABELS[sort]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Order by
              </DropdownMenuLabel>
              {(Object.keys(JOB_SORT_LABELS) as JobSort[]).map((mode) => (
                <DropdownMenuItem key={mode} className="gap-2 text-xs cursor-pointer" onClick={() => setSort(mode)}>
                  <Check className={`h-3 w-3 ${sort === mode ? "opacity-100" : "opacity-0"}`} aria-hidden="true" />
                  {JOB_SORT_LABELS[mode]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── The list ──
          One bordered container with divided rows rather than sixteen separate
          cards: it drops ~120px of inter-card gutter, aligns the numbers into a
          column you can actually compare down, and gets the whole board on screen. */}
      {visible.length > 0 ? (
        <div className="divide-y divide-[hsl(var(--intel-border))] overflow-hidden rounded-xl border border-[hsl(var(--intel-border))] bg-[hsl(var(--intel-card))]">
          {visible.map((row) => (
            <JobRow
              key={row.job.id}
              row={row}
              onOpen={onOpen}
              onEdit={onEdit}
              onDuplicate={onDuplicate}
              onArchive={onArchive}
              onToggleStatus={onToggleStatus}
              onCopyLink={onCopyLink}
              onShareLinkedIn={onShareLinkedIn}
              onOpenPublicPage={onOpenPublicPage}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[hsl(var(--intel-border))] py-16 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary">
            <Briefcase className="h-6 w-6 text-muted-foreground/40" aria-hidden="true" />
          </div>
          {rows.length === 0 ? (
            <>
              <p className="font-medium">No jobs created yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Use “New job” to post your first vacancy.</p>
            </>
          ) : (
            <>
              <p className="font-medium">Nothing matches this filter</p>
              <button
                type="button"
                onClick={() => setFilter("all")}
                className="mt-1 text-xs text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Show all {rows.length} roles
              </button>
            </>
          )}
        </div>
      )}

      {archivedJobs.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Archived · {archivedJobs.length}
          </h2>
          <div className="divide-y divide-[hsl(var(--intel-border))] overflow-hidden rounded-xl border border-[hsl(var(--intel-border))] bg-[hsl(var(--intel-card))]">
            {archivedJobs.map((job) => {
              const count = applicantCount(job.id);
              return (
                <div key={job.id} className="flex items-center justify-between gap-4 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground/80">{job.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {job.department} · {count} applicant{count === 1 ? "" : "s"} kept
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 shrink-0 rounded-lg text-xs" onClick={() => onRestore(job)}>
                    <ArchiveRestore className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    Restore
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
