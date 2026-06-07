import { useState } from "react";
import {
  Brain, RefreshCw, Target, TrendingUp, AlertTriangle, HelpCircle, Shield, Info,
  CheckCircle, XCircle, MinusCircle, Briefcase, Award, BarChart3, Quote, Zap, AlertCircle, Sparkles,
  ShieldAlert, Gauge, GraduationCap, Wrench, Building2, HeartPulse
} from "lucide-react";
import WhyThisScore from "@/components/careers/WhyThisScore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import type { Applicant, Job, AIAnalysis } from "@/types/careers";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TONE_SOFT, TONE_TEXT, TONE_BG, TONE_BORDER } from "./statusColors";
// TONE_TEXT.ai resolves to the chart-3 (violet) token.

interface AIAnalysisPanelProps {
  applicant: Applicant;
  job: Job | undefined;
  sessionToken: string | null;
  onAnalysisComplete: (applicantId: string, analysis: AIAnalysis) => void;
  onExplainRating?: () => void;
}

const TIER_STYLES: Record<string, string> = {
  "Top Match": `${TONE_SOFT.success} shadow-[0_0_8px_hsl(var(--intel-success)/0.2)]`,
  "Strong Match": "bg-primary/15 text-primary",
  "Moderate Match": "bg-muted text-muted-foreground",
  "Weak Match": "bg-destructive/10 text-destructive",
};

const SCORE_DIMENSIONS = [
  { key: "skillsMatch" as const, label: "Skills Match", icon: Target, tooltip: "How well the candidate's skills match job requirements (weighted)" },
  { key: "toolsMatch" as const, label: "Tools & Technologies", icon: Wrench, tooltip: "Coverage of required tools, frameworks, and technologies" },
  { key: "relevantExperience" as const, label: "Relevant Experience", icon: Briefcase, tooltip: "Years and quality of relevant work experience" },
  { key: "industryAlignment" as const, label: "Industry Alignment", icon: Building2, tooltip: "Relevance of past industries to the target role" },
  { key: "educationRelevance" as const, label: "Education Relevance", icon: GraduationCap, tooltip: "How well education background aligns with requirements" },
  { key: "careerStability" as const, label: "Career Stability", icon: HeartPulse, tooltip: "Consistency of career progression and tenure patterns" },
];

function AnimatedScore({ value, delay = 0 }: { value: number; delay?: number }) {
  return (
    <motion.span
      className="text-sm font-bold tabular-nums"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
    >
      {value}%
    </motion.span>
  );
}

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

      const analysis: AIAnalysis = {
        ...data.analysis,
        analyzedAt: data.analyzedAt,
      };
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

  const fitColor = a?.fitLevel === "Strong Fit"
    ? TONE_TEXT.success
    : a?.fitLevel === "Moderate Fit"
    ? TONE_TEXT.warning
    : TONE_TEXT.danger;

  const fitBg = a?.fitLevel === "Strong Fit"
    ? "bg-[hsl(var(--intel-success)/0.15)]"
    : a?.fitLevel === "Moderate Fit"
    ? "bg-[hsl(var(--intel-warning)/0.15)]"
    : "bg-destructive/15";

  const recColor: Record<string, string> = {
    "Fast-Track to Interview": TONE_SOFT.success,
    "Proceed to Next Stage": "bg-[hsl(var(--chart-1)/0.15)] text-[hsl(var(--chart-1))]",
    "Hold for Review": TONE_SOFT.warning,
    "Not Recommended": "bg-destructive/15 text-destructive",
  };

  const evidenceIcon = (ev: string) => {
    if (ev === "Yes") return <CheckCircle className={`w-3.5 h-3.5 flex-shrink-0 ${TONE_TEXT.success}`} aria-hidden="true" />;
    if (ev === "Partial") return <MinusCircle className={`w-3.5 h-3.5 flex-shrink-0 ${TONE_TEXT.warning}`} aria-hidden="true" />;
    return <XCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" aria-hidden="true" />;
  };

  const getProgressColor = (val: number) => {
    if (val >= 80) return TONE_BG.success;
    if (val >= 60) return "bg-primary";
    if (val >= 40) return TONE_BG.warning;
    return "bg-destructive";
  };

  return (
    <TooltipProvider>
      <div className="space-y-5">
        {/* AI Intelligence Overview Card */}
        <motion.div
          className="rounded-xl bg-card border border-border p-6 space-y-5"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              AI Intelligence Overview
            </h2>
            <div className="flex items-center gap-2">
              {onExplainRating && (
                <Button size="sm" variant="outline" onClick={onExplainRating} className="text-primary border-primary/30">
                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                  Explain
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={runAnalysis} disabled={loading}>
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
                {a ? "Re-run" : "Run AI Analysis"}
              </Button>
            </div>
          </div>

          {!applicant.cvStoragePath && !a && (
            <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-3 text-sm text-muted-foreground">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>No CV file uploaded. AI analysis will be limited to screening answers only.</span>
            </div>
          )}

          {!a && !loading && (
            <div className="text-center py-6 text-muted-foreground">
              <Brain className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No AI analysis yet. Click "Run AI Analysis" to generate.</p>
            </div>
          )}

          {loading && (
            <div className="text-center py-6">
              <RefreshCw className="w-8 h-8 mx-auto mb-2 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Analyzing candidate with weighted scoring model...</p>
            </div>
          )}

          {a && !loading && (
            <>
              {/* CV Parsing Status */}
              {a.cvParsingStatus && a.cvParsingStatus !== "success" && (
                <div className="flex items-center gap-2 bg-[hsl(var(--intel-warning)/0.1)] border border-[hsl(var(--intel-warning)/0.2)] rounded-lg p-3">
                  <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${TONE_TEXT.warning}`} aria-hidden="true" />
                  <p className={`text-sm ${TONE_TEXT.warning}`}>
                    {a.cvParsingStatus === "failed"
                      ? "CV could not be fully parsed. Manual HR review required."
                      : "CV was partially parsed. Some data may be incomplete."}
                  </p>
                </div>
              )}

              {/* Overall Score Hero */}
              <div className="rounded-xl bg-secondary/50 p-5 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                <div className="relative flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Overall Weighted Score</p>
                    <div className="flex items-baseline gap-2">
                      <motion.span
                        className="text-4xl font-bold text-primary"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                      >
                        {a.fitScore}
                      </motion.span>
                      <span className="text-lg text-muted-foreground">/100</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {a.rankingTier && (
                      <Badge className={`border-0 text-xs ${TIER_STYLES[a.rankingTier] || "bg-muted text-muted-foreground"}`}>
                        {a.rankingTier}
                      </Badge>
                    )}
                    <Badge className={`${fitBg} ${fitColor} border-0 text-xs`}>{a.fitLevel}</Badge>
                    <Badge variant="outline" className="text-[10px]">Confidence: {a.confidence}</Badge>
                  </div>
                </div>
                <Progress value={a.fitScore} className="h-2.5" />
              </div>

              {/* Why This Score — Radial Chart Explainer */}
              {a.scoreBreakdown && (
                <WhyThisScore
                  scoreBreakdown={a.scoreBreakdown}
                  fitScore={a.fitScore}
                  weights={job?.aiScoringWeights}
                />
              )}

              {/* AI Summary */}
              <div className="rounded-lg bg-secondary/30 p-4">
                <p className="text-sm text-muted-foreground italic">{a.summary}</p>
              </div>

              {/* Recommendation */}
              {a.recommendation && (
                <div className="rounded-lg bg-secondary/50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">AI Recommendation</span>
                  </div>
                  <Badge className={`${recColor[a.recommendation] || "bg-secondary text-foreground"} border-0 text-sm mb-2`}>
                    {a.recommendation}
                  </Badge>
                  {a.recommendationJustification && (
                    <p className="text-sm text-muted-foreground mt-2">{a.recommendationJustification}</p>
                  )}
                </div>
              )}

              {/* Red Flags / Risk Indicators */}
              {((a.redFlags && a.redFlags.length > 0) || (a.riskIndicators && a.riskIndicators.length > 0)) && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-destructive" aria-hidden="true" />
                    Risk Indicators
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(a.redFlags || []).map((flag, i) => (
                      <Badge key={`rf-${i}`} variant="secondary" className="text-xs bg-destructive/10 text-destructive border border-destructive/20">
                        {flag}
                      </Badge>
                    ))}
                    {(a.riskIndicators || []).filter(r => !(a.redFlags || []).includes(r)).map((r, i) => (
                      <Badge key={`ri-${i}`} variant="secondary" className={`text-xs ${TONE_SOFT.warning} border ${TONE_BORDER.warning}`}>
                        {r}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Predictive Metrics */}
              {(a.interviewSuccessProbability != null || a.offerAcceptanceProbability != null || a.earlyTurnoverRisk != null || a.growthPotentialScore != null) && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Predictive Insights
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: "Interview Success", value: a.interviewSuccessProbability, color: TONE_TEXT.success },
                      { label: "Offer Acceptance", value: a.offerAcceptanceProbability, color: "text-primary" },
                      { label: "Early Turnover Risk", value: a.earlyTurnoverRisk, color: TONE_TEXT.danger, invert: true },
                      { label: "Growth Potential", value: a.growthPotentialScore, color: TONE_TEXT.ai },
                    ].filter(m => m.value != null).map((m, i) => (
                      <div key={i} className="rounded-lg bg-secondary/30 p-3 text-center">
                        <p className="text-[10px] text-muted-foreground mb-1">{m.label}</p>
                        <p className={`text-lg font-bold ${m.color}`}>{m.value}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills Alignment */}
              {a.skillsAlignment && a.skillsAlignment.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-primary" /> Skills Alignment
                    {a.skillsCoveragePercent !== undefined && (
                      <Badge variant="outline" className="text-xs ml-auto">{a.skillsCoveragePercent}% Coverage</Badge>
                    )}
                  </h3>
                  <div className="space-y-1.5">
                    {a.skillsAlignment.map((s, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm bg-secondary/30 rounded-lg p-2.5">
                        {evidenceIcon(s.evidence)}
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">{s.requiredSkill}</span>
                          <p className="text-xs text-muted-foreground mt-0.5">{s.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience Verification */}
              {a.experienceVerification && (
                <div>
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-primary" /> Experience Verification
                  </h3>
                  <div className="bg-secondary/50 rounded-lg p-3 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Total Experience</span><span className="font-medium">{a.experienceVerification.totalYears}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Seniority Alignment</span><span className="font-medium">{a.experienceVerification.seniorityAlignment}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Industry Relevance</span><span className="font-medium">{a.experienceVerification.industryRelevance}</span></div>
                  </div>
                </div>
              )}

              {/* Detected & Missing Skills */}
              {((a.detectedSkills && a.detectedSkills.length > 0) || (a.missingSkills && a.missingSkills.length > 0)) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {a.detectedSkills && a.detectedSkills.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                        <CheckCircle className={`w-3.5 h-3.5 ${TONE_TEXT.success}`} aria-hidden="true" /> Detected Skills
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {a.detectedSkills.map((s, i) => (
                          <Badge key={i} variant="secondary" className={`text-xs border-0 ${TONE_SOFT.success}`}>{s}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {a.missingSkills && a.missingSkills.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5 text-destructive" aria-hidden="true" /> Missing Skills
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {a.missingSkills.map((s, i) => (
                          <Badge key={i} variant="secondary" className="text-xs bg-destructive/10 text-destructive border-0">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Strengths & Gaps */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                    <TrendingUp className={`w-3.5 h-3.5 ${TONE_TEXT.success}`} aria-hidden="true" /> Strengths
                  </h3>
                  <ul className="space-y-1">
                    {a.strengths.map((s, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className={`mt-0.5 ${TONE_TEXT.success}`}>✓</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                    <AlertTriangle className={`w-3.5 h-3.5 ${TONE_TEXT.warning}`} aria-hidden="true" /> Gaps
                  </h3>
                  <ul className="space-y-1">
                    {a.gaps.map((g, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className={`mt-0.5 ${TONE_TEXT.warning}`}>!</span> {g}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Organizational Fit & Growth */}
              {(a.organizationalFit || a.growthPotential) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {a.organizationalFit && (
                    <div>
                      <h3 className="text-sm font-medium mb-1 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-primary" /> Organizational Fit
                      </h3>
                      <p className="text-sm text-muted-foreground bg-secondary/50 rounded-lg p-3">{a.organizationalFit}</p>
                    </div>
                  )}
                  {a.growthPotential && (
                    <div>
                      <h3 className="text-sm font-medium mb-1 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-primary" /> Growth Potential
                      </h3>
                      <p className="text-sm text-muted-foreground bg-secondary/50 rounded-lg p-3">{a.growthPotential}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Evidence Citations */}
              {a.evidenceCitations && a.evidenceCitations.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                    <Quote className="w-3.5 h-3.5 text-primary" /> Evidence Citations
                  </h3>
                  <div className="space-y-1.5">
                    {a.evidenceCitations.map((c, i) => (
                      <div key={i} className="text-sm text-muted-foreground bg-secondary/30 rounded-lg p-2.5 border-l-2 border-primary/30 italic">{c}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Interview Questions */}
              <div>
                <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-primary" /> Interview Questions to Ask
                </h3>
                <ol className="space-y-1 list-decimal list-inside">
                  {a.interviewQuestions.map((q, i) => (
                    <li key={i} className="text-sm text-muted-foreground">{q}</li>
                  ))}
                </ol>
              </div>

              {/* Final Feedback */}
              <div>
                <h3 className="text-sm font-medium mb-1">Final AI Feedback</h3>
                <p className="text-sm text-muted-foreground bg-secondary/50 rounded-lg p-3">{a.feedback}</p>
              </div>

              {/* Timestamp + Disclaimer */}
              <div className="flex items-start gap-2 pt-2 border-t border-border">
                <Shield className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-muted-foreground">
                  AI rating is a support tool only. Final hiring decision remains with HR. Analyzed {new Date(a.analyzedAt).toLocaleString()}.
                </p>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </TooltipProvider>
  );
};

export default AIAnalysisPanel;
