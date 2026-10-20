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
import JobRow from "./JobRow";
import { PageHeader, Chip, EmptyState } from "../dashboard/primitives";

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

  // Sorting by department groups the board under department headings; every
  // other order is one list, so "Needs attention" still leads with the problems.
  const groups = useMemo(() => {
    if (sort !== "department") return [{ department: null as string | null, rows: visible }];
    const byDept = new Map<string, typeof visible>();
    for (const r of visible) {
      const d = r.job.department?.trim() || "No department";
      const list = byDept.get(d);
      if (list) list.push(r);
      else byDept.set(d, [r]);
    }
    return [...byDept.entries()].map(([department, list]) => ({ department: department as string | null, rows: list }));
  }, [visible, sort]);

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
      <PageHeader
        eyebrow="Hiring"
        title="Jobs"
        summary={
          rows.length === 0 ? (
            "No roles yet."
          ) : (
            <>
              <b>{summary.open}</b> open role{summary.open === 1 ? "" : "s"}
              {summary.starving > 0 && (
                <>
                  {" · "}
                  <span className="is-warn">
                    {summary.starving} need{summary.starving === 1 ? "s" : ""} sourcing
                  </span>
                </>
              )}
              {summary.unreviewed > 0 && (
                <>
                  {" · "}
                  <b>{summary.unreviewed}</b> application{summary.unreviewed === 1 ? "" : "s"} never opened
                </>
              )}
            </>
          )
        }
        actions={
          <button type="button" onClick={onCreate} className="dx-btn dx-btn--primary">
            <Plus aria-hidden="true" />
            New job
          </button>
        }
      />

      {/* ── Filters + sort ── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="dx-chips" role="group" aria-label="Filter roles">
          {chips.map((chip) => (
            <Chip
              key={chip.id}
              active={filter === chip.id}
              count={chip.count}
              tone={chip.id === "starving" ? "warning" : undefined}
              onClick={() => setFilter(chip.id)}
            >
              {chip.label}
            </Chip>
          ))}
        </div>

        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="dx-tool">
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
        <div className="grid gap-6">
          {groups.map((group) => (
            <section key={group.department ?? "all"} aria-label={group.department ?? "All roles"}>
              {/* Department heading, only when sorted by department: the public
                  role board's grouping, with the count beside the name. */}
              {group.department && (
                <h2 className="dx-label">
                  {group.department} <span className="dx-label__n">{group.rows.length}</span>
                </h2>
              )}
              <div className="dx-list jr-table">
                <div className="jr-head" aria-hidden="true">
                  <span>Role</span>
                  <span>Where applicants are</span>
                  <span className="text-right">Total</span>
                  <span />
                </div>
                {group.rows.map((row) => (
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
            </section>
          ))}

          <p className="jr-legend" aria-hidden="true">
            <span><i className="jr-mix__fresh" />New, not yet opened</span>
            <span><i className="jr-mix__process" />In process</span>
            <span><i className="jr-mix__hired" />Hired</span>
            <span><i className="jr-mix__rejected" />Rejected</span>
          </p>
        </div>
      ) : (
        rows.length === 0 ? (
          <EmptyState icon={Briefcase} title="No jobs created yet">
            <p>Use “New job” to post your first vacancy.</p>
          </EmptyState>
        ) : (
          <EmptyState icon={Briefcase} title="Nothing matches this filter">
            <button type="button" onClick={() => setFilter("all")}>
              Show all {rows.length} roles
            </button>
          </EmptyState>
        )
      )}

      {archivedJobs.length > 0 && (
        <div className="mt-6">
          <h2 className="dx-label">
            Archived <span className="dx-label__n">{archivedJobs.length}</span>
          </h2>
          <div className="dx-list">
            {archivedJobs.map((job) => {
              const count = applicantCount(job.id);
              return (
                <div key={job.id} className="flex items-center justify-between gap-4 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="dx-row-title truncate text-[0.9375rem] text-foreground/80">{job.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {job.department} · {count} applicant{count === 1 ? "" : "s"} kept
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="dx-tool shrink-0" onClick={() => onRestore(job)}>
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
