import { memo } from "react";
import { Link } from "react-router-dom";
import { MoreVertical, ChevronRight, MailWarning } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { APPLICANT_STATUSES, type Applicant } from "@/types/careers";
import type { SlaState } from "@/lib/pipelineMetrics";
import { STATUS_COLORS, fitBand } from "../statusColors";

export interface ApplicantRowProps {
  applicant: Applicant;
  jobTitle: string;
  profileHref: string;
  /**
   * Days waiting and its SLA verdict are computed by the screen, not here.
   *
   * They depend on `now`, and a row that read the clock itself could never be
   * memoized — every render would produce a new value. Primitives in, memo holds.
   */
  days: number;
  sla: SlaState;
  selected: boolean;
  /** True once anything is selected — pins every checkbox visible. */
  selectionActive: boolean;
  onToggleSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

const SLA_LABEL: Record<SlaState, string> = {
  ok: "Within the stage's usual time",
  over: "Longer than this stage should take",
  critical: "Well past this stage's usual time",
};

/**
 * One row of the applicants table (columns are laid out in dx.css, .ar-row).
 *
 * Column order is the order HR reads in: who, for what, where they are, how long
 * they have waited, how well they match. Everything left of the actions is one
 * click target to the profile, through the name link.
 */
function ApplicantRowInner({
  applicant, jobTitle, profileHref, days, sla, selected, selectionActive,
  onToggleSelect, onDelete,
}: ApplicantRowProps) {
  const score = applicant.aiAnalysis?.fitScore;
  const stage = APPLICANT_STATUSES.find((s) => s.value === applicant.status) ?? APPLICANT_STATUSES[0];
  const email = applicant.email?.trim();
  const name = applicant.fullName?.trim();

  const applied = new Date(applicant.appliedDate);
  const appliedLabel = Number.isNaN(applied.getTime())
    ? "date unknown"
    : applied.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className={`ar-row group${selected ? " is-selected" : ""}`}>
      {/* Avatar and checkbox share one slot, so selection costs no row width. */}
      <div className="ar-sel">
        <span
          className={`ar-avatar transition-opacity ${selectionActive || selected ? "opacity-0" : "opacity-100 group-hover:opacity-0"}`}
          aria-hidden="true"
        >
          {getInitials(name || "?")}
        </span>
        <span
          className={`absolute inset-0 flex items-center justify-center transition-opacity ${
            selectionActive || selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
          }`}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggleSelect(applicant.id)}
            aria-label={`Select ${name || "this candidate"}`}
            className="h-4 w-4"
          />
        </span>
      </div>

      <div className="ar-cell ar-who">
        {/* A real anchor: right-click "open in new tab" and Cmd-click work. */}
        <Link to={profileHref} className="ar-name">
          {/* fullName can legitimately be empty — a CV whose filename carried no
              name and which the AI has not backfilled. Never invent "Unknown". */}
          {name || <span className="italic text-muted-foreground">Name not captured</span>}
        </Link>
        {email ? (
          <span className="ar-sub" title={email}>{email}</span>
        ) : (
          <span
            className="ar-sub ar-warn"
            title="No email address was captured from the CV, so this candidate cannot be contacted"
          >
            <MailWarning className="h-3 w-3" aria-hidden="true" />
            No email on file
          </span>
        )}
      </div>

      <div className="ar-cell ar-role">
        <span className="ar-role__title" title={jobTitle}>{jobTitle}</span>
        <span className="ar-sub">Applied {appliedLabel}</span>
      </div>

      {/* Read-only on purpose: stage changes happen in the profile, or deliberately
          through multi-select and the bulk bar, never by a mis-click on a dense row. */}
      <div className="ar-cell">
        <span className="ar-stage" title={`Stage: ${stage.label} — change it from the candidate's profile`}>
          <i style={{ background: STATUS_COLORS[applicant.status] }} aria-hidden="true" />
          {stage.label}
        </span>
      </div>

      <div className="ar-cell">
        <span className={`ar-wait ar-wait--${sla}`} title={`${days} days in this stage. ${SLA_LABEL[sla]}.`}>
          <b>{days}</b> {days === 1 ? "day" : "days"}
        </span>
      </div>

      <div className="ar-cell ar-fit-cell">
        {/* One score element, its band carried by colour. Guarded on presence, not
            truthiness: a genuine score of 0 is a score. */}
        {score != null ? (
          <span className={`ar-fit ar-fit--${fitBand(score)}`} title={`AI fit score ${score} of 100`}>
            {score}
          </span>
        ) : (
          <span className="ar-fit ar-fit--none" title="Not scored yet — run AI analysis to rank this candidate">
            —
          </span>
        )}
      </div>

      <div className="ar-actions">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label={`Actions for ${name || "this candidate"}`} className="ar-icon-btn">
              <MoreVertical className="h-4 w-4" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem asChild>
              <Link to={profileHref}>Open profile</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(applicant.id)}
            >
              Delete candidate
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Link to={profileHref} aria-label={`Open ${name || "this candidate"}`} className="ar-icon-btn ar-open">
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

/**
 * Memoized: the roster mounts hundreds of these, each with a Radix dropdown root.
 * Without it, every keystroke in search re-renders all of them. Every prop above
 * is a primitive or a stable hoisted callback; pass an inline closure and this
 * does nothing.
 */
export default memo(ApplicantRowInner);
