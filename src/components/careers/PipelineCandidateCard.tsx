import { useMemo } from "react";
import { Brain, Star, GripVertical, AlertTriangle, Clock, Sparkles, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Applicant } from "@/types/careers";
import { STAGE_SLA_DAYS } from "@/types/careers";

interface PipelineCandidateCardProps {
  applicant: Applicant;
  jobTitle: string;
  avgRating: string | null;
  isDragging?: boolean;
  onClick?: () => void;
  onOpenCopilot?: () => void;
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

const TIER_COLORS: Record<string, string> = {
  Top: "bg-emerald-500/15 text-emerald-400",
  Strong: "bg-primary/15 text-primary",
  Moderate: "bg-yellow-500/15 text-yellow-400",
  Weak: "bg-destructive/10 text-destructive",
};

export default function PipelineCandidateCard({
  applicant, jobTitle, avgRating, isDragging, onClick, onOpenCopilot,
}: PipelineCandidateCardProps) {
  const initials = useMemo(() => getInitials(applicant.fullName), [applicant.fullName]);
  const daysInStage = useMemo(() => getDaysInStage(applicant.stageEnteredAt), [applicant.stageEnteredAt]);
  const sla = STAGE_SLA_DAYS[applicant.status];
  const isOverdue = sla !== undefined && daysInStage > sla;
  const score = applicant.aiAnalysis?.fitScore;
  const tier = score != null ? getRankingTier(score) : null;

  return (
    <div
      className={`rounded-xl bg-card border p-3 cursor-grab active:cursor-grabbing transition-all duration-200 group relative overflow-hidden ${
        isDragging
          ? "shadow-xl ring-2 ring-primary/40 border-primary/50 scale-[1.02]"
          : isOverdue
          ? "border-destructive/40 hover:border-destructive/60"
          : "border-border hover:border-primary/30 hover:shadow-md"
      }`}
      onClick={onClick}
    >
      {/* Subtle top gradient for scored candidates */}
      {score != null && score >= 80 && (
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
      )}

      {/* Header: Grip + Avatar + Name + Score */}
      <div className="flex items-start gap-2">
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 mt-1 flex-shrink-0 transition-colors" />
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate leading-tight">{applicant.fullName}</p>
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{jobTitle}</p>
        </div>
      </div>

      {/* Score + Tier row */}
      <div className="flex items-center gap-1.5 mt-2.5 ml-[42px]">
        {score != null ? (
          <>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/10">
              <Brain className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-bold text-primary">{score}</span>
            </div>
            {tier && (
              <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 h-[16px] border-0 ${TIER_COLORS[tier]}`}>
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
        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
          <Clock className="w-2.5 h-2.5" />
          {daysInStage}d
        </span>
        {isOverdue && (
          <span className="flex items-center gap-0.5 text-[10px] text-destructive font-semibold">
            <AlertTriangle className="w-2.5 h-2.5" />
            SLA
          </span>
        )}
        {avgRating && (
          <span className="flex items-center gap-0.5 text-[10px] text-yellow-400">
            <Star className="w-2.5 h-2.5 fill-yellow-400" />
            {avgRating}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          {onOpenCopilot && (
            <button
              className="flex items-center gap-0.5 text-[10px] text-primary hover:text-primary/80 transition-colors opacity-0 group-hover:opacity-100"
              onClick={(e) => { e.stopPropagation(); onOpenCopilot(); }}
              title="AI Reasoning"
            >
              <Sparkles className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
