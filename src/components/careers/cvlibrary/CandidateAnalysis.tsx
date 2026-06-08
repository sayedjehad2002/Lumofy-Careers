import { useState } from "react";
import {
  Brain, Loader2, Target, Zap, BookOpen, Star, Briefcase, AlertTriangle,
  TrendingUp, MessageSquare, Quote, Check, AlertCircle, X, UserPlus,
  Lightbulb, Shield, Building2, ThumbsUp, ThumbsDown, Sparkles, Route,
} from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TONE_SOFT, TONE_TEXT, TONE_BORDER, scoreTone, type Tone } from "../statusColors";

/**
 * The CV Library AI analysis shape. Exported as the single source of truth so
 * CVLibrary (and any future consumer) imports it from here.
 * The recruiter-grade fields (professionalIdentity … recruiterVerdict) are
 * optional — older analyses won't have them.
 */
export interface CVAIAnalysis {
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
        <button onClick={() => setOpen((o) => !o)} className="mt-1.5 text-xs font-semibold text-primary hover:underline">
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

  const hasIdentity = ai.professionalIdentity || ai.recruiterVerdict || ai.careerTrackAnalysis ||
    ai.evidenceFor?.length || ai.evidenceAgainst?.length || ai.alternativesConsidered?.length || ai.departmentMatches?.length;

  return (
    <motion.div
      className="space-y-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* ===== Score hero — verdict at a glance ===== */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 light-glow sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <ScoreGauge score={ai.fitScore} />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fit verdict</span>
              {ai.fitLevel && (
                <span className={`text-sm font-bold ${FIT_TEXT[ai.fitLevel] || "text-foreground"}`}>{ai.fitLevel}</span>
              )}
              {ai.recommendation && (
                <Badge className={`border text-xs ${REC_SOFT[ai.recommendation] || "bg-secondary text-foreground"}`}>
                  {ai.recommendation}
                </Badge>
              )}
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Skills coverage</span>
                <span className="font-semibold tabular-nums">{ai.skillsCoveragePercent}%</span>
              </div>
              <Progress value={ai.skillsCoveragePercent} className="h-2" />
            </div>
            {ai.recruiterVerdict?.shortlistFor && (
              <p className="flex items-start gap-1.5 text-sm">
                <Target className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" aria-hidden="true" />
                <span><span className="font-semibold text-primary">Shortlist for:</span> {ai.recruiterVerdict.shortlistFor}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ===== Professional identity & recruiter verdict ===== */}
      {hasIdentity && (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5 light-glow sm:p-6">
          <h3 className="flex items-center gap-2 font-semibold">
            <UserPlus className="h-4 w-4 text-primary" aria-hidden="true" /> Professional identity
          </h3>

          {ai.professionalIdentity?.keyIdentity && (
            <p className="border-l-2 border-primary/40 pl-3 text-sm italic text-foreground/90">"{ai.professionalIdentity.keyIdentity}"</p>
          )}

          {ai.professionalIdentity && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-secondary/40 p-3">
                <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Primary identity</p>
                <p className="text-sm font-semibold">{ai.professionalIdentity.primary}</p>
                {typeof ai.professionalIdentity.primaryConfidence === "number" && (
                  <p className="mt-0.5 text-xs text-primary">{ai.professionalIdentity.primaryConfidence}% confidence</p>
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

          {ai.recruiterVerdict?.reasoning && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Recruiter verdict
              </p>
              <p className="text-sm">{ai.recruiterVerdict.reasoning}</p>
            </div>
          )}
        </div>
      )}

      {/* ===== Tabbed depth ===== */}
      <div className="rounded-2xl border border-border bg-card p-5 light-glow sm:p-6">
        <Tabs defaultValue="overview">
          <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl bg-secondary/50 p-1">
            <TabsTrigger value="overview" className="gap-1.5 whitespace-nowrap text-xs"><BookOpen className="h-3.5 w-3.5" aria-hidden="true" />Overview</TabsTrigger>
            <TabsTrigger value="skills" className="gap-1.5 whitespace-nowrap text-xs"><Target className="h-3.5 w-3.5" aria-hidden="true" />Skills</TabsTrigger>
            <TabsTrigger value="experience" className="gap-1.5 whitespace-nowrap text-xs"><Briefcase className="h-3.5 w-3.5" aria-hidden="true" />Experience &amp; Fit</TabsTrigger>
            <TabsTrigger value="risk" className="gap-1.5 whitespace-nowrap text-xs"><AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />Risk</TabsTrigger>
            <TabsTrigger value="interview" className="gap-1.5 whitespace-nowrap text-xs"><MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />Interview</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="mt-4 space-y-3">
            {ai.summary && <Field icon={<BookOpen className="h-3 w-3" />} label="Candidate summary"><ExpandableText text={ai.summary} /></Field>}
            {ai.recommendationJustification && (
              <Field icon={<Zap className="h-3 w-3" />} label="Why this recommendation"><ExpandableText text={ai.recommendationJustification} /></Field>
            )}
            {ai.careerTrackAnalysis && (
              <Field icon={<Route className="h-3 w-3" />} label="Career track analysis"><ExpandableText text={ai.careerTrackAnalysis} /></Field>
            )}
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
                  {ai.missingSkills?.map((s, i) => <Badge key={i} variant="secondary" className="border-0 bg-destructive/10 text-[11px] text-destructive">{s}</Badge>)}
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field icon={<Star className="h-3 w-3" />} label="Strengths">
                <ul className="space-y-1.5">
                  {ai.strengths?.map((s, i) => <li key={i} className="flex items-start gap-1.5 text-sm"><Check className={`mt-0.5 h-3 w-3 flex-shrink-0 ${TONE_TEXT.success}`} aria-hidden="true" />{s}</li>)}
                  {!ai.strengths?.length && <li className="text-xs text-muted-foreground">None identified</li>}
                </ul>
              </Field>
              <Field icon={<AlertCircle className="h-3 w-3" />} label="Gaps">
                <ul className="space-y-1.5">
                  {ai.gaps?.map((g, i) => <li key={i} className="flex items-start gap-1.5 text-sm"><AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-destructive" aria-hidden="true" />{g}</li>)}
                  {!ai.gaps?.length && <li className="text-xs text-muted-foreground">None identified</li>}
                </ul>
              </Field>
            </div>
            {ai.organizationalFit && <Field icon={<Building2 className="h-3 w-3" />} label="Organizational fit"><ExpandableText text={ai.organizationalFit} /></Field>}
            {ai.growthPotential && <Field icon={<TrendingUp className="h-3 w-3" />} label="Growth potential"><ExpandableText text={ai.growthPotential} /></Field>}
          </TabsContent>

          {/* Risk */}
          <TabsContent value="risk" className="mt-4 space-y-4">
            <div>
              <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><AlertTriangle className={`h-3.5 w-3.5 ${TONE_TEXT.warning}`} aria-hidden="true" /> Hiring risk indicators</h4>
              {ai.riskIndicators?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {ai.riskIndicators.map((r, i) => (
                    <Badge key={i} variant="secondary" className={`text-xs ${TONE_SOFT.warning} border ${TONE_BORDER.warning}`}>{r}</Badge>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">No risk indicators found.</p>}
            </div>
            {ai.evidenceCitations?.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Quote className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Evidence from the CV</h4>
                <div className="space-y-1.5">
                  {ai.evidenceCitations.map((e, i) => (
                    <p key={i} className="rounded-xl border-l-2 border-primary/30 bg-secondary/30 p-2.5 text-sm italic text-muted-foreground">"{e}"</p>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Interview */}
          <TabsContent value="interview" className="mt-4">
            <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><MessageSquare className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Interview questions to ask</h4>
            {ai.interviewQuestions?.length > 0 ? (
              <ol className="space-y-2">
                {ai.interviewQuestions.map((q, i) => (
                  <li key={i} className="flex gap-2.5 text-sm">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">{i + 1}</span>
                    <span className="pt-0.5">{q}</span>
                  </li>
                ))}
              </ol>
            ) : <p className="text-sm text-muted-foreground">No questions suggested.</p>}
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
