import { memo, useMemo } from "react";
import { Link } from "react-router-dom";
import { Clock, Layers, ArrowRightLeft, GripVertical } from "lucide-react";
import type { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Applicant, ApplicantStatus } from "@/types/careers";
import { APPLICANT_STATUSES } from "@/types/careers";
import type { SlaState } from "@/lib/pipelineMetrics";
import { TONE_SOFT, TONE_TEXT, STATUS_COLORS, scoreTone } from "./statusColors";

interface PipelineCandidateCardProps {
  applicant: Applicant;
  jobTitle: string;
  /** This candidate's own page. A string, not a callback, so memo still holds. */
  profileHref: string;
  /**
   * Days in stage and its SLA verdict are computed by the board, not here.
   *
   * They depend on `now`, and a card that read the clock itself could never be
   * memoized — every re-render would produce a new value. Passing primitives
   * means the card only re-renders when the number actually changes.
   */
  days: number;
  sla: SlaState;
  /** Total distinct jobs this person has applied to (by email). Shows a badge when >= 2. */
  appliedJobsCount?: number;
  isDragging?: boolean;
  selected?: boolean;
  /** True once anything on the board is selected — pins every checkbox visible. */
  selectionActive?: boolean;
  /**
   * Drag-handle props go on the grip, never the card root.
   *
   * This is what makes selection safe: the keyboard drag sensor binds only to
   * the handle, so Space on the checkbox cannot start a lift. Moving these onto
   * the root would break that.
   */
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
  /** Callbacks take an id rather than closing over the applicant, so the board can hoist them and memo actually holds. */
  onOpen: (id: string) => void;
  onMoveToStage?: (id: string, status: ApplicantStatus) => void;
  onToggleSelect?: (id: string, mode: "toggle" | "range") => void;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

const SLA_TEXT: Record<SlaState, string> = {
  ok: "text-muted-foreground",
  over: TONE_TEXT.warning,
  critical: TONE_TEXT.danger,
};

const SLA_TITLE: Record<SlaState, string> = {
  ok: "",
  over: " — past this stage's target",
  critical: " — well past this stage's target",
};

function PipelineCandidateCard({
  applicant, jobTitle, profileHref, days, sla, appliedJobsCount, isDragging, selected, selectionActive,
  dragHandleProps, onOpen, onMoveToStage, onToggleSelect,
}: PipelineCandidateCardProps) {
  const multiApply = (appliedJobsCount ?? 1) >= 2;
  const initials = useMemo(() => getInitials(applicant.fullName), [applicant.fullName]);
  const score = applicant.aiAnalysis?.fitScore;
  const selectable = !!onToggleSelect;

  return (
    <div
      onClick={(e) => {
        // Cmd/Ctrl-click extends the selection instead of opening the profile —
        // plain click always opens, so selection never becomes a hidden mode.
        if (selectable && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          onToggleSelect(applicant.id, "toggle");
          return;
        }
        if (selectable && e.shiftKey) {
          e.preventDefault();
          onToggleSelect(applicant.id, "range");
          return;
        }
        onOpen(applicant.id);
      }}
      className={`group relative rounded-xl border p-2.5 cursor-pointer transition-[border-color,box-shadow,transform] duration-200 ${
        isDragging
          ? "bg-[hsl(var(--intel-card))] shadow-lg ring-2 ring-primary/40 border-primary/50"
          : selected
            ? "bg-[hsl(var(--intel-accent-subtle))] border-primary/50"
            : "bg-[hsl(var(--intel-card))] border-[hsl(var(--intel-border))] hover:border-primary/40 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start gap-1.5">
        <span
          {...(dragHandleProps ?? {})}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Drag ${applicant.fullName} to another stage`}
          title="Drag to move"
          className="-ml-1 mt-0.5 shrink-0 rounded-md p-0.5 text-muted-foreground/30 transition-colors cursor-grab active:cursor-grabbing group-hover:text-muted-foreground/70 hover:bg-[hsl(var(--intel-card-hover))] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <GripVertical className="w-3.5 h-3.5" aria-hidden="true" />
        </span>

        {/* Avatar and checkbox share one 28px slot: the checkbox takes over on
            hover or once a selection exists, so selecting costs no card width. */}
        <div className="relative w-7 h-7 shrink-0">
          <div
            className={`absolute inset-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold transition-opacity ${
              selectable && (selectionActive || selected) ? "opacity-0" : "opacity-100 group-hover:opacity-0"
            }`}
            aria-hidden="true"
          >
            {initials}
          </div>
          {selectable && (
            <div
              className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                selectionActive || selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
              }`}
            >
              <Checkbox
                checked={!!selected}
                onCheckedChange={() => onToggleSelect(applicant.id, "toggle")}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Select ${applicant.fullName}`}
                className="h-4 w-4"
              />
            </div>
          )}
        </div>

        {/* A real <a href>, not a span: right-click "Open in new tab", ⌘-click and
            middle-click all work, so a hiring manager can fan several candidates
            out into tabs instead of visiting them one at a time.
            `draggable={false}` stops the browser's native anchor drag from
            competing with the card's drag handle.
            Wraps to two lines rather than truncating — a truncated name loses the
            surname, which is the half that identifies someone. `break-words`
            covers the single-token case ("Trochinskaiadaria") that no amount of
            wrapping otherwise helps. */}
        <Link
          to={profileHref}
          draggable={false}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 min-w-0 text-[13px] font-semibold leading-tight line-clamp-2 break-words rounded-sm group-hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {applicant.fullName}
        </Link>

        {/* One element for the score, not two. The old chip-plus-band-badge pair
            said the same thing twice; the colour carries the band now. */}
        {score != null ? (
          <span
            className={`shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums ${TONE_SOFT[scoreTone(score, { strongAsAccent: true })]}`}
            title={`AI fit score ${score} of 100`}
          >
            {score}
          </span>
        ) : (
          <span
            className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
            title="No AI analysis yet"
          >
            —
          </span>
        )}
      </div>

      {/* The role gets a full-width row of its own rather than sharing the name's
          column. Squeezed between the avatar and the score it had ~94px, which
          truncated "Customer Success Manager" and most other real titles; across
          the whole card it has twice that. */}
      <p className="mt-1.5 truncate text-[11px] text-muted-foreground" title={jobTitle}>{jobTitle}</p>

      <div className="flex items-center gap-2 mt-1.5">
        {/* Tinted against this stage's own SLA. A flat 30-day rule was both too
            slow for Interview (target 5 days) and meaningless in New. */}
        <span
          className={`flex items-center gap-1 font-mono text-[11px] tabular-nums ${SLA_TEXT[sla]}`}
          title={`${days} day${days === 1 ? "" : "s"} in this stage${SLA_TITLE[sla]}`}
        >
          <Clock className="w-3 h-3" aria-hidden="true" />
          {days}d
        </span>

        {multiApply && (
          <span
            className="flex shrink-0 items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary"
            title={`Applied to ${appliedJobsCount} roles`}
          >
            <Layers className="w-2.5 h-2.5" aria-hidden="true" />
            {appliedJobsCount}
          </span>
        )}

        {onMoveToStage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                aria-label={`Move ${applicant.fullName} to another stage`}
                title="Move to stage"
                className="ml-auto shrink-0 rounded-md p-1 -my-1 text-muted-foreground/40 transition-colors hover:bg-primary/10 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Move to stage
              </DropdownMenuLabel>
              {APPLICANT_STATUSES.filter((s) => s.value !== applicant.status).map((s) => (
                <DropdownMenuItem
                  key={s.value}
                  className="gap-2 text-xs cursor-pointer"
                  onClick={() => onMoveToStage(applicant.id, s.value)}
                >
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: STATUS_COLORS[s.value] }}
                    aria-hidden="true"
                  />
                  {s.label}
                  {(s.value === "hired" || s.value === "rejected") && (
                    <span className="ml-auto text-[10px] text-muted-foreground">confirm</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

/**
 * Memoized because the New column mounts hundreds of these, each with a Radix
 * dropdown root. Without it any board state change — a keystroke in search, a
 * selection, a window growing — re-renders every card. That is why every prop
 * above is a primitive or a stable hoisted callback.
 */
export default memo(PipelineCandidateCard);
