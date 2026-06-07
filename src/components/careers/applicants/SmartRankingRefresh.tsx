import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowUp, ArrowDown, Minus, Loader2, Zap, Briefcase,
  Crown, Medal, ChevronDown, ChevronUp, Sparkles, Target, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { Applicant, Job } from "@/types/careers";
import { TONE_TEXT, TONE_BG, TONE_SOFT, TONE_SUBTLE, TONE_BORDER } from "@/components/careers/statusColors";

interface SmartRankingRefreshProps {
  applicants: Applicant[];
  jobs: Job[];
  job: Job | undefined;
}

interface RankChange {
  id: string;
  name: string;
  oldScore: number;
  newScore: number;
  change: number;
  tier: string;
  reasoning: string;
  breakdown: { label: string; score: number; weight: number }[];
  warnings: string[];
}

function getTier(score: number): string {
  if (score >= 85) return "Top Match";
  if (score >= 70) return "Strong Match";
  if (score >= 50) return "Moderate Match";
  return "Weak Match";
}

const TIER_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  "Top Match": { bg: TONE_SUBTLE.success, text: TONE_TEXT.success, border: TONE_BORDER.success },
  "Strong Match": { bg: "bg-primary/10", text: "text-primary", border: "border-primary/30" },
  "Moderate Match": { bg: TONE_SUBTLE.warning, text: TONE_TEXT.warning, border: TONE_BORDER.warning },
  "Weak Match": { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/30" },
};

/**
 * Deeply re-scores a candidate against a TARGET job using their AI analysis data.
 * Key insight: if a candidate was originally analyzed for a DIFFERENT job,
 * their skills/experience must be re-evaluated in context of the new role.
 */
function reScoreForJob(
  applicant: Applicant,
  targetJob: Job,
): { score: number; breakdown: { label: string; score: number; weight: number }[]; reasoning: string; warnings: string[] } {
  const analysis = applicant.aiAnalysis;
  if (!analysis) return { score: 0, breakdown: [], reasoning: "No AI analysis available", warnings: [] };

  const weights = targetJob.aiScoringWeights || { skills: 35, tools: 25, experience: 20, industry: 10, education: 5, stability: 5 };
  const warnings: string[] = [];

  // Was this candidate originally analyzed for a DIFFERENT job?
  const wasAnalyzedForDifferentJob = applicant.jobId !== targetJob.id;

  // Gather all target job context
  const targetReqs = (targetJob.requirements || []).map(r => r.toLowerCase());
  const targetResps = (targetJob.responsibilities || []).map(r => r.toLowerCase());
  const targetDesc = targetJob.description?.toLowerCase() || "";
  const targetTitle = targetJob.title?.toLowerCase() || "";
  const targetDept = targetJob.department?.toLowerCase() || "";
  const allTargetText = [targetTitle, targetDept, targetDesc, ...targetReqs, ...targetResps].join(" ");

  // Candidate data
  const detectedSkills = (analysis.detectedSkills || []).map(s => s.toLowerCase());
  const summary = (analysis.summary || "").toLowerCase();
  const orgFit = (analysis.organizationalFit || "").toLowerCase();
  const skillsAlignment = analysis.skillsAlignment || [];

  // ═══ 1. SKILLS MATCH (against TARGET job requirements) ═══
  // Check each target requirement against candidate's detected skills + summary
  let skillHits = 0;
  const skillDetails: string[] = [];
  for (const req of targetReqs) {
    const reqWords = req.split(/\s+/).filter(w => w.length > 3);
    const matched = detectedSkills.some(sk =>
      reqWords.some(w => sk.includes(w) || w.includes(sk))
    ) || reqWords.some(w => summary.includes(w));

    if (matched) {
      skillHits++;
    } else {
      skillDetails.push(req.slice(0, 60));
    }
  }

  // Also check skillsAlignment evidence - but ONLY if it was for the same job
  let alignmentBonus = 0;
  if (!wasAnalyzedForDifferentJob && skillsAlignment.length > 0) {
    const yesCount = skillsAlignment.filter(s => s.evidence === "Yes").length;
    alignmentBonus = Math.round((yesCount / skillsAlignment.length) * 20);
  }

  let skillsScore: number;
  if (targetReqs.length > 0) {
    skillsScore = Math.min(100, Math.round((skillHits / targetReqs.length) * 80) + alignmentBonus);
  } else {
    skillsScore = wasAnalyzedForDifferentJob ? 40 : (analysis.scoreBreakdown?.skillsMatch ?? 50);
  }

  if (skillDetails.length > 0 && skillDetails.length >= targetReqs.length * 0.5) {
    warnings.push(`Missing ${skillDetails.length}/${targetReqs.length} key requirements`);
  }

  // ═══ 2. ROLE RELEVANCE (does their background match this role type?) ═══
  // Extract role-indicating keywords from target job
  const roleKeywords = extractRoleKeywords(targetTitle, targetDept, allTargetText);
  const candidateRoleKeywords = extractRoleKeywords("", "", [
    ...detectedSkills, summary, orgFit,
    ...skillsAlignment.map(s => s.detail.toLowerCase()),
  ].join(" "));

  const roleOverlap = roleKeywords.length > 0
    ? roleKeywords.filter(k => candidateRoleKeywords.includes(k) || detectedSkills.some(s => s.includes(k)) || summary.includes(k)).length / roleKeywords.length
    : 0.5;

  const toolsScore = Math.min(100, Math.round(roleOverlap * 100));

  if (wasAnalyzedForDifferentJob && roleOverlap < 0.3) {
    warnings.push("Candidate's background is in a different functional area");
  }

  // ═══ 3. EXPERIENCE FIT ═══
  const exp = analysis.experienceVerification;
  let expScore = 50;
  if (exp) {
    const years = parseFloat(exp.totalYears) || 0;
    const isSeniorRole = /senior|lead|manager|head|director|principal/i.test(targetTitle);
    const isJuniorRole = /junior|intern|entry|associate|specialist/i.test(targetTitle);

    if (isSeniorRole) {
      expScore = years >= 7 ? 90 : years >= 5 ? 75 : years >= 3 ? 55 : 30;
    } else if (isJuniorRole) {
      expScore = years <= 3 ? 85 : years <= 5 ? 70 : 60;
    } else {
      expScore = years >= 3 ? 80 : years >= 1 ? 65 : 45;
    }

    // Industry relevance from original analysis
    const indRel = (exp.industryRelevance || "").toLowerCase();
    if (indRel.includes("high") || indRel.includes("direct") || indRel.includes("exemplary")) {
      expScore = Math.min(100, expScore + 10);
    } else if (indRel.includes("low") || indRel.includes("traditional")) {
      expScore = Math.max(0, expScore - 15);
      warnings.push("Limited industry relevance");
    }

    // Seniority alignment
    const senAlign = (exp.seniorityAlignment || "").toLowerCase();
    if (senAlign.includes("underqualified") || senAlign.includes("junior")) {
      if (isSeniorRole) expScore = Math.max(0, expScore - 20);
    }
  }

  // ═══ 4. INDUSTRY/DEPARTMENT ALIGNMENT ═══
  // Does the candidate have experience in the target department's domain?
  const deptKeywords = getDeptKeywords(targetDept);
  const deptMatchCount = deptKeywords.filter(k =>
    detectedSkills.some(s => s.includes(k)) || summary.includes(k) || orgFit.includes(k)
  ).length;
  const industryScore = deptKeywords.length > 0
    ? Math.min(100, Math.round((deptMatchCount / deptKeywords.length) * 100))
    : (wasAnalyzedForDifferentJob ? 40 : (analysis.scoreBreakdown?.industryAlignment ?? 50));

  // ═══ 5. EDUCATION ═══
  const educationScore = analysis.scoreBreakdown?.educationRelevance ?? 60;

  // ═══ 6. STABILITY ═══
  let stabilityScore = analysis.scoreBreakdown?.careerStability ?? 65;
  if (analysis.riskIndicators && analysis.riskIndicators.length > 0) {
    stabilityScore = Math.max(20, stabilityScore - analysis.riskIndicators.length * 10);
  }

  // ═══ WEIGHTED TOTAL ═══
  const totalWeight = weights.skills + weights.tools + weights.experience + weights.industry + weights.education + weights.stability;
  const weightedScore = Math.round(
    (skillsScore * weights.skills +
     toolsScore * weights.tools +
     expScore * weights.experience +
     industryScore * weights.industry +
     educationScore * weights.education +
     stabilityScore * weights.stability) / totalWeight
  );

  const finalScore = Math.max(0, Math.min(100, weightedScore));

  // Build reasoning
  let reasoning: string;
  if (wasAnalyzedForDifferentJob) {
    const origJobNote = `Originally applied for a different role.`;
    if (finalScore >= 70) {
      reasoning = `${origJobNote} However, skills transfer well to ${targetJob.title}.`;
    } else if (finalScore >= 50) {
      reasoning = `${origJobNote} Partial skill overlap with ${targetJob.title} requirements.`;
    } else {
      reasoning = `${origJobNote} Background doesn't align well with ${targetJob.title}.`;
    }
  } else {
    if (finalScore >= 85) reasoning = `Strong direct match for ${targetJob.title} with verified skills and experience.`;
    else if (finalScore >= 70) reasoning = `Good fit for ${targetJob.title} with most requirements covered.`;
    else if (finalScore >= 50) reasoning = `Partial fit — some gaps in required skills or experience level.`;
    else reasoning = `Significant gaps between candidate profile and ${targetJob.title} requirements.`;
  }

  return {
    score: finalScore,
    reasoning,
    warnings,
    breakdown: [
      { label: "Skills Match", score: skillsScore, weight: weights.skills },
      { label: "Role Relevance", score: toolsScore, weight: weights.tools },
      { label: "Experience", score: expScore, weight: weights.experience },
      { label: "Dept. Fit", score: industryScore, weight: weights.industry },
      { label: "Education", score: educationScore, weight: weights.education },
      { label: "Stability", score: stabilityScore, weight: weights.stability },
    ],
  };
}

/** Extract domain-specific keywords from text to determine role family */
function extractRoleKeywords(title: string, dept: string, text: string): string[] {
  const keywords: string[] = [];
  const allText = `${title} ${dept} ${text}`.toLowerCase();

  const roleFamilies: Record<string, string[]> = {
    recruitment: ["recruitment", "talent acquisition", "sourcing", "hiring", "onboarding", "ats", "applicant", "candidate", "interview", "headhunt"],
    hr: ["human resources", "hr ", "people operations", "employee relations", "labor law", "hris", "workforce", "benefits", "payroll", "compensation"],
    customer_success: ["customer success", "client success", "csm", "account management", "client retention", "churn", "nps", "customer health", "upsell", "renewal", "saas"],
    sales: ["sales", "revenue", "pipeline", "quota", "crm", "deal", "prospecting", "business development", "b2b sales"],
    marketing: ["marketing", "brand", "content", "seo", "social media", "campaign", "demand generation", "lead generation"],
    engineering: ["engineering", "developer", "software", "frontend", "backend", "fullstack", "devops", "cloud", "architecture"],
    product: ["product management", "product owner", "roadmap", "user research", "ux", "design", "sprint"],
    operations: ["operations", "logistics", "supply chain", "procurement", "process improvement"],
    training: ["training", "learning", "development", "l&d", "lms", "instructional design", "capability"],
  };

  for (const [, terms] of Object.entries(roleFamilies)) {
    for (const term of terms) {
      if (allText.includes(term)) {
        keywords.push(term);
      }
    }
  }

  return [...new Set(keywords)];
}

/** Get domain keywords for a department */
function getDeptKeywords(dept: string): string[] {
  const d = dept.toLowerCase();
  if (d.includes("human") || d.includes("hr") || d.includes("people")) {
    return ["recruitment", "talent", "onboarding", "hr", "employee", "labor", "hris", "workforce", "hiring"];
  }
  if (d.includes("customer") || d.includes("success") || d.includes("client")) {
    return ["customer success", "client", "account", "retention", "saas", "renewal", "csm", "adoption"];
  }
  if (d.includes("sales") || d.includes("revenue")) {
    return ["sales", "revenue", "pipeline", "crm", "deal", "b2b"];
  }
  if (d.includes("engineering") || d.includes("tech")) {
    return ["engineering", "developer", "software", "api", "cloud", "code"];
  }
  if (d.includes("marketing")) {
    return ["marketing", "brand", "content", "campaign", "seo"];
  }
  if (d.includes("product")) {
    return ["product", "ux", "design", "roadmap", "research"];
  }
  return [];
}

// ─── UI Components ─────────────────────────────────────────

const RankBadge = ({ rank }: { rank: number }) => {
  if (rank === 1) return (
    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full ${TONE_SOFT.warning} ${TONE_BORDER.warning} border`}>
      <Crown className="w-3.5 h-3.5" aria-hidden="true" />
      <span className="text-[10px] font-bold">TOP</span>
    </div>
  );
  if (rank === 2) return (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted border border-border">
      <Medal className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
      <span className="text-[10px] font-semibold text-muted-foreground">#2</span>
    </div>
  );
  if (rank === 3) return (
    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${TONE_SOFT.bronze} ${TONE_BORDER.bronze} border`}>
      <Medal className="w-3 h-3" aria-hidden="true" />
      <span className="text-[10px] font-semibold">#3</span>
    </div>
  );
  return <span className="text-[10px] font-bold text-muted-foreground w-8 text-center">#{rank}</span>;
};

const ScoreRing = ({ score, size = 40 }: { score: number; size?: number }) => {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 85 ? "stroke-[hsl(var(--intel-success))]" : score >= 70 ? "stroke-primary" : score >= 50 ? "stroke-[hsl(var(--intel-warning))]" : "stroke-destructive";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" className="stroke-muted" strokeWidth={3} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" className={color} strokeWidth={3}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">{score}</span>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────

const SmartRankingRefresh = ({ applicants, jobs, job }: SmartRankingRefreshProps) => {
  const [refreshing, setRefreshing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [changes, setChanges] = useState<RankChange[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string>(job?.id || "");

  const targetJob = jobs.find(j => j.id === selectedJobId) || job;
  // Only show candidates who actually applied for the selected job
  const jobApplicants = targetJob ? applicants.filter(a => a.jobId === targetJob.id) : [];
  const analyzedApplicants = jobApplicants.filter(a => a.aiAnalysis?.fitScore != null);

  const handleRefresh = async () => {
    if (!targetJob) {
      toast.error("Select a job position first");
      return;
    }
    if (analyzedApplicants.length === 0) {
      const total = jobApplicants.length;
      toast.error(total === 0
        ? `No candidates applied for "${targetJob.title}"`
        : `${total} candidate(s) found but none have AI analysis yet`
      );
      return;
    }

    setRefreshing(true);
    setProgress(0);
    setChanges(null);

    try {
      const results: RankChange[] = [];

      for (let i = 0; i < analyzedApplicants.length; i++) {
        const a = analyzedApplicants[i];
        const oldScore = a.aiAnalysis!.fitScore;
        const { score: newScore, breakdown, reasoning, warnings } = reScoreForJob(a, targetJob);

        results.push({
          id: a.id,
          name: a.fullName,
          oldScore,
          newScore,
          change: newScore - oldScore,
          tier: getTier(newScore),
          reasoning,
          breakdown,
          warnings,
        });

        setProgress(Math.round(((i + 1) / analyzedApplicants.length) * 100));
        await new Promise(r => setTimeout(r, 60));
      }

      setChanges(results.sort((a, b) => b.newScore - a.newScore));
      toast.success(`Re-ranked ${results.length} candidates for "${targetJob.title}"`);
    } catch {
      toast.error("Re-ranking failed");
    } finally {
      setRefreshing(false);
    }
  };

  const topCandidate = changes?.[0];

  return (
    <div className="space-y-4">
      <Card className="border-border/50 overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Target className="w-4 h-4 text-primary" />
                </div>
                Job-Specific Re-Ranking
              </CardTitle>
              <CardDescription className="ml-[42px] text-xs mt-1">
                Rank candidates against a specific position using skills, role relevance & experience
              </CardDescription>
            </div>
          </div>

          {/* Job Selector */}
          <div className="flex items-end gap-3 mt-4 ml-[42px]">
            <div className="flex-1 max-w-md">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Target Position
              </label>
              <Select value={selectedJobId} onValueChange={(v) => { setSelectedJobId(v); setChanges(null); }}>
                <SelectTrigger className="h-10 text-sm rounded-xl border-border/60 bg-background">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                    <SelectValue placeholder="Choose a job position..." />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {jobs.filter(j => j.status === "open").length > 0 && (
                    <div className="px-2 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Open Positions</div>
                  )}
                  {jobs.filter(j => j.status === "open").map(j => (
                    <SelectItem key={j.id} value={j.id} className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--intel-success))] shrink-0" />
                        {j.title} <span className="text-muted-foreground">· {j.department}</span>
                      </div>
                    </SelectItem>
                  ))}
                  {jobs.filter(j => j.status === "closed").length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Closed</div>
                      {jobs.filter(j => j.status === "closed").map(j => (
                        <SelectItem key={j.id} value={j.id} className="text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                            {j.title} · {j.department}
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              {targetJob && (
                <Badge variant="outline" className="text-[10px] py-1 px-2 h-10 rounded-xl">
                  {targetJob.requirements?.length || 0} req · {targetJob.responsibilities?.length || 0} resp
                </Badge>
              )}
              <Button
                onClick={handleRefresh}
                disabled={refreshing || analyzedApplicants.length === 0 || !targetJob}
                className="h-10 rounded-xl text-xs px-5"
              >
                {refreshing ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5 mr-1.5" />
                )}
                Re-Rank {analyzedApplicants.length}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Progress */}
          <AnimatePresence>
            {refreshing && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-4">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Scoring against <strong>{targetJob?.title}</strong>...</span>
                  <span className="font-mono font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══ TOP CANDIDATE HERO ═══ */}
          <AnimatePresence>
            {topCandidate && !refreshing && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-5 p-4 rounded-2xl border-2 border-[hsl(var(--chart-5)/0.3)] bg-gradient-to-br from-[hsl(var(--chart-5)/0.05)] via-background to-[hsl(var(--chart-5)/0.05)] relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-[hsl(var(--chart-5)/0.05)] rounded-full blur-2xl -translate-y-8 translate-x-8" />
                <div className="flex items-center gap-4 relative">
                  <div className="w-12 h-12 rounded-2xl bg-[hsl(var(--chart-5)/0.15)] border border-[hsl(var(--chart-5)/0.3)] flex items-center justify-center">
                    <Crown className="w-6 h-6 text-[hsl(var(--chart-5))]" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-[hsl(var(--chart-5))] uppercase tracking-wider">
                        Best Candidate for {targetJob?.title}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold truncate">{topCandidate.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{topCandidate.reasoning}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge className="bg-[hsl(var(--chart-5)/0.15)] text-[hsl(var(--chart-5))] border-[hsl(var(--chart-5)/0.3)] text-[10px] hover:bg-[hsl(var(--chart-5)/0.2)]">
                        <Sparkles className="w-3 h-3 mr-1" aria-hidden="true" />
                        Score {topCandidate.newScore}/100
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{topCandidate.tier}</Badge>
                      {topCandidate.change !== 0 && (
                        <span className={`text-[10px] font-medium ${topCandidate.change > 0 ? TONE_TEXT.success : "text-destructive"}`}>
                          {topCandidate.change > 0 ? "↑" : "↓"} {Math.abs(topCandidate.change)} vs original
                        </span>
                      )}
                    </div>
                  </div>
                  <ScoreRing score={topCandidate.newScore} size={56} />
                </div>
                <div className="grid grid-cols-6 gap-2 mt-3 pt-3 border-t border-[hsl(var(--chart-5)/0.1)]">
                  {topCandidate.breakdown.map(b => (
                    <div key={b.label} className="text-center">
                      <div className="text-[9px] text-muted-foreground truncate">{b.label}</div>
                      <div className={`text-xs font-bold ${b.score >= 75 ? TONE_TEXT.success : b.score >= 50 ? TONE_TEXT.warning : "text-destructive"}`}>
                        {b.score}%
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Summary stats */}
          {changes && !refreshing && (
            <div className="flex gap-3 mb-4 flex-wrap">
              <Badge variant="secondary" className={`text-[10px] py-0.5 border-0 ${TONE_SOFT.success}`}>
                <ArrowUp className="w-3 h-3 mr-0.5" aria-hidden="true" />
                {changes.filter(c => c.change > 0).length} improved
              </Badge>
              <Badge variant="secondary" className="text-[10px] py-0.5 border-0 bg-destructive/10 text-destructive">
                <ArrowDown className="w-3 h-3 mr-0.5" />
                {changes.filter(c => c.change < 0).length} decreased
              </Badge>
              <Badge variant="secondary" className="text-[10px] py-0.5 border-0 bg-muted text-muted-foreground">
                <Minus className="w-3 h-3 mr-0.5" />
                {changes.filter(c => c.change === 0).length} unchanged
              </Badge>
              <div className="ml-auto text-[10px] text-muted-foreground">
                {changes.length} candidates ranked for <strong>{targetJob?.title}</strong>
              </div>
            </div>
          )}

          {/* ═══ RANKING LIST ═══ */}
          {changes && (
            <div className="space-y-1.5">
              {changes.map((c, i) => {
                const tierStyle = TIER_CONFIG[c.tier] || TIER_CONFIG["Weak Match"];
                const isExpanded = expandedId === c.id;
                const isTop3 = i < 3;

                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.025 }}
                  >
                    <div
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all
                        ${isTop3 ? `${tierStyle.bg} border ${tierStyle.border}` : "bg-muted/10 border border-border/20 hover:bg-muted/20"}
                      `}
                      onClick={() => setExpandedId(isExpanded ? null : c.id)}
                    >
                      <RankBadge rank={i + 1} />

                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate block">{c.name}</span>
                        {c.warnings.length > 0 && (
                          <span className={`text-[9px] flex items-center gap-0.5 mt-0.5 ${TONE_TEXT.warning}`}>
                            <AlertTriangle className="w-2.5 h-2.5" aria-hidden="true" />
                            {c.warnings[0]}
                          </span>
                        )}
                      </div>

                      <Badge variant="secondary" className={`text-[10px] py-0 border-0 ${tierStyle.bg} ${tierStyle.text}`}>
                        {c.tier}
                      </Badge>

                      <div className="flex items-center gap-2 text-xs shrink-0">
                        <span className="text-muted-foreground tabular-nums">{c.oldScore}</span>
                        <span className="text-muted-foreground/30">→</span>
                        <span className="font-bold tabular-nums">{c.newScore}</span>
                      </div>

                      <Badge
                        variant="secondary"
                        className={`text-[10px] py-0 border-0 tabular-nums min-w-[36px] justify-center ${
                          c.change > 0 ? TONE_SOFT.success :
                          c.change < 0 ? "bg-destructive/10 text-destructive" :
                          "bg-muted text-muted-foreground"
                        }`}
                      >
                        {c.change > 0 ? "+" : ""}{c.change}
                      </Badge>

                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="ml-10 mr-4 mt-1 mb-2 p-3 rounded-xl bg-muted/5 border border-border/10 space-y-3">
                            {/* Reasoning */}
                            <p className="text-[11px] text-muted-foreground italic">{c.reasoning}</p>

                            {/* Breakdown bars */}
                            <div className="grid grid-cols-3 gap-3">
                              {c.breakdown.map(b => (
                                <div key={b.label} className="space-y-1">
                                  <div className="flex justify-between text-[10px]">
                                    <span className="text-muted-foreground">{b.label} <span className="text-muted-foreground/50">({b.weight}%)</span></span>
                                    <span className={`font-bold ${b.score >= 75 ? TONE_TEXT.success : b.score >= 50 ? TONE_TEXT.warning : "text-destructive"}`}>
                                      {b.score}
                                    </span>
                                  </div>
                                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${b.score}%` }}
                                      transition={{ duration: 0.5, delay: 0.1 }}
                                      className={`h-full rounded-full ${
                                        b.score >= 75 ? TONE_BG.success : b.score >= 50 ? TONE_BG.warning : "bg-destructive"
                                      }`}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Warnings */}
                            {c.warnings.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {c.warnings.map((w, wi) => (
                                  <Badge key={wi} variant="outline" className={`text-[9px] py-0 ${TONE_TEXT.warning} ${TONE_BORDER.warning} bg-[hsl(var(--intel-warning)/0.05)]`}>
                                    <AlertTriangle className="w-2.5 h-2.5 mr-0.5" aria-hidden="true" />
                                    {w}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {!changes && !refreshing && (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
                <Target className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                {targetJob
                  ? `Ready to rank ${analyzedApplicants.length} candidates against "${targetJob.title}"`
                  : "Select a job position to start ranking"}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Cross-job candidates are penalized when their background doesn't match the target role
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SmartRankingRefresh;
