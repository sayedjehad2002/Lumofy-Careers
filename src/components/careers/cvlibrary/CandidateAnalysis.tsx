import { useState } from "react";
import {
  Brain, Loader2, Target, Zap, BookOpen, Briefcase, AlertTriangle,
  TrendingUp, MessageSquare, Quote, Check, AlertCircle, X,
  Lightbulb, Shield, Building2, ThumbsUp, ThumbsDown, Sparkles, Route, BarChart3, ShieldAlert,
  Info, ChevronDown, ShieldCheck, Scale,
} from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TONE_SOFT, TONE_TEXT, TONE_BORDER, scoreTone, type Tone } from "../statusColors";

/**
 * The shared AI analysis shape (applicants + CV library). Exported as the single
 * source of truth so CVLibrary (and any future consumer) imports it from here.
 * Most non-core fields are optional — older analyses won't have them, and the
 * CV-library analyzer produces a subset (no scoreBreakdown/weights/confidence).
 */
export interface CVAIAnalysis {
  /** Set INSTEAD of a real analysis when the CV couldn't be read (Word file / no
   *  extractable text). When true, show a "re-upload as PDF" state and NO score. */
  unreadable?: boolean;
  reason?: string;
  fitScore: number;
  fitLevel: string;
  recommendation: string;
  recommendationJustification: string;
  summary: string;
  strengths: string[];
  gaps: string[];
  skillsAlignment: { requiredSkill: string; evidence: string; detail: string }[];
  skillsCoveragePercent: number;
  detectedSkills: string[];
  missingSkills: string[];
  experienceVerification: {
    totalYears: string;
    seniorityAlignment: string;
    industryRelevance: string;
  };
  riskIndicators: string[];
  organizationalFit: string;
  growthPotential: string;
  evidenceCitations: string[];
  interviewQuestions: string[];
  feedback: string;
  analyzedAt: string;
  professionalIdentity?: { primary: string; primaryConfidence: number; secondary: string; secondaryConfidence: number; keyIdentity: string };
  careerTrackAnalysis?: string;
  evidenceFor?: string[];
  evidenceAgainst?: string[];
  alternativesConsidered?: { role: string; confidence: number }[];
  departmentMatches?: { department: string; confidence: number; reason: string }[];
  recruiterVerdict?: { shortlistFor: string; reasoning: string };
  // Applicant-context extras (optional; CV-library analyses won't have them).
  confidence?: string;
  cvParsingStatus?: "success" | "partial" | "failed";
  rankingTier?: string;
  redFlags?: string[];
  scoreBreakdown?: {
    skillsMatch: number; toolsMatch: number; relevantExperience: number;
    industryAlignment: number; educationRelevance: number; careerStability: number;
  };
  /** @deprecated Predictive probabilities — no longer generated or rendered (kept so
   *  old stored analyses still type-check; the UI deliberately ignores them). */
  interviewSuccessProbability?: number;
  offerAcceptanceProbability?: number;
  earlyTurnoverRisk?: number;
  growthPotentialScore?: number;
  /** @deprecated rationale for the removed probabilities. */
  insightRationale?: {
    interviewSuccess?: string; offerAcceptance?: string;
    earlyTurnoverRisk?: string; growthPotential?: string;
  };
  // Score-transparency fields:
  /** The HR-configured weights the analysis actually used (echoed server-side). */
  weightsUsed?: { skills: number; tools: number; experience: number; industry: number; education: number; stability: number };
  /** v1: one-sentence rationale per dimension (fallback when scoreExplanations is absent). */
  scoreRationale?: {
    skillsMatch?: string; toolsMatch?: string; relevantExperience?: string;
    industryAlignment?: string; educationRelevance?: string; careerStability?: string;
  };
  // v2 explainability (AI Hiring Intelligence):
  scoreExplanations?: Partial<Record<keyof NonNullable<CVAIAnalysis["scoreBreakdown"]>, { evidence?: string; missing?: string; reasoning?: string }>>;
  evidenceQuality?: { level?: string; reasoning?: string };
  positiveSignals?: { signal: string; source?: string; impact?: string; reasoning?: string }[];
  riskSignals?: { signal: string; source?: string; impact?: string; reasoning?: string; verificationQuestion?: string }[];
  verificationChecklist?: string[];
  interviewGuide?: { category?: string; question: string; whyAsk?: string }[];
}

const FIT_TEXT: Record<string, string> = {
  "Strong Fit": TONE_TEXT.success,
  "Moderate Fit": TONE_TEXT.warning,
  "Low Fit": TONE_TEXT.danger,
};

const REC_SOFT: Record<string, string> = {
  "Fast-Track to Interview": `${TONE_SOFT.success} ${TONE_BORDER.success}`,
  "Proceed to Next Stage": "bg-[hsl(var(--chart-1)/0.15)] text-[hsl(var(--chart-1))] border-[hsl(var(--chart-1)/0.3)]",
  "Hold for Review": `${TONE_SOFT.warning} ${TONE_BORDER.warning}`,
  "Not Recommended": `${TONE_SOFT.danger} ${TONE_BORDER.danger}`,
};

const GAUGE_STROKE: Record<Tone, string> = {
  success: "hsl(var(--intel-success))",
  warning: "hsl(var(--intel-warning))",
  danger: "hsl(var(--destructive))",
  accent: "hsl(var(--primary))",
  ai: "hsl(var(--chart-3))",
  bronze: "hsl(var(--chart-5))",
  muted: "hsl(var(--muted-foreground))",
};

// Each breakdown dimension: its weight key in weightsUsed + an honest one-line
// description of what the AI is instructed to measure (mirrors the analyzer
// prompt in supabase/functions/analyze-cv + auto-analyze-applicant — keep in sync).
const SCORE_ROWS: {
  key: keyof NonNullable<CVAIAnalysis["scoreBreakdown"]>;
  weightKey: keyof NonNullable<CVAIAnalysis["weightsUsed"]>;
  label: string;
  how: string;
}[] = [
  { key: "skillsMatch", weightKey: "skills", label: "Skills match", how: "How well the candidate's evidenced skills cover this job's required skills — judged from what they actually did in past roles, not from keywords or job titles." },
  { key: "toolsMatch", weightKey: "tools", label: "Tools & tech", how: "Coverage of the specific tools and technologies the role calls for, based on evidence of real use in the CV." },
  { key: "relevantExperience", weightKey: "experience", label: "Relevant experience", how: "How directly past responsibilities, outcomes, and seniority map to this role's responsibilities and level." },
  { key: "industryAlignment", weightKey: "industry", label: "Industry alignment", how: "Whether the candidate has worked in this industry or closely adjacent domains." },
  { key: "educationRelevance", weightKey: "education", label: "Education relevance", how: "How relevant degrees, certifications, and formal training are to this role's requirements." },
  { key: "careerStability", weightKey: "stability", label: "Career stability", how: "Tenure pattern and progression — frequent short stints (e.g. 3+ roles under a year) score low; consistent, progressive careers score high." },
];

// Shared fallback when an older analysis predates per-score reasoning.
const NO_RATIONALE = "This analysis was generated before per-score reasoning was stored. Re-run the AI analysis to get the specific CV evidence behind each number.";

/** Map a qualitative level to a tone (higher-is-better unless inverted). */
function levelTone(level: string | undefined, inverted = false): string {
  if (!level) return "text-foreground";
  const good = inverted ? ["low"] : ["strong", "top", "high"];
  const mid = ["moderate", "medium"];
  const l = level.toLowerCase();
  if (good.some((g) => l.includes(g))) return TONE_TEXT.success;
  if (mid.some((m) => l.includes(m))) return TONE_TEXT.warning;
  return TONE_TEXT.danger;
}

const IMPACT_CHIP = "rounded-full border border-border/60 px-1.5 py-0 text-[10px] text-muted-foreground";

/**
 * Small ⓘ affordance explaining how a metric is measured and — when the analysis
 * carries it — the specific evidence behind THIS candidate's number. A click/tap
 * Popover (not a hover tooltip) so it works on touch and keyboard.
 */
function InfoHint({ label, how, weightPct, why, whyLabel = "Why this number" }: {
  label: string;
  how: string;
  weightPct?: number;
  why?: React.ReactNode;
  whyLabel?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`How "${label}" is calculated`}
          className="-m-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:text-primary-readable focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Info className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent aria-label={label} side="top" align="start" collisionPadding={12} className="w-80 max-w-[calc(100vw-2rem)] p-4">
        <p className="mb-1 text-xs font-semibold">{label}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{how}</p>
        {weightPct != null && Number.isFinite(weightPct) && (
          <p className="mt-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Weight in overall score:</span>{" "}
            <span className="tabular-nums">{weightPct}%</span>
          </p>
        )}
        {why != null && (
          <div className="mt-2.5 border-t border-border pt-2.5">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-primary-readable">{whyLabel}</p>
            <div className="text-xs leading-relaxed text-foreground/90">{why}</div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Compact radial score gauge — reads the verdict in one glance. */
function ScoreGauge({ score }: { score: number }) {
  const tone = scoreTone(score);
  const clamped = Math.min(100, Math.max(0, score));
  const r = 34;
  const circ = 2 * Math.PI * r;
  const offset = circ - (clamped / 100) * circ;
  return (
    <div className="relative h-[92px] w-[92px] flex-shrink-0">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 80 80" aria-hidden="true">
        <circle cx="40" cy="40" r={r} fill="none" stroke="hsl(var(--intel-gauge-track))" strokeWidth="7" />
        <circle
          cx="40" cy="40" r={r} fill="none" stroke={GAUGE_STROKE[tone]} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold leading-none tabular-nums">{score}</span>
        <span className="text-[10px] text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

/** Long free-text fields clamp to a few lines with a Show more toggle. */
function ExpandableText({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const isLong = text.length > 260;
  return (
    <div>
      <p
        className="text-sm leading-relaxed text-foreground/90"
        style={!open && isLong ? { display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" } : undefined}
      >
        {text}
      </p>
      {isLong && (
        <button onClick={() => setOpen((o) => !o)} className="mt-1.5 text-xs font-semibold text-primary-readable hover:underline">
          {open ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

/** Labelled field block for free-text sections. */
function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-secondary/30 p-4">
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}{label}
      </p>
      {children}
    </div>
  );
}

function evidenceIcon(evidence: string) {
  if (evidence === "Yes") return <Check className={`h-4 w-4 flex-shrink-0 ${TONE_TEXT.success}`} aria-hidden="true" />;
  if (evidence === "Partial") return <AlertCircle className={`h-4 w-4 flex-shrink-0 ${TONE_TEXT.warning}`} aria-hidden="true" />;
  return <X className="h-4 w-4 flex-shrink-0 text-destructive" aria-hidden="true" />;
}

/**
 * One expandable "Why this score" row: header = score bar + contribution; expanded
 * = what it measures, weight/contribution, and the evidence behind THIS number.
 * The whole header is ONE button (no nested interactives).
 */
function ScoreRow({ label, how, value, weightPct, explanation, rationale }: {
  label: string;
  how: string;
  value: number;
  weightPct?: number;
  explanation?: { evidence?: string; missing?: string; reasoning?: string };
  rationale?: string;
}) {
  const [open, setOpen] = useState(false);
  const contribution = weightPct != null && Number.isFinite(weightPct) ? (value * weightPct) / 100 : null;
  const hasDetail = !!(explanation?.evidence || explanation?.missing || explanation?.reasoning || rationale);
  return (
    <div className={`rounded-lg transition-colors ${open ? "bg-secondary/30" : ""}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronDown className={`h-3.5 w-3.5 flex-shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        <span className="w-28 flex-shrink-0 truncate text-xs text-muted-foreground sm:w-40">{label}</span>
        <Progress value={value} className="h-1.5 flex-1" />
        <span className="w-8 flex-shrink-0 text-right text-xs tabular-nums">{value}</span>
        {contribution != null && (
          <span className="hidden w-16 flex-shrink-0 text-right text-[11px] tabular-nums text-muted-foreground sm:block">
            +{contribution.toFixed(1)} pts
          </span>
        )}
      </button>
      {open && (
        <div className="space-y-2 px-1.5 pb-3 pl-8 pr-3 pt-0.5">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {how}
            {weightPct != null && Number.isFinite(weightPct) && (
              <span> <span className="font-semibold text-foreground">Weight {weightPct}%</span>{contribution != null ? ` → contributes ${contribution.toFixed(1)} of the final score.` : "."}</span>
            )}
          </p>
          {hasDetail ? (
            <div className="space-y-1.5 text-xs leading-relaxed">
              {explanation?.evidence && (
                <p><span className={`font-semibold ${TONE_TEXT.success}`}>Evidence:</span> <span className="text-foreground/90">{explanation.evidence}</span></p>
              )}
              {explanation?.missing && (
                <p><span className={`font-semibold ${TONE_TEXT.warning}`}>Missing:</span> <span className="text-foreground/90">{explanation.missing}</span></p>
              )}
              {(explanation?.reasoning || rationale) && (
                <p><span className="font-semibold text-muted-foreground">Reasoning:</span> <span className="text-foreground/90">{explanation?.reasoning || rationale}</span></p>
              )}
            </div>
          ) : (
            <p className="text-xs italic text-muted-foreground">{NO_RATIONALE}</p>
          )}
        </div>
      )}
    </div>
  );
}

interface Props {
  ai: CVAIAnalysis | null;
  analyzing: boolean;
  onRun: () => void;
  disabled?: boolean;
}

export default function CandidateAnalysis({ ai, analyzing, onRun, disabled }: Props) {
  if (analyzing) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-10 light-glow">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Reading the CV and scoring against the role…</p>
      </div>
    );
  }

  if (!ai) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center light-glow">
        <Brain className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" aria-hidden="true" />
        <p className="mb-1 font-semibold">No AI analysis yet</p>
        <p className="mb-4 text-sm text-muted-foreground">Run the recruiter-grade analysis to score fit, surface evidence, and get interview questions.</p>
        <Button onClick={onRun} disabled={disabled}>
          <Brain className="mr-2 h-4 w-4" /> Run AI analysis
        </Button>
      </div>
    );
  }

  // CV couldn't be read (Word file / no extractable text) — show a clear re-upload
  // prompt instead of a score built from no data.
  if (ai.unreadable) {
    return (
      <div className="rounded-2xl border border-dashed border-destructive/40 bg-card p-10 text-center light-glow">
        <AlertCircle className="mx-auto mb-3 h-10 w-10 text-destructive/60" aria-hidden="true" />
        <p className="mb-1 font-semibold">Couldn't read this CV</p>
        <p className="mb-4 text-sm text-muted-foreground">
          {ai.reason === "word"
            ? "Word files (.doc/.docx) can't be read by our AI screening. Re-upload the CV as a PDF, then run the analysis again."
            : "No readable text was found in this file. Re-upload a clear, text-based PDF, then run the analysis again."}
        </p>
        <Button onClick={onRun} disabled={disabled}>
          <Brain className="mr-2 h-4 w-4" /> Re-run analysis
        </Button>
      </div>
    );
  }

  // ── Score-transparency derivations (real math from the stored numbers) ──
  const rawWeightedRows = ai.scoreBreakdown && ai.weightsUsed
    ? SCORE_ROWS.map((r) => ({ label: r.label, score: Number(ai.scoreBreakdown![r.key]), pct: Number(ai.weightsUsed![r.weightKey]) }))
    : null;
  const weightedRows = rawWeightedRows && rawWeightedRows.every((r) => Number.isFinite(r.score) && Number.isFinite(r.pct))
    ? rawWeightedRows
    : null;
  const weightedTotal = weightedRows
    ? Math.round(weightedRows.reduce((acc, r) => acc + (r.score * r.pct) / 100, 0))
    : null;
  // Skills coverage is the Yes/Partial/No skills-alignment list summarized as a %.
  const saYes = (ai.skillsAlignment ?? []).filter((s) => s.evidence === "Yes").length;
  const saPartial = (ai.skillsAlignment ?? []).filter((s) => s.evidence === "Partial").length;
  const saTotal = (ai.skillsAlignment ?? []).length;

  const overallHow = ai.scoreBreakdown
    ? `The AI reads the actual CV against this job's description, responsibilities, and requirements, scores six dimensions independently (0–100), and combines them into a weighted average using the weights HR configured for this job. Scoring is calibrated to the role's seniority — typical score bands shift with the level (more lenient for intern/junior roles, stricter for senior ones) — and only exceptional candidates score above 85. Tiers: 85+ Top Match · 70–84 Strong · 50–69 Moderate · below 50 Weak.${ai.confidence ? " The Confidence badge is the AI's own certainty in this assessment, based on how completely the CV was parsed and how much concrete evidence it contains." : ""}`
    : "The AI reads the actual CV and scores overall fit (0–100) from evidence of skills, experience, industry, and education against the role. Findings must cite real CV content, and protected traits (age, gender, nationality, religion) are excluded from consideration.";

  // ── AI evidence signals (qualitative, explainable — replaces the removed
  //    predictive percentages, which were unvalidated AI guesses) ──
  const checklist = ai.verificationChecklist?.length ? ai.verificationChecklist : (ai.riskIndicators ?? []);
  const verifNeed = checklist.length === 0 ? "Low" : checklist.length <= 2 ? "Medium" : "High";
  const tierShort = ai.rankingTier?.replace(" Match", "");
  const expBucket = ai.scoreBreakdown
    ? ai.scoreBreakdown.relevantExperience >= 70 ? "Strong" : ai.scoreBreakdown.relevantExperience >= 50 ? "Moderate" : "Weak"
    : null;
  const signals: { label: string; value: string; tone: string; how: string; why?: string }[] = [];
  if (tierShort || ai.fitLevel) {
    const v = tierShort ?? ai.fitLevel.replace(" Fit", "");
    signals.push({
      label: "Role alignment", value: v, tone: levelTone(v),
      how: "How strongly the candidate matches this job overall — the qualitative tier behind the fit score (85+ Top · 70–84 Strong · 50–69 Moderate · below 50 Weak).",
      why: `Derived from the overall fit score of ${ai.fitScore}/100.`,
    });
  }
  if (ai.skillsCoveragePercent != null) { // pre-evidence-era analyses may lack it — avoid "undefined%"
    signals.push({
      label: "Skills coverage", value: `${ai.skillsCoveragePercent}%`, tone: ai.skillsCoveragePercent >= 70 ? TONE_TEXT.success : ai.skillsCoveragePercent >= 40 ? TONE_TEXT.warning : TONE_TEXT.danger,
      how: "The share of this job's required skills the AI found real evidence for in the CV (each requirement checked Yes / Partial / No — full list in the Skills tab).",
      why: saTotal > 0 ? `Evidence found for ${saYes} of ${saTotal} required skills${saPartial > 0 ? `, partial evidence for ${saPartial} more` : ""}.` : undefined,
    });
  }
  if (expBucket) {
    signals.push({
      label: "Experience relevance", value: expBucket, tone: levelTone(expBucket),
      how: "How relevant the candidate's actual past responsibilities are to this role — a qualitative read of the Relevant-experience dimension.",
      why: `Relevant-experience scored ${ai.scoreBreakdown!.relevantExperience}/100 — open that row in "Why this score" for the evidence.`,
    });
  }
  if (ai.evidenceQuality?.level) {
    signals.push({
      label: "Evidence quality", value: ai.evidenceQuality.level, tone: levelTone(ai.evidenceQuality.level),
      how: "How strong, specific, and credible the CV/application evidence is — verifiable achievements and dates score high; vague buzzwords or implausible claims score low.",
      why: ai.evidenceQuality.reasoning,
    });
  }
  signals.push({
    label: "Verification need", value: verifNeed, tone: levelTone(verifNeed, true),
    how: "How much of this profile needs recruiter follow-up before a decision — derived from the number of verification items the analysis flagged.",
    why: checklist.length === 0 ? "No verification items were flagged." : `${checklist.length} item${checklist.length === 1 ? "" : "s"} to verify — see the Evidence & Verify tab.`,
  });
  if (ai.confidence) {
    signals.push({
      label: "AI confidence", value: ai.confidence, tone: levelTone(ai.confidence),
      how: "The AI's own certainty in this assessment, based on how completely the CV was parsed and how much concrete evidence it contains.",
    });
  }

  // Score impact: v2 signals, falling back to strengths/gaps for older analyses.
  const positives = ai.positiveSignals?.length
    ? ai.positiveSignals
    : (ai.strengths ?? []).map((s) => ({ signal: s, source: undefined, impact: undefined, reasoning: undefined }));
  const risks = ai.riskSignals?.length
    ? ai.riskSignals
    : (ai.gaps ?? []).map((g) => ({ signal: g, source: undefined, impact: undefined, reasoning: undefined, verificationQuestion: undefined }));

  // Interview guide: v2 grouped questions, falling back to the flat v1 list.
  const guideGroups = ai.interviewGuide?.length
    ? ai.interviewGuide.reduce<Record<string, { question: string; whyAsk?: string }[]>>((acc, q) => {
        const cat = q.category || "General";
        (acc[cat] = acc[cat] || []).push(q);
        return acc;
      }, {})
    : null;

  return (
    <motion.div
      className="space-y-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* CV parsing warning (applicant context) */}
      {ai.cvParsingStatus && ai.cvParsingStatus !== "success" && (
        <div className={`flex items-center gap-2 rounded-2xl border p-3 text-sm ${TONE_SOFT.warning} ${TONE_BORDER.warning}`}>
          <AlertTriangle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>{ai.cvParsingStatus === "failed" ? "CV could not be fully parsed — manual HR review recommended." : "CV was only partially parsed; some data may be incomplete."}</span>
        </div>
      )}

      {/* ===== 1 · Executive summary — the verdict, its reasoning, in one glance ===== */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 light-glow sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
          <ScoreGauge score={ai.fitScore} />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI Hiring Intelligence</span>
              <InfoHint
                label="Overall fit score"
                how={overallHow}
                why={
                  weightedRows ? (
                    <div className="space-y-0.5">
                      {weightedRows.map((r) => (
                        <p key={r.label} className="flex justify-between gap-3 tabular-nums">
                          <span className="text-muted-foreground">{r.label} {r.score} × {r.pct}%</span>
                          <span>{((r.score * r.pct) / 100).toFixed(1)} pts</span>
                        </p>
                      ))}
                      <p className="flex justify-between gap-3 border-t border-border pt-1 font-semibold tabular-nums">
                        <span>Weighted total</span>
                        <span>≈ {weightedTotal} / 100</span>
                      </p>
                    </div>
                  ) : ai.recommendationJustification || undefined
                }
                whyLabel={weightedRows ? "This candidate's calculation" : "Why this score"}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {ai.fitLevel && (
                <span className={`text-sm font-bold ${FIT_TEXT[ai.fitLevel] || "text-foreground"}`}>{ai.fitLevel}</span>
              )}
              {ai.recommendation && (
                <Badge className={`border text-xs ${REC_SOFT[ai.recommendation] || "bg-secondary text-foreground"}`}>
                  {ai.recommendation}
                </Badge>
              )}
              {ai.confidence && (
                <Badge variant="outline" className="text-[10px]">Confidence: {ai.confidence}</Badge>
              )}
            </div>
            {ai.summary && <p className="text-sm leading-relaxed text-foreground/90">{ai.summary}</p>}
            {ai.professionalIdentity?.keyIdentity && (
              <p className="text-xs italic text-muted-foreground">"{ai.professionalIdentity.keyIdentity}"</p>
            )}
            {ai.skillsCoveragePercent != null && (
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  Skills coverage
                  <InfoHint
                    label="Skills coverage"
                    how="The share of this job's required skills the AI found real evidence for in the CV. Each requirement is checked individually (Yes / Partial / No) — the full list is in the Skills tab; this percentage summarizes it."
                    why={saTotal > 0
                      ? `Evidence found for ${saYes} of ${saTotal} required skills${saPartial > 0 ? `, with partial evidence for ${saPartial} more` : ""} — see the Skills tab for the per-skill detail.`
                      : undefined}
                  />
                </span>
                <span className="font-semibold tabular-nums">{ai.skillsCoveragePercent}%</span>
              </div>
              <Progress value={ai.skillsCoveragePercent} className="h-2" />
            </div>
            )}
            {ai.recruiterVerdict?.shortlistFor && (
              <p className="flex items-start gap-1.5 text-sm">
                <Target className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" aria-hidden="true" />
                <span><span className="font-semibold text-primary-readable">Shortlist for:</span> {ai.recruiterVerdict.shortlistFor}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ===== 2 · Why this score — expandable weighted breakdown + signals + impact ===== */}
      {(ai.scoreBreakdown || signals.length > 0 || positives.length > 0 || risks.length > 0) && (
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5 light-glow sm:p-6">
          {ai.scoreBreakdown && (
            <div>
              {/* InfoHint lives BESIDE the h3 (not inside) so the button's aria-label
                  doesn't pollute the heading's accessible name in SR navigation. */}
              <div className="mb-2 flex items-center gap-2">
                <h3 className="flex items-center gap-2 font-semibold">
                  <BarChart3 className="h-4 w-4 text-primary" aria-hidden="true" /> Why this score
                </h3>
                <InfoHint
                  label="Why this score"
                  how="Each dimension is scored 0–100 independently, strictly from CV evidence against this job's requirements. The overall fit score is the weighted average of these six numbers, using the weights HR configured for this job. Expand a row for what it measures, its weight, and the evidence behind this candidate's number."
                />
              </div>
              <div className="space-y-0.5">
                {SCORE_ROWS.map(({ key, weightKey, label, how }) => (
                  <ScoreRow
                    key={key}
                    label={label}
                    how={how}
                    value={ai.scoreBreakdown![key]}
                    weightPct={ai.weightsUsed ? Number(ai.weightsUsed[weightKey]) : undefined}
                    explanation={ai.scoreExplanations?.[key]}
                    rationale={ai.scoreRationale?.[key]}
                  />
                ))}
              </div>
            </div>
          )}

          {/* AI evidence signals — qualitative + explainable (no invented probabilities) */}
          {signals.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> AI evidence signals
                </h3>
                <InfoHint
                  label="AI evidence signals"
                  how="Qualitative, explainable signals summarizing what the evidence supports. These replace predictive percentages (interview success, turnover risk, …), which were unvalidated AI guesses — Lumofy has no statistical model behind such predictions, so they are not shown."
                />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {signals.map((s) => (
                  <div key={s.label} className="relative rounded-xl bg-secondary/30 p-3 text-center">
                    <span className="absolute right-1 top-1">
                      <InfoHint label={s.label} how={s.how} why={s.why} whyLabel="Why this signal" />
                    </span>
                    <p className="px-5 text-[10px] text-muted-foreground">{s.label}</p>
                    <p className={`text-sm font-bold ${s.tone}`}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Score impact — what helped and hurt */}
          {(positives.length > 0 || risks.length > 0) && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Scale className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Score impact
                </h3>
                <InfoHint
                  label="Score impact"
                  how="The specific findings that pushed the score up or down, each with its source (CV, application form, or screening answers) and how strongly it moved the AI's scoring."
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className={`mb-2 text-xs font-semibold ${TONE_TEXT.success}`}>Helped the score</p>
                  <ul className="space-y-2">
                    {positives.map((p, i) => (
                      <li key={i} className="text-sm">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <Check className={`h-3 w-3 flex-shrink-0 ${TONE_TEXT.success}`} aria-hidden="true" />
                          <span className="font-medium">{p.signal}</span>
                          {p.impact && <span className={IMPACT_CHIP}>{p.impact} impact</span>}
                          {p.source && <span className={IMPACT_CHIP}>{p.source}</span>}
                        </span>
                        {p.reasoning && <p className="mt-0.5 pl-[18px] text-xs leading-relaxed text-muted-foreground">{p.reasoning}</p>}
                      </li>
                    ))}
                    {positives.length === 0 && <li className="text-xs text-muted-foreground">None identified</li>}
                  </ul>
                </div>
                <div>
                  <p className={`mb-2 text-xs font-semibold ${TONE_TEXT.warning}`}>Hurt the score</p>
                  <ul className="space-y-2">
                    {risks.map((r, i) => (
                      <li key={i} className="text-sm">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <AlertCircle className={`h-3 w-3 flex-shrink-0 ${TONE_TEXT.warning}`} aria-hidden="true" />
                          <span className="font-medium">{r.signal}</span>
                          {r.impact && <span className={IMPACT_CHIP}>{r.impact} impact</span>}
                          {r.source && <span className={IMPACT_CHIP}>{r.source}</span>}
                        </span>
                        {r.reasoning && <p className="mt-0.5 pl-[18px] text-xs leading-relaxed text-muted-foreground">{r.reasoning}</p>}
                        {r.verificationQuestion && (
                          <p className="mt-0.5 pl-[18px] text-xs leading-relaxed">
                            <span className={`font-semibold ${TONE_TEXT.warning}`}>Verify:</span>{" "}
                            <span className="text-foreground/90">{r.verificationQuestion}</span>
                          </p>
                        )}
                      </li>
                    ))}
                    {risks.length === 0 && <li className="text-xs text-muted-foreground">None identified</li>}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== 3 · Tabbed depth ===== */}
      <div className="rounded-2xl border border-border bg-card p-5 light-glow sm:p-6">
        <Tabs defaultValue="overview">
          <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl bg-secondary/50 p-1">
            <TabsTrigger value="overview" className="gap-1.5 whitespace-nowrap text-xs"><BookOpen className="h-3.5 w-3.5" aria-hidden="true" />Overview</TabsTrigger>
            <TabsTrigger value="skills" className="gap-1.5 whitespace-nowrap text-xs"><Target className="h-3.5 w-3.5" aria-hidden="true" />Skills</TabsTrigger>
            <TabsTrigger value="experience" className="gap-1.5 whitespace-nowrap text-xs"><Briefcase className="h-3.5 w-3.5" aria-hidden="true" />Experience &amp; Fit</TabsTrigger>
            <TabsTrigger value="evidence" className="gap-1.5 whitespace-nowrap text-xs"><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />Evidence &amp; Verify</TabsTrigger>
            <TabsTrigger value="interview" className="gap-1.5 whitespace-nowrap text-xs"><MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />Interview</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="mt-4 space-y-3">
            {ai.recommendationJustification && (
              <Field icon={<Zap className="h-3 w-3" />} label="Why this recommendation"><ExpandableText text={ai.recommendationJustification} /></Field>
            )}
            {ai.recruiterVerdict?.reasoning && (
              <Field icon={<Sparkles className="h-3 w-3" />} label="Recruiter verdict"><ExpandableText text={ai.recruiterVerdict.reasoning} /></Field>
            )}
            {ai.professionalIdentity && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-secondary/40 p-3">
                  <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Primary identity</p>
                  <p className="text-sm font-semibold">{ai.professionalIdentity.primary}</p>
                  {typeof ai.professionalIdentity.primaryConfidence === "number" && (
                    <p className="mt-0.5 text-xs text-primary-readable">{ai.professionalIdentity.primaryConfidence}% confidence</p>
                  )}
                </div>
                {ai.professionalIdentity.secondary && (
                  <div className="rounded-xl bg-secondary/40 p-3">
                    <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Secondary identity</p>
                    <p className="text-sm font-semibold">{ai.professionalIdentity.secondary}</p>
                    {typeof ai.professionalIdentity.secondaryConfidence === "number" && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{ai.professionalIdentity.secondaryConfidence}% confidence</p>
                    )}
                  </div>
                )}
              </div>
            )}
            {ai.careerTrackAnalysis && (
              <Field icon={<Route className="h-3 w-3" />} label="Career track analysis"><ExpandableText text={ai.careerTrackAnalysis} /></Field>
            )}
            {ai.departmentMatches?.length ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Department matches</p>
                <div className="space-y-2">
                  {ai.departmentMatches.map((d, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-32 flex-shrink-0 truncate text-sm font-medium sm:w-44" title={d.department}>{d.department}</span>
                      <Progress value={d.confidence} className="h-1.5 flex-1" />
                      <span className="w-9 flex-shrink-0 text-right text-xs tabular-nums text-muted-foreground">{d.confidence}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {ai.alternativesConsidered?.length ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Alternatives considered</p>
                <div className="flex flex-wrap gap-1.5">
                  {ai.alternativesConsidered.map((a, i) => (
                    <Badge key={i} variant="outline" className="text-[11px]">{a.role} · {a.confidence}%</Badge>
                  ))}
                </div>
              </div>
            ) : null}
            {ai.feedback && (
              <Field icon={<Lightbulb className="h-3 w-3" />} label="Final feedback"><ExpandableText text={ai.feedback} /></Field>
            )}
          </TabsContent>

          {/* Skills */}
          <TabsContent value="skills" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center gap-1.5 text-sm font-semibold"><Target className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Skills alignment</h4>
              <Badge variant="outline" className="text-xs">{ai.skillsCoveragePercent}% coverage</Badge>
            </div>
            {ai.skillsAlignment?.length > 0 ? (
              <div className="space-y-1.5">
                {ai.skillsAlignment.map((s, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl bg-secondary/30 p-2.5">
                    <div className="mt-0.5">{evidenceIcon(s.evidence)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{s.requiredSkill}</p>
                      <p className="text-xs text-muted-foreground">{s.detail}</p>
                    </div>
                    <Badge variant="outline" className="flex-shrink-0 text-[10px]">{s.evidence}</Badge>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">No skills alignment data.</p>}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-muted-foreground"><ThumbsUp className="h-3 w-3" /> Detected skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {ai.detectedSkills?.map((s, i) => <Badge key={i} variant="secondary" className={`border-0 text-[11px] ${TONE_SOFT.success}`}>{s}</Badge>)}
                  {!ai.detectedSkills?.length && <p className="text-xs text-muted-foreground">None detected</p>}
                </div>
              </div>
              <div>
                <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-muted-foreground"><ThumbsDown className="h-3 w-3" /> Missing skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {ai.missingSkills?.map((s, i) => <Badge key={i} variant="secondary" className="border-0 bg-destructive/10 text-[11px] text-destructive-readable">{s}</Badge>)}
                  {!ai.missingSkills?.length && <p className="text-xs text-muted-foreground">None missing</p>}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Experience & Fit */}
          <TabsContent value="experience" className="mt-4 space-y-3">
            {ai.experienceVerification && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-secondary/30 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total years</p>
                  <p className="mt-0.5 text-sm font-semibold">{ai.experienceVerification.totalYears}</p>
                </div>
                <div className="rounded-xl bg-secondary/30 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Seniority alignment</p>
                  <p className="mt-0.5 text-sm font-semibold">{ai.experienceVerification.seniorityAlignment}</p>
                </div>
                <div className="rounded-xl bg-secondary/30 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Industry relevance</p>
                  <p className="mt-0.5 text-sm font-semibold">{ai.experienceVerification.industryRelevance}</p>
                </div>
              </div>
            )}
            {ai.organizationalFit && <Field icon={<Building2 className="h-3 w-3" />} label="Organizational fit"><ExpandableText text={ai.organizationalFit} /></Field>}
            {ai.growthPotential && <Field icon={<TrendingUp className="h-3 w-3" />} label="Growth potential"><ExpandableText text={ai.growthPotential} /></Field>}
          </TabsContent>

          {/* Evidence & Verify */}
          <TabsContent value="evidence" className="mt-4 space-y-4">
            {checklist.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Verify before deciding</h4>
                <ul className="space-y-1.5">
                  {checklist.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 rounded-xl bg-secondary/30 p-2.5 text-sm">
                      <span className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${TONE_SOFT.warning}`}>{i + 1}</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {ai.redFlags && ai.redFlags.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><ShieldAlert className="h-3.5 w-3.5 text-destructive" aria-hidden="true" /> Red flags</h4>
                <div className="flex flex-wrap gap-2">
                  {ai.redFlags.map((f, i) => (
                    <Badge key={i} variant="secondary" className="border border-destructive/20 bg-destructive/10 text-xs text-destructive-readable">{f}</Badge>
                  ))}
                </div>
              </div>
            )}
            {(ai.evidenceFor?.length || ai.evidenceAgainst?.length) ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className={`mb-2 text-xs font-semibold ${TONE_TEXT.success}`}>Evidence for</p>
                  <ul className="space-y-1.5">
                    {(ai.evidenceFor || []).map((e, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-sm"><Check className={`mt-0.5 h-3 w-3 flex-shrink-0 ${TONE_TEXT.success}`} aria-hidden="true" />{e}</li>
                    ))}
                    {!ai.evidenceFor?.length && <li className="text-xs text-muted-foreground">None noted</li>}
                  </ul>
                </div>
                <div>
                  <p className={`mb-2 text-xs font-semibold ${TONE_TEXT.warning}`}>Evidence against</p>
                  <ul className="space-y-1.5">
                    {(ai.evidenceAgainst || []).map((e, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-sm"><AlertCircle className={`mt-0.5 h-3 w-3 flex-shrink-0 ${TONE_TEXT.warning}`} aria-hidden="true" />{e}</li>
                    ))}
                    {!ai.evidenceAgainst?.length && <li className="text-xs text-muted-foreground">None noted</li>}
                  </ul>
                </div>
              </div>
            ) : null}
            {ai.evidenceCitations?.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Quote className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Evidence used (quoted from the CV)</h4>
                <div className="space-y-1.5">
                  {ai.evidenceCitations.map((e, i) => (
                    <p key={i} className="rounded-xl border-l-2 border-primary/30 bg-secondary/30 p-2.5 text-sm italic text-muted-foreground">"{e}"</p>
                  ))}
                </div>
              </div>
            )}
            {checklist.length === 0 && !ai.redFlags?.length && !ai.evidenceCitations?.length && !ai.evidenceFor?.length && !ai.evidenceAgainst?.length && (
              <p className="text-sm text-muted-foreground">No verification items or evidence citations recorded.</p>
            )}
          </TabsContent>

          {/* Interview */}
          <TabsContent value="interview" className="mt-4 space-y-4">
            {guideGroups ? (
              Object.entries(guideGroups).map(([cat, qs]) => (
                <div key={cat}>
                  <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><MessageSquare className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> {cat}</h4>
                  <ol className="space-y-2.5">
                    {qs.map((q, i) => (
                      <li key={i} className="flex gap-2.5 text-sm">
                        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary-readable">{i + 1}</span>
                        <span className="min-w-0 pt-0.5">
                          {q.question}
                          {q.whyAsk && <span className="mt-0.5 block text-xs italic text-muted-foreground">Why: {q.whyAsk}</span>}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))
            ) : (
              <>
                <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><MessageSquare className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Interview questions to ask</h4>
                {ai.interviewQuestions?.length > 0 ? (
                  <ol className="space-y-2">
                    {ai.interviewQuestions.map((q, i) => (
                      <li key={i} className="flex gap-2.5 text-sm">
                        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary-readable">{i + 1}</span>
                        <span className="pt-0.5">{q}</span>
                      </li>
                    ))}
                  </ol>
                ) : <p className="text-sm text-muted-foreground">No questions suggested.</p>}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Disclaimer */}
      {ai.analyzedAt && (
        <div className="flex items-start gap-2 px-1">
          <Shield className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="text-[11px] text-muted-foreground">
            AI analysis is a support tool only; the hiring decision stays with HR. Analyzed {new Date(ai.analyzedAt).toLocaleString()}.
          </p>
        </div>
      )}
    </motion.div>
  );
}
