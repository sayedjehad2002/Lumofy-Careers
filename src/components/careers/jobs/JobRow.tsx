import { memo } from "react";
import {
  ArrowRight, MoreVertical, Pencil, Copy, Link2, Linkedin, ExternalLink,
  EyeOff, Eye, Archive, CheckCircle2, MapPin, Clock,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Job } from "@/types/careers";
import type { JobRow as JobRowData } from "@/lib/jobMetrics";

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

// The four stage buckets, in the order a candidate moves through them.
const MIX_PARTS = [
  { key: "fresh", label: "new", className: "jr-mix__fresh" },
  { key: "inProcess", label: "in process", className: "jr-mix__process" },
  { key: "hired", label: "hired", className: "jr-mix__hired" },
  { key: "rejected", label: "rejected", className: "jr-mix__rejected" },
] as const;

/**
 * One role on the Jobs board (columns are laid out in dx.css, .jr-row).
 *
 * Read left to right: what the role is, where its applicants are, how many,
 * and the way in. The whole row opens the role's applicants; the explicit
 * "View applicants" makes that discoverable instead of a hidden convention.
 */
function JobRowInner({
  row, onOpen, onEdit, onDuplicate, onArchive, onToggleStatus,
  onCopyLink, onShareLinkedIn, onOpenPublicPage,
}: JobRowProps) {
  const { job, applicants, hired, daysOpen, attention, mix } = row;
  const isOpen = job.status === "open";
  const mixSummary = MIX_PARTS.filter((p) => mix[p.key] > 0).map((p) => `${mix[p.key]} ${p.label}`).join(" · ");

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
      className="jr-row group"
    >
      {/* Role */}
      <div className="jr-role">
        <div className="jr-title-line">
          <h3 className="jr-title">{job.title}</h3>
          {/* Only the exceptions are labelled. With every role open, an "Open"
              badge on all of them carried no information; a "Closed" one does. */}
          {!isOpen && <span className="jr-badge jr-badge--muted">Closed</span>}
          {hired > 0 && (
            <span className="jr-badge jr-badge--hired" title={`${hired} candidate${hired === 1 ? "" : "s"} hired into this role`}>
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              {hired === 1 ? "Hired" : `${hired} hired`}
            </span>
          )}
          {attention === "starving" && (
            <span
              className="jr-badge jr-badge--warn"
              title={`Only ${applicants} application${applicants === 1 ? "" : "s"} after ${daysOpen} days open — this role needs sourcing, not screening`}
            >
              Needs sourcing
            </span>
          )}
          {attention === "backlog" && (
            <span className="jr-badge jr-badge--accent" title={`${row.unreviewed} applications nobody has opened yet`}>
              Unopened backlog
            </span>
          )}
        </div>
        <p className="jr-meta">
          <span className="jr-dept">{job.department}</span>
          <span className="jr-meta__item">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {job.location}
          </span>
          <span className="jr-meta__item">{job.type}</span>
          {isOpen && (
            <span className="jr-meta__item">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              Open {daysOpen} day{daysOpen === 1 ? "" : "s"}
            </span>
          )}
        </p>
      </div>

      {/* Where this role's applicants are */}
      <div className="jr-mix" title={mixSummary || "No applicants yet"}>
        {applicants > 0 ? (
          <>
            <span className="jr-mix__bar" aria-hidden="true">
              {MIX_PARTS.map((p) =>
                mix[p.key] > 0 ? <span key={p.key} className={p.className} style={{ flexGrow: mix[p.key] }} /> : null
              )}
            </span>
            <span className="jr-mix__text">
              <b>{mix.fresh}</b> new · <b>{mix.inProcess}</b> in process
            </span>
          </>
        ) : (
          <span className="jr-mix__text">No applicants yet</span>
        )}
      </div>

      {/* Total */}
      <div className="jr-count">
        <b>{applicants}</b>
        <span>{applicants === 1 ? "applicant" : "applicants"}</span>
      </div>

      {/* The way in, and everything else about the role */}
      <div className="jr-actions" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="jr-cta" onClick={() => onOpen(job.id)} tabIndex={-1} aria-hidden="true">
          View applicants
          <ArrowRight className="h-4 w-4" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label={`Actions for ${job.title}`} title="Actions" className="ar-icon-btn">
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
      </div>
    </div>
  );
}

export default memo(JobRowInner);
