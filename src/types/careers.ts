export interface AIScoringWeights {
  skills: number;
  tools: number;
  experience: number;
  industry: number;
  education: number;
  stability: number;
}

export const DEFAULT_AI_WEIGHTS: AIScoringWeights = {
  skills: 35,
  tools: 25,
  experience: 20,
  industry: 10,
  education: 5,
  stability: 5,
};

export interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  status: "open" | "closed";
  summary: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  salaryRange?: string;
  salaryCurrency?: "BHD" | "USD";
  postedDate: string;
  deadline?: string;
  screeningQuestions: ScreeningQuestion[];
  jdFileName?: string;
  jdFilePath?: string;
  jdFileSize?: number;
  jdFileUploadedAt?: string;
  aiScoringWeights?: AIScoringWeights;
  /** Set when the job is archived (soft-deleted) — hidden from the public site, kept in the dashboard. */
  archivedAt?: string;
}

export interface ScreeningQuestion {
  id: string;
  question: string;
  type: "short_text" | "long_text" | "multiple_choice" | "yes_no" | "number";
  options?: string[];
  required: boolean;
}

export type ApplicantStatus = "new" | "reviewing" | "shortlisted" | "interview" | "rejected" | "hired";

export interface Applicant {
  id: string;
  jobId: string;
  /** Title of the job at apply time — survives job edits/deletes. */
  jobTitle?: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  nationality?: string;
  linkedin?: string;
  portfolio?: string;
  coverLetter?: string;
  cvFileName: string;
  cvStoragePath?: string;
  cvFileType?: string;
  cvFileSize?: number;
  screeningAnswers: Record<string, string>;
  status: ApplicantStatus;
  appliedDate: string;
  notes: string[];
  rating?: CandidateRating;
  aiAnalysis?: AIAnalysis;
  stageEnteredAt?: string;
}

export const STAGE_SLA_DAYS: Record<string, number> = {
  new: 3,
  reviewing: 7,
  shortlisted: 5,
  interview: 5,
};

export interface CandidateRating {
  communication: number;
  roleFit: number;
  technicalSkills: number;
  cultureFit: number;
  overallRecommendation: number;
}

export interface SkillAlignment {
  requiredSkill: string;
  evidence: "Yes" | "Partial" | "No";
  detail: string;
}

export interface ExperienceVerification {
  totalYears: string;
  seniorityAlignment: string;
  industryRelevance: string;
}

export interface AIScoreBreakdown {
  skillsMatch: number;
  toolsMatch: number;
  relevantExperience: number;
  industryAlignment: number;
  educationRelevance: number;
  careerStability: number;
}

export interface AIAnalysis {
  fitScore: number;
  fitLevel: "Strong Fit" | "Moderate Fit" | "Low Fit";
  summary: string;
  strengths: string[];
  gaps: string[];
  interviewQuestions: string[];
  confidence: "High" | "Medium" | "Low";
  feedback: string;
  analyzedAt: string;
  // Enhanced evidence-based fields
  cvParsingStatus: "success" | "partial" | "failed";
  skillsAlignment: SkillAlignment[];
  skillsCoveragePercent: number;
  detectedSkills: string[];
  missingSkills: string[];
  experienceVerification: ExperienceVerification;
  riskIndicators: string[];
  organizationalFit: string;
  growthPotential: string;
  evidenceCitations: string[];
  recommendation: "Fast-Track to Interview" | "Proceed to Next Stage" | "Hold for Review" | "Not Recommended";
  recommendationJustification: string;
  // Weighted scoring breakdown
  scoreBreakdown?: AIScoreBreakdown;
  rankingTier?: "Top Match" | "Strong Match" | "Moderate Match" | "Weak Match";
  redFlags?: string[];
  interviewSuccessProbability?: number;
  offerAcceptanceProbability?: number;
  earlyTurnoverRisk?: number;
  growthPotentialScore?: number;
  // Score transparency (newer analyses) — the exact weights the analysis was
  // scored with (echoed server-side) + evidence per number.
  weightsUsed?: AIScoringWeights;
  /** v1 transparency: one-sentence rationale per dimension (superseded by scoreExplanations). */
  scoreRationale?: Partial<Record<keyof AIScoreBreakdown, string>>;
  /** @deprecated predictive-probability rationale — no longer generated or rendered. */
  insightRationale?: { interviewSuccess?: string; offerAcceptance?: string; earlyTurnoverRisk?: string; growthPotential?: string };
  // v2 explainability (AI Hiring Intelligence) — all optional; old analyses fall back.
  scoreExplanations?: Partial<Record<keyof AIScoreBreakdown, { evidence?: string; missing?: string; reasoning?: string }>>;
  evidenceQuality?: { level?: string; reasoning?: string };
  positiveSignals?: { signal: string; source?: string; impact?: string; reasoning?: string }[];
  riskSignals?: { signal: string; source?: string; impact?: string; reasoning?: string; verificationQuestion?: string }[];
  verificationChecklist?: string[];
  interviewGuide?: { category?: string; question: string; whyAsk?: string }[];
  // Recruiter-grade fields (Phase 3) — optional; older analyses won't have them.
  professionalIdentity?: { primary: string; primaryConfidence: number; secondary: string; secondaryConfidence: number; keyIdentity: string };
  recruiterVerdict?: { shortlistFor: string; reasoning: string };
  careerTrackAnalysis?: string;
  evidenceFor?: string[];
  evidenceAgainst?: string[];
  alternativesConsidered?: { role: string; confidence: number }[];
}

export const APPLICANT_STATUSES: { value: ApplicantStatus; label: string; color: string }[] = [
  { value: "new", label: "New", color: "bg-blue-500/20 text-blue-400" },
  { value: "reviewing", label: "Reviewing", color: "bg-yellow-500/20 text-yellow-400" },
  { value: "shortlisted", label: "Shortlisted", color: "bg-emerald-500/20 text-emerald-400" },
  { value: "interview", label: "Interview", color: "bg-purple-500/20 text-purple-400" },
  { value: "rejected", label: "Rejected", color: "bg-red-500/20 text-red-400" },
  { value: "hired", label: "Hired", color: "bg-green-500/20 text-green-400" },
];
