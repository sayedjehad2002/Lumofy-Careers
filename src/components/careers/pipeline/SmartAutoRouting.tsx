import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, ArrowRight, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { APPLICANT_STATUSES, STAGE_SLA_DAYS, type ApplicantStatus } from "@/types/careers";
import type { Applicant } from "@/types/careers";
import { toast } from "sonner";

interface SmartAutoRoutingProps {
  applicants: Applicant[];
  onStatusUpdate: (id: string, status: ApplicantStatus) => Promise<void>;
}

interface Suggestion {
  applicant: Applicant;
  currentStage: ApplicantStatus;
  suggestedStage: ApplicantStatus;
  reason: string;
  confidence: "high" | "medium";
}

function suggestNextStage(a: Applicant): Suggestion | null {
  const score = a.aiAnalysis?.fitScore;
  const days = a.stageEnteredAt ? Math.floor((Date.now() - new Date(a.stageEnteredAt).getTime()) / 86400000) : 0;
  const avgRating = a.rating
    ? (a.rating.communication + a.rating.roleFit + a.rating.technicalSkills + a.rating.cultureFit + a.rating.overallRecommendation) / 5
    : null;

  if (a.status === "new") {
    if (score != null && score >= 70) {
      return { applicant: a, currentStage: "new", suggestedStage: "shortlisted", reason: `AI score ${score}/100 — strong fit, skip to shortlist`, confidence: "high" };
    }
    if (score != null && score >= 40) {
      return { applicant: a, currentStage: "new", suggestedStage: "reviewing", reason: `AI score ${score}/100 — move to review`, confidence: "medium" };
    }
    if (score != null && score < 30) {
      return { applicant: a, currentStage: "new", suggestedStage: "rejected", reason: `AI score ${score}/100 — low fit, recommend rejection`, confidence: "medium" };
    }
  }

  if (a.status === "reviewing") {
    if (score != null && score >= 75 && days >= 2) {
      return { applicant: a, currentStage: "reviewing", suggestedStage: "shortlisted", reason: `Score ${score} + ${days}d in review — advance to shortlist`, confidence: "high" };
    }
    if (score != null && score < 40 && days >= 3) {
      return { applicant: a, currentStage: "reviewing", suggestedStage: "rejected", reason: `Low score (${score}) after ${days}d — recommend rejection`, confidence: "medium" };
    }
  }

  if (a.status === "shortlisted") {
    if (score != null && score >= 80 && avgRating && avgRating >= 3.5) {
      return { applicant: a, currentStage: "shortlisted", suggestedStage: "interview", reason: `Strong score (${score}) + rating (${avgRating.toFixed(1)}) — schedule interview`, confidence: "high" };
    }
    if (days >= 5 && score != null && score >= 60) {
      return { applicant: a, currentStage: "shortlisted", suggestedStage: "interview", reason: `${days}d stalled — move to interview to maintain velocity`, confidence: "medium" };
    }
  }

  if (a.status === "interview") {
    if (avgRating && avgRating >= 4.0 && score != null && score >= 80) {
      return { applicant: a, currentStage: "interview", suggestedStage: "hired", reason: `Excellent rating (${avgRating.toFixed(1)}) + score (${score}) — extend offer`, confidence: "high" };
    }
  }

  return null;
}

const SmartAutoRouting = ({ applicants, onStatusUpdate }: SmartAutoRoutingProps) => {
  const [accepting, setAccepting] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const suggestions = useMemo(() => {
    return applicants
      .map(suggestNextStage)
      .filter((s): s is Suggestion => s !== null && !dismissed.has(s.applicant.id));
  }, [applicants, dismissed]);

  const handleAccept = async (s: Suggestion) => {
    setAccepting(prev => new Set(prev).add(s.applicant.id));
    try {
      await onStatusUpdate(s.applicant.id, s.suggestedStage);
      const label = APPLICANT_STATUSES.find(st => st.value === s.suggestedStage)?.label;
      toast.success(`${s.applicant.fullName} moved to ${label}`);
    } catch {
      toast.error("Failed to update stage");
    } finally {
      setAccepting(prev => { const n = new Set(prev); n.delete(s.applicant.id); return n; });
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Smart Auto-Routing
          {suggestions.length > 0 && (
            <Badge variant="secondary" className="text-[9px] py-0 border-0 bg-primary/10 text-primary">{suggestions.length}</Badge>
          )}
        </CardTitle>
        <CardDescription className="text-xs">AI suggests optimal next stage based on score, rating & velocity</CardDescription>
      </CardHeader>
      <CardContent>
        {suggestions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">No routing suggestions right now</p>
          </div>
        ) : (
          <div className="space-y-2">
            {suggestions.map((s, i) => {
              const fromInfo = APPLICANT_STATUSES.find(st => st.value === s.currentStage);
              const toInfo = APPLICANT_STATUSES.find(st => st.value === s.suggestedStage);
              const initials = s.applicant.fullName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

              return (
                <motion.div
                  key={s.applicant.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="p-3 rounded-xl border border-border/30 bg-muted/10 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{s.applicant.fullName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="secondary" className={`text-[9px] py-0 border-0 ${fromInfo?.color}`}>{fromInfo?.label}</Badge>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <Badge variant="secondary" className={`text-[9px] py-0 border-0 ${toInfo?.color}`}>{toInfo?.label}</Badge>
                        <Badge variant="outline" className={`text-[8px] py-0 ml-1 ${s.confidence === "high" ? "border-emerald-500/30 text-emerald-400" : "border-yellow-500/30 text-yellow-400"}`}>
                          {s.confidence}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <Button
                        size="sm" className="h-7 text-[10px] rounded-lg px-3"
                        disabled={accepting.has(s.applicant.id)}
                        onClick={() => handleAccept(s)}
                      >
                        {accepting.has(s.applicant.id) ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-0.5" />}
                        Accept
                      </Button>
                      <Button
                        size="sm" variant="ghost" className="h-7 text-[10px] rounded-lg px-2 text-muted-foreground"
                        onClick={() => setDismissed(prev => new Set(prev).add(s.applicant.id))}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5 ml-11">{s.reason}</p>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SmartAutoRouting;
