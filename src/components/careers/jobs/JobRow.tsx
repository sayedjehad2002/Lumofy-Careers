import { memo } from "react";
import {
  ChevronRight, MoreVertical, Pencil, Copy, Link2, Linkedin, ExternalLink,
  EyeOff, Eye, Archive, CheckCircle2,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Job } from "@/types/careers";
import type { JobRow as JobRowData } from "@/lib/jobMetrics";
import { TONE_SOFT } from "../statusColors";

export interface JobRowProps {
  row: JobRowData;
  /** Opens the Applicants tab filtered to this job — the whole row does this. */
  onOpen: (jobId: string) => void;
  onEdit: (job: Job) => void;
  onDuplicate: (job: Job) => void;
  onArchive: (job: Job) => void;
  onToggleStatus: (job: Job) => void;
  onCopyLink: (jobId: string) => void;
  onShareLinkedIn: (jobId: string) => void;
  onOpenPublicPage: (jobId: string) => void;
}

function JobRowInner({
  row, onOpen, onEdit, onDuplicate, onArchive, onToggleStatus,
  onCopyLink, onShareLinkedIn, onOpenPublicPage,
}: JobRowProps) {
  const { job, applicants, hired, daysOpen, attention } = row;
  const isOpen = job.status === "open";

  return (
    <div
      role="button"
      tabIndex={0}
      /* Without this the accessible name is the row's entire text content, so a
         screen reader reads the department, location, type, age and both counts
         before saying what the button does. */
      aria-label={`${job.title} — ${applicants} applicant${applicants === 1 ? "" : "s"}. View applicants.`}
      onClick={() => onOpen(job.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(job.id); }
      }}
      /* py-2 puts the row at ~54px, which is what gets all sixteen roles above
         the fold at 1080p (16x58 overflowed by ~50px) while staying clear of the
         44px minimum for something the whole of which is a click target. */
      className="group grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2 transition-colors hover:bg-[hsl(var(--intel-card-hover))] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      {/* Identity */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
            {job.title}
          </h3>
          {/* Only the exception is labelled. With every role open, an "Open" badge
              on all sixteen rows carried no information; a "Closed" one does. */}
          {!isOpen && (
            <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              Closed
            </span>
          )}
          {/* The outcome no other number on the row shows: this role has landed someone. */}
          {hired > 0 && (
            <span
              className={`flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${TONE_SOFT.success}`}
              title={`${hired} candidate${hired === 1 ? "" : "s"} hired into this role`}
            >
              <CheckCircle2 className="h-2.5 w-2.5" aria-hidden="true" />
              {hired === 1 ? "Hired" : `${hired} hired`}
            </span>
          )}
          {attention === "starving" && (
            <span
              className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${TONE_SOFT.warning}`}
              title={`Only ${applicants} application${applicants === 1 ? "" : "s"} after ${daysOpen} days open — this role needs sourcing, not screening`}
            >
              Needs sourcing
            </span>
          )}
        </div>
        {/* Sentence case, not five uppercase mono strings of equal weight. The
            department leads because it is the category people group roles by;
            location and type are plain facts; age is last. */}
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          <span className="font-medium text-foreground/70">{job.department}</span>
          {" · "}{job.location}
          {" · "}{job.type}
          {isOpen && <>{" · "}open {daysOpen} day{daysOpen === 1 ? "" : "s"}</>}
        </p>
      </div>

      <div className="flex items-center gap-3 sm:gap-5">
        {/* Just the total. The per-row "unopened" split was noise at this level —
            the aggregate still leads the page header, and the backlog filter is
            where you go to act on it. */}
        <div className="w-24 text-right sm:w-28">
          <p className="text-sm font-semibold tabular-nums text-foreground">
            {applicants}
            <span className="ml-1 text-[11px] font-normal text-muted-foreground">
              {applicants === 1 ? "applicant" : "applicants"}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`Actions for ${job.title}`}
                title="Actions"
                className="rounded-md p-1.5 text-muted-foreground/60 transition-colors hover:bg-[hsl(var(--intel-card-hover))] hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <MoreVertical className="h-4 w-4" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            {/* Every action is a named menu item. Six identical grey icons in a row
                gave no clue which was edit, duplicate, archive or close. */}
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => onEdit(job)}>
                <Pencil className="mr-2 h-4 w-4" aria-hidden="true" /> Edit job
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(job)}>
                <Copy className="mr-2 h-4 w-4" aria-hidden="true" /> Duplicate as draft
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onCopyLink(job.id)}>
                <Link2 className="mr-2 h-4 w-4" aria-hidden="true" /> Copy apply link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onShareLinkedIn(job.id)}>
                <Linkedin className="mr-2 h-4 w-4" aria-hidden="true" /> Share to LinkedIn
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onOpenPublicPage(job.id)}>
                <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" /> Open public page
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onToggleStatus(job)}>
                {isOpen
                  ? <><EyeOff className="mr-2 h-4 w-4" aria-hidden="true" /> Close to new applicants</>
                  : <><Eye className="mr-2 h-4 w-4" aria-hidden="true" /> Reopen for applications</>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onArchive(job)} className="text-destructive focus:text-destructive">
                <Archive className="mr-2 h-4 w-4" aria-hidden="true" /> Archive job
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <ChevronRight
            className="h-4 w-4 shrink-0 text-muted-foreground/30 transition-colors group-hover:text-muted-foreground"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}

export default memo(JobRowInner);
