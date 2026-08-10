import { memo } from "react";
import { Link } from "react-router-dom";
import { Clock, MoreVertical, ChevronRight, MailWarning } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { APPLICANT_STATUSES, type Applicant } from "@/types/careers";
import type { SlaState } from "@/lib/pipelineMetrics";
import { STATUS_SOFT, TONE_SOFT, TONE_TEXT, scoreTone } from "../statusColors";

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

const SLA_TEXT: Record<SlaState, string> = {
  ok: "text-muted-foreground",
  over: TONE_TEXT.warning,
  critical: TONE_TEXT.danger,
};

function ApplicantRowInner({
  applicant, jobTitle, profileHref, days, sla, selected, selectionActive,
  onToggleSelect, onDelete,
}: ApplicantRowProps) {
  const score = applicant.aiAnalysis?.fitScore;
  const stage = APPLICANT_STATUSES.find((s) => s.value === applicant.status) ?? APPLICANT_STATUSES[0];
  const noEmail = !applicant.email?.trim();
  const name = applicant.fullName?.trim();

  const applied = new Date(applicant.appliedDate);
  const appliedLabel = Number.isNaN(applied.getTime())
    ? "date unknown"
    : applied.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div
      className={`group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2 transition-colors ${
        selected ? "bg-[hsl(var(--intel-accent-subtle))]" : "hover:bg-[hsl(var(--intel-card-hover))]"
      }`}
    >
      {/* Avatar and checkbox share one 32px slot, so selection costs no row width. */}
      <div className="relative h-8 w-8 shrink-0">
        <div
          className={`absolute inset-0 flex items-center justify-center rounded-lg bg-primary/10 text-[10px] font-bold text-primary transition-opacity ${
            selectionActive || selected ? "opacity-0" : "opacity-100 group-hover:opacity-0"
          }`}
          aria-hidden="true"
        >
          {getInitials(name || "?")}
        </div>
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity ${
            selectionActive || selected
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
          }`}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggleSelect(applicant.id)}
            aria-label={`Select ${name || "this candidate"}`}
            className="h-4 w-4"
          />
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {/* A real anchor: right-click "open in new tab" and Cmd-click work. */}
          <Link
            to={profileHref}
            className="truncate text-sm font-semibold text-foreground transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {/* fullName can legitimately be empty — a CV whose filename carried no
                name and which the AI has not backfilled. Never invent "Unknown". */}
            {name || <span className="italic text-muted-foreground">Name not captured</span>}
          </Link>

          {/* Read-only on purpose.
              The stage is worth seeing at a glance in the list, but not worth
              changing from it: a mis-click on a dense row silently moved someone
              through the pipeline with no confirmation. Stage changes now happen
              where there is context to justify them — inside the candidate's
              profile — or deliberately, via multi-select and the bulk bar. */}
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_SOFT[applicant.status]}`}
            title={`Stage: ${stage.label} — change it from the candidate's profile`}
          >
            {stage.label}
          </span>

          {noEmail && (
            <span
              className={`flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${TONE_SOFT.warning}`}
              title="No email address was captured from the CV, so this candidate cannot be contacted"
            >
              <MailWarning className="h-2.5 w-2.5" aria-hidden="true" />
              No email
            </span>
          )}
        </div>

        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          <span className="text-foreground/70">{jobTitle}</span>
          {" · applied "}
          {appliedLabel}
          {" · "}
          <span className={SLA_TEXT[sla]}>
            <Clock className="mr-0.5 inline h-3 w-3 align-[-2px]" aria-hidden="true" />
            {days}d waiting
          </span>
        </p>
      </div>

      <div className="flex items-center gap-2">
        {/* One score element. It used to appear three times — the number, a tier
            badge, and a rank medal — all derived from fitScore by the same
            85/70/50 cuts. The colour now carries the band. */}
        {score != null ? (
          <span
            className={`rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums ${TONE_SOFT[scoreTone(score, { strongAsAccent: true })]}`}
            title={`AI fit score ${score} of 100`}
          >
            {score}
          </span>
        ) : (
          // Guarded on presence, not truthiness. The old row used `score != null`
          // for the pill and `!score` for "AI Pending", so a genuine score of 0
          // rendered as both at once.
          <span
            className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
            title="Not scored yet — run AI analysis to rank this candidate"
          >
            —
          </span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Actions for ${name || "this candidate"}`}
              className="rounded-md p-1.5 text-muted-foreground/60 transition-colors hover:bg-[hsl(var(--intel-card-hover))] hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
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

        <Link
          to={profileHref}
          aria-label={`Open ${name || "this candidate"}`}
          className="rounded-md text-muted-foreground/30 transition-colors group-hover:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

/**
 * Memoized: the roster mounts hundreds of these, each with two Radix dropdown
 * roots. Without it, every keystroke in search re-renders all of them — which is
 * why the old list felt sluggish to type in. Every prop above is a primitive or
 * a stable hoisted callback; pass an inline closure and this does nothing.
 */
export default memo(ApplicantRowInner);
