import { useMemo } from "react";
import { Brain, Star, GripVertical, Clock, Layers, ArrowRightLeft } from "lucide-react";
import type { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Applicant, ApplicantStatus } from "@/types/careers";
import { APPLICANT_STATUSES } from "@/types/careers";
import { tierSoft, TONE_TEXT } from "./statusColors";

interface PipelineCandidateCardProps {
  applicant: Applicant;
  jobTitle: string;
  avgRating: string | null;
  /** Total distinct jobs this person has applied to (by email). Shows a badge when >= 2. */
  appliedJobsCount?: number;
  isDragging?: boolean;
  onClick?: () => void;
  /** react-beautiful-dnd drag-handle props — applied to the grip so dragging is
   * unambiguous (grab the grip to move, click the card to open). */
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
  /** Quick "Move to stage" menu — one click sends the candidate to ANY stage
   * without dragging across the board (New -> Hired in one action). Terminal
   * moves are confirmed by the caller, same as drag-and-drop. */
  onMoveToStage?: (status: ApplicantStatus) => void;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function getDaysInStage(stageEnteredAt?: string): number {
  if (!stageEnteredAt) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(stageEnteredAt).getTime()) / (1000 * 60 * 60 * 24)));
}

function getRankingTier(score: number): string {
  if (score >= 85) return "Top";
  if (score >= 70) return "Strong";
  if (score >= 50) return "Moderate";
  return "Weak";
}

export default function PipelineCandidateCard({
  applicant, jobTitle, avgRating, appliedJobsCount, isDragging, onClick, dragHandleProps, onMoveToStage,
}: PipelineCandidateCardProps) {
  const multiApply = (appliedJobsCount ?? 1) >= 2;
  const initials = useMemo(() => getInitials(applicant.fullName), [applicant.fullName]);
  const daysInStage = useMemo(() => getDaysInStage(applicant.stageEnteredAt), [applicant.stageEnteredAt]);
  // A month or more in one stage is worth noticing; the old per-stage SLA fired
  // on most of the board and became invisible through repetition.
  const isLongWait = daysInStage >= 30;
  const score = applicant.aiAnalysis?.fitScore;
  const tier = score != null ? getRankingTier(score) : null;

  return (
    <div
      onClick={onClick}
      className={`rounded-xl bg-[hsl(var(--intel-card))] border p-3 cursor-pointer transition-all duration-200 group relative overflow-hidden ${
        isDragging
          ? "shadow-2xl ring-2 ring-primary/50 border-primary/60 rotate-[1deg]"
          : "border-[hsl(var(--intel-border))] hover:border-primary/30 hover:shadow-md"
      }`}
    >
      {/* Subtle top gradient for scored candidates */}
      {score != null && score >= 80 && (
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
      )}

      {/* Header: a dedicated drag HANDLE (grip) makes dragging unambiguous — grab the
          grip to move, click the card (or the name) to open. The name is a real button
          for keyboard-accessible open without stealing Space from the drag sensor. */}
      <div className="flex items-start gap-2">
        <span
          {...(dragHandleProps ?? {})}
          onClick={(e) => e.stopPropagation()}
          aria-label="Drag to move between stages"
          title="Drag to move"
          className="-ml-1 mt-0.5 flex-shrink-0 rounded-md p-1 text-muted-foreground/40 transition-colors cursor-grab active:cursor-grabbing hover:bg-[hsl(var(--intel-card-hover))] hover:text-muted-foreground/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <GripVertical className="w-4 h-4" aria-hidden="true" />
        </span>
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0">
          {initials}
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClick?.(); }}
          className="flex-1 min-w-0 text-left rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Open ${applicant.fullName}'s profile`}
        >
          <p className="text-sm font-semibold truncate leading-tight group-hover:text-primary transition-colors">{applicant.fullName}</p>
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{jobTitle}</p>
        </button>
        {multiApply && (
          <span
            className="flex flex-shrink-0 items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold text-primary"
            title={`Applied to ${appliedJobsCount} roles`}
            aria-label={`Applied to ${appliedJobsCount} roles`}
          >
            <Layers className="w-2.5 h-2.5" aria-hidden="true" />
            {appliedJobsCount}
          </span>
        )}
      </div>

      {/* Score + Tier row */}
      <div className="flex items-center gap-1.5 mt-2.5 ml-[42px]">
        {score != null ? (
          <>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/10">
              <Brain className="w-3 h-3 text-primary" aria-hidden="true" />
              <span className="font-mono text-[10px] font-bold tabular-nums text-primary">{score}</span>
            </div>
            {tier && (
              <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 h-[16px] border-0 ${tierSoft(tier)}`}>
                {tier}
              </Badge>
            )}
          </>
        ) : (
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-[16px] bg-muted text-muted-foreground border-0">
            AI Pending
          </Badge>
        )}
      </div>

      {/* Bottom meta row */}
      <div className="flex items-center gap-2 mt-2 ml-[42px]">
        {/* Waiting time only. The red "SLA" flag fired on most cards, so every
            column looked like it was on fire and the badge stopped meaning
            anything; a long wait now just tints the number. */}
        <span
          className={`flex items-center gap-0.5 font-mono text-[10px] tabular-nums ${isLongWait ? TONE_TEXT.warning : "text-muted-foreground"}`}
          title={`${daysInStage} day${daysInStage === 1 ? "" : "s"} in this stage`}>
          <Clock className="w-2.5 h-2.5" aria-hidden="true" />
          {daysInStage}d
        </span>
        {avgRating && (
          <span className={`flex items-center gap-0.5 text-[10px] ${TONE_TEXT.warning}`}>
            <Star className="w-2.5 h-2.5 fill-current" aria-hidden="true" />
            {avgRating}
          </span>
        )}

        {/* Quick move: jump to ANY stage in one click — no dragging across six
            columns. Hidden on the drag clone (no handler there). */}
        {onMoveToStage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                aria-label={`Move ${applicant.fullName} to another stage`}
                title="Move to stage"
                className="ml-auto flex-shrink-0 rounded-md p-1.5 -my-1 text-muted-foreground/50 transition-colors hover:bg-primary/10 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  onClick={() => onMoveToStage(s.value as ApplicantStatus)}
                >
                  <span className={`h-2 w-2 rounded-full flex-shrink-0 ${s.color.split(" ")[0]}`} aria-hidden="true" />
                  {s.label}
                  {(s.value === "hired" || s.value === "rejected") && (
                    <span className="ml-auto text-[9px] text-muted-foreground">confirm</span>
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
