import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Brain, GitCompareArrows, Loader2, CheckCircle2, XCircle, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Applicant, Job } from "@/types/careers";
import { TONE_TEXT, TONE_SOFT, TONE_SUBTLE } from "@/components/careers/statusColors";

interface BulkComparisonProps {
  applicants: Applicant[];
  job: Job | undefined;
}

const BulkComparison = ({ applicants, job }: BulkComparisonProps) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [comparing, setComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<any | null>(null);

  const withAI = useMemo(() => applicants.filter(a => a.aiAnalysis), [applicants]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 5) next.add(id);
      else toast.error("Maximum 5 candidates for comparison");
      return next;
    });
  };

  const selectedApplicants = useMemo(
    () => applicants.filter(a => selected.has(a.id)),
    [applicants, selected]
  );

  const runComparison = useCallback(async () => {
    if (selectedApplicants.length < 2) { toast.error("Select at least 2 candidates"); return; }
    setComparing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-cv", {
        body: {
          bulkCompare: true,
          candidates: selectedApplicants.map(a => ({
            name: a.fullName,
            score: a.aiAnalysis?.fitScore,
            strengths: a.aiAnalysis?.strengths,
            gaps: a.aiAnalysis?.gaps,
            skills: a.aiAnalysis?.detectedSkills,
            missingSkills: a.aiAnalysis?.missingSkills,
            experience: a.aiAnalysis?.experienceVerification,
            recommendation: a.aiAnalysis?.recommendation,
          })),
          jobTitle: job?.title,
          jobRequirements: job?.requirements,
        },
      });
      if (error) throw error;
      setComparisonResult(data);
      toast.success("Comparison complete");
    } catch {
      // Fall back to local comparison
      setComparisonResult({ local: true });
      toast.success("Comparison generated from existing AI data");
    } finally {
      setComparing(false);
    }
  }, [selectedApplicants, job]);

  // Build comparison matrix from local AI data
  const matrix = useMemo(() => {
    if (selectedApplicants.length < 2) return null;
    const dimensions = ["AI Score", "Skills Match", "Experience", "Education", "Career Stability"];
    return dimensions.map(dim => ({
      dimension: dim,
      values: selectedApplicants.map(a => {
        const ai = a.aiAnalysis;
        if (!ai) return { value: "—", score: 0 };
        switch (dim) {
          case "AI Score": return { value: `${ai.fitScore}/100`, score: ai.fitScore };
          case "Skills Match": return { value: `${ai.skillsCoveragePercent || 0}%`, score: ai.skillsCoveragePercent || 0 };
          case "Experience": return { value: ai.experienceVerification?.totalYears || "—", score: parseInt(ai.experienceVerification?.totalYears || "0") * 10 };
          case "Education": return { value: `${ai.scoreBreakdown?.educationRelevance || 0}%`, score: ai.scoreBreakdown?.educationRelevance || 0 };
          case "Career Stability": return { value: `${ai.scoreBreakdown?.careerStability || 0}%`, score: ai.scoreBreakdown?.careerStability || 0 };
          default: return { value: "—", score: 0 };
        }
      }),
    }));
  }, [selectedApplicants]);

  return (
    <div className="space-y-4">
      {/* Selection */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${TONE_SUBTLE.ai}`}>
                  <GitCompareArrows className={`w-4 h-4 ${TONE_TEXT.ai}`} aria-hidden="true" />
                </div>
                Bulk AI Comparison
              </CardTitle>
              <CardDescription className="ml-[42px]">
                Select 2-5 candidates to compare side-by-side · {selected.size} selected
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={runComparison}
              disabled={comparing || selected.size < 2}
              className="bg-gradient-to-r from-[hsl(var(--chart-3))] to-primary text-xs h-9"
            >
              {comparing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" aria-hidden="true" /> : <Brain className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />}
              Compare
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[250px]">
            <div className="space-y-1.5">
              {withAI.map(a => (
                <label
                  key={a.id}
                  className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${
                    selected.has(a.id) ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/20 border border-transparent"
                  }`}
                >
                  <Checkbox
                    checked={selected.has(a.id)}
                    onCheckedChange={() => toggleSelect(a.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{a.fullName}</p>
                    <p className="text-[10px] text-muted-foreground">{a.aiAnalysis?.fitLevel} · {a.aiAnalysis?.recommendation}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Brain className="w-3 h-3 text-primary" />
                    <span className="text-xs font-bold text-primary">{a.aiAnalysis?.fitScore}</span>
                  </div>
                </label>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Comparison Matrix */}
      {matrix && selectedApplicants.length >= 2 && (
        <Card className="border-border/50 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Comparison Matrix</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="p-2 text-left text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Dimension</th>
                    {selectedApplicants.map(a => (
                      <th key={a.id} className="p-2 text-center min-w-[120px]">
                        <p className="font-semibold text-xs truncate">{a.fullName}</p>
                        <p className="text-[9px] text-muted-foreground">Score: {a.aiAnalysis?.fitScore}</p>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((row, ri) => {
                    const maxScore = Math.max(...row.values.map(v => v.score));
                    return (
                      <tr key={row.dimension} className="border-b border-border/20">
                        <td className="p-2 font-medium">{row.dimension}</td>
                        {row.values.map((v, vi) => (
                          <td key={vi} className="p-2 text-center">
                            <span className={`font-semibold ${v.score === maxScore && maxScore > 0 ? TONE_TEXT.success : ""}`}>
                              {v.value}
                            </span>
                            {v.score === maxScore && maxScore > 0 && (
                              <CheckCircle2 className={`w-3 h-3 inline ml-1 ${TONE_TEXT.success}`} aria-hidden="true" />
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  {/* Strengths row */}
                  <tr className="border-b border-border/20">
                    <td className="p-2 font-medium">Top Strengths</td>
                    {selectedApplicants.map(a => (
                      <td key={a.id} className="p-2">
                        <div className="space-y-0.5">
                          {(a.aiAnalysis?.strengths || []).slice(0, 3).map((s, i) => (
                            <p key={i} className="text-[10px] text-muted-foreground truncate">✓ {s}</p>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>
                  {/* Gaps row */}
                  <tr>
                    <td className="p-2 font-medium">Key Gaps</td>
                    {selectedApplicants.map(a => (
                      <td key={a.id} className="p-2">
                        <div className="space-y-0.5">
                          {(a.aiAnalysis?.gaps || []).slice(0, 3).map((g, i) => (
                            <p key={i} className="text-[10px] text-destructive/80 truncate">✕ {g}</p>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Recommendation strip */}
            <div className="flex gap-3 mt-4 pt-3 border-t border-border/30">
              {selectedApplicants.map(a => (
                <div key={a.id} className="flex-1 text-center p-2 rounded-lg bg-muted/20">
                  <p className="text-[10px] font-medium truncate">{a.fullName}</p>
                  <Badge variant="secondary" className={`text-[9px] mt-1 border-0 ${
                    a.aiAnalysis?.recommendation === "Fast-Track to Interview" ? TONE_SOFT.success :
                    a.aiAnalysis?.recommendation === "Not Recommended" ? "bg-destructive/10 text-destructive" :
                    "bg-primary/10 text-primary"
                  }`}>
                    {a.aiAnalysis?.recommendation || "—"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BulkComparison;
