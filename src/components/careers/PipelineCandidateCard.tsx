import { useMemo } from "react";
import { Brain, Star, GripVertical, AlertTriangle, Clock, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Applicant } from "@/types/careers";
import { STAGE_SLA_DAYS } from "@/types/careers";
import { tierSoft, TONE_TEXT } from "./statusColors";

interface PipelineCandidateCardProps {
  applicant: Applicant;
  jobTitle: string;
  avgRating: string | null;
  /** Total distinct jobs this person has applied to (by email). Shows a badge when >= 2. */
  appliedJobsCount?: number;
  isDragging?: boolean;
  onClick?: () => void;
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
  applicant, jobTitle, avgRating, appliedJobsCount, isDragging, onClick,
}: PipelineCandidateCardProps) {
  const multiApply = (appliedJobsCount ?? 1) >= 2;
  const initials = useMemo(() => getInitials(applicant.fullName), [applicant.fullName]);
  const daysInStage = useMemo(() => getDaysInStage(applicant.stageEnteredAt), [applicant.stageEnteredAt]);
  const sla = STAGE_SLA_DAYS[applicant.status];
  const isOverdue = sla !== undefined && daysInStage > sla;
  const score = applicant.aiAnalysis?.fitScore;
  const tier = score != null ? getRankingTier(score) : null;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Open ${applicant.fullName}'s profile`}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && onClick) { e.preventDefault(); onClick(); }
      }}
      className={`rounded-xl bg-[hsl(var(--intel-card))] border p-3 cursor-pointer transition-all duration-200 group relative overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        isDragging
          ? "shadow-xl ring-2 ring-primary/40 border-primary/50 scale-[1.02] cursor-grabbing"
          : isOverdue
          ? "border-destructive/40 hover:border-destructive/60"
          : "border-[hsl(var(--intel-border))] hover:border-primary/30 hover:shadow-md"
      }`}
    >
      {/* Subtle top gradient for scored candidates */}
      {score != null && score >= 80 && (
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
      )}

      {/* Header: Grip + Avatar + Name + Score. The whole card is the click target
          (open profile) and the drag handle (the wrapper in Dashboard.tsx carries
          react-beautiful-dnd's handle); a tap opens, a drag moves. */}
      <div className="flex items-start gap-2">
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 mt-1 flex-shrink-0 transition-colors" aria-hidden="true" />
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate leading-tight group-hover:text-primary transition-colors">{applicant.fullName}</p>
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{jobTitle}</p>
        </div>
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
        <span className="flex items-center gap-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
          <Clock className="w-2.5 h-2.5" aria-hidden="true" />
          {daysInStage}d
        </span>
        {isOverdue && (
          <span className="flex items-center gap-0.5 text-[10px] text-destructive font-semibold">
            <AlertTriangle className="w-2.5 h-2.5" aria-hidden="true" />
            SLA
          </span>
        )}
        {avgRating && (
          <span className={`flex items-center gap-0.5 text-[10px] ${TONE_TEXT.warning}`}>
            <Star className="w-2.5 h-2.5 fill-current" aria-hidden="true" />
            {avgRating}
          </span>
        )}
      </div>
    </div>
  );
}
