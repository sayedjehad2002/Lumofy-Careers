import { useState } from "react";
import { RefreshCw, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Applicant, Job, AIAnalysis } from "@/types/careers";
import { supabase } from "@/integrations/supabase/client";
import CandidateAnalysis, { type CVAIAnalysis } from "@/components/careers/cvlibrary/CandidateAnalysis";

interface AIAnalysisPanelProps {
  applicant: Applicant;
  job: Job | undefined;
  sessionToken: string | null;
  onAnalysisComplete: (applicantId: string, analysis: AIAnalysis) => void;
  onExplainRating?: () => void;
}

// Applicant AI analysis now renders through the SAME recruiter-grade design as the
// CV Library (CandidateAnalysis) so the two views are visually identical. The
// applicant-only extras (weighted score breakdown, ranking tier, predictive
// probabilities, red flags, CV-parsing status) are carried by the optional fields
// on CVAIAnalysis and rendered inside that component. This panel only owns the
// run/re-run + explain controls and the analyze-cv call.
const AIAnalysisPanel = ({ applicant, job, sessionToken, onAnalysisComplete, onExplainRating }: AIAnalysisPanelProps) => {
  const [loading, setLoading] = useState(false);

  const runAnalysis = async () => {
    if (!job) { toast.error("Job not found"); return; }
    if (!sessionToken) { toast.error("Not authenticated"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-cv", {
        body: {
          cvStoragePath: applicant.cvStoragePath,
          cvFileName: applicant.cvFileName,
          candidateName: applicant.fullName,
          jobTitle: job.title,
          jobDescription: job.description,
          responsibilities: job.responsibilities,
          requirements: job.requirements,
          screeningAnswers: applicant.screeningAnswers,
          sessionToken,
          aiScoringWeights: job.aiScoringWeights,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const analysis: AIAnalysis = { ...data.analysis, analyzedAt: data.analyzedAt };
      onAnalysisComplete(applicant.id, analysis);
      toast.success("AI analysis complete");
    } catch (e: any) {
      import.meta.env.DEV && console.error(e);
      toast.error(e.message || "AI analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const a = applicant.aiAnalysis;

  return (
    <div className="space-y-4">
      {/* Controls — only when an analysis exists (the empty state has its own Run button) */}
      {a && !loading && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {onExplainRating && (
            <Button size="sm" variant="outline" onClick={onExplainRating} className="border-primary/30 text-primary">
              <Sparkles className="mr-1 h-3.5 w-3.5" /> Explain
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={runAnalysis} disabled={loading}>
            <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Re-run
          </Button>
        </div>
      )}

      {!applicant.cvStoragePath && !a && !loading && (
        <div className="flex items-center gap-2 rounded-xl bg-secondary/50 p-3 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>No CV file uploaded. AI analysis will be limited to screening answers only.</span>
        </div>
      )}

      <CandidateAnalysis
        ai={(a ?? null) as CVAIAnalysis | null}
        analyzing={loading}
        onRun={runAnalysis}
        disabled={!sessionToken}
      />
    </div>
  );
};

export default AIAnalysisPanel;
