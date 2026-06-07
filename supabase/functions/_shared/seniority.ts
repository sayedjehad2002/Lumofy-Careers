// Shared seniority inference + AI calibration for the evaluative AI edge functions.
//
// The role's level is understood from the JOB TITLE *and* the JOB DESCRIPTION
// together (with requirements + employment type as extra signals), then turned into
// calibration instructions that make the AI's strictness match the role:
//   Intern → lenient / coaching ............. Lead → strict + leadership bar.
//
// Two layers, on purpose:
//   1. inferSeniority(...)   — a fast, deterministic HINT from title/description.
//   2. the calibration block — tells the model to RE-READ the title + full
//      description and, if they clearly disagree with the hint, calibrate to what
//      the title + description actually describe. So the final judgment is always
//      ALIGNED with the real job context, even when the keyword hint is imperfect.
//
// Used by:
//   • ai-job-assist          (generation — tone & difficulty of generated content)
//   • analyze-cv             (scoring)
//   • auto-analyze-applicant (scoring)
//   • cv-library-analyze     (scoring)
//
// Left NEUTRAL on purpose: cv-library-parse, cv-library-classify, transcribe-audio.
// Reading / extracting / transcribing a document must stay faithful regardless of the
// role level — calibration belongs only in EVALUATION and GENERATION, never parsing.

export type Seniority = "Intern" | "Junior" | "Mid" | "Senior" | "Lead";

// Infer a seniority bucket from title + description (+ requirements / employment type).
// `title` may also be an explicit level string (e.g. a future dropdown's "Senior") —
// keyword matching normalizes both. Title is the strongest signal; the description and
// requirements supply experience-year and entry-level signals when the title is neutral.
export function inferSeniority(
  title?: string | null,
  requirements?: unknown,
  employmentType?: string | null,
  description?: string | null,
): Seniority {
  const t = String(title || "").toLowerCase();

  // 1) Title — strongest signal (most senior first).
  if (/\b(chief|cto|ceo|cfo|coo|vp|vice[- ]president|head\s+of|head|director|principal|staff|lead|manager|mgr)\b/.test(t)) {
    return "Lead";
  }
  if (/\b(senior|sr\.?|expert|specialist\s+ii|ii\b|iii\b)\b/.test(t)) return "Senior";
  if (/\b(intern|internship|trainee|graduate|grad|apprentice|placement)\b/.test(t)) return "Intern";
  if (/\b(junior|jr\.?|associate|entry[- ]?level|entry|assistant)\b/.test(t)) return "Junior";

  // 2) Employment type fallback (Internship → Intern).
  if (String(employmentType || "").toLowerCase().includes("intern")) return "Intern";

  const d = String(description || "").toLowerCase();

  // 3) Explicit entry-level phrasing in the description (used only when the title was
  //    neutral; kept conservative to avoid false positives like "work with seniors").
  if (/\b(no experience required|no prior experience|fresh graduate|entry[- ]level|internship)\b/.test(d)) {
    return "Intern";
  }

  // 4) Years-of-experience signal from requirements + description combined.
  const reqText =
    (Array.isArray(requirements) ? requirements.join(" ")
      : typeof requirements === "string" ? requirements : "") + " " + d;
  const m = reqText.toLowerCase().match(/(\d{1,2})\s*\+?\s*years?/);
  if (m) {
    const yrs = parseInt(m[1], 10);
    if (yrs <= 1) return "Junior";
    if (yrs <= 4) return "Mid";
    if (yrs <= 7) return "Senior";
    return "Lead";
  }

  // 5) No signal → standard bar.
  return "Mid";
}

// The strictness scale, shared so the model can RE-ALIGN if the hint disagrees with
// the actual title + description.
const ANALYSIS_SCALE =
`- Intern: lenient (~45-65); reward potential, coursework, and attitude; do NOT expect full-time experience; coaching tone.
- Junior: ~50-70; foundational skills + ~0-2 years; moderate (not heavy) penalties.
- Mid: ~55-75; ~3-5 years; standard strictness.
- Senior: strict (~60-80); ~5-8 years; penalize shallow experience or no ownership.
- Lead/Manager: strict + leadership bar; 8+ years; penalize missing people/strategic leadership.`;

// Calibration block for SCORING / ANALYSIS prompts. Drops in near the scoring rules.
// It states the hinted level, then forces the model to confirm alignment against the
// title + full job description before judging — so scoring is always tied to the real role.
export function analysisCalibration(level: Seniority): string {
  return `SENIORITY CALIBRATION (this REPLACES any other "average should score X-Y" guidance in these instructions):
Based on the job title, this looks like a ${level} role. FIRST, read the JOB TITLE together with the FULL JOB DESCRIPTION, RESPONSIBILITIES, and REQUIREMENTS (where provided) and confirm the role's TRUE seniority — the title + description are the source of truth. If they clearly indicate a different level than ${level}, calibrate to the level they actually describe. Then evaluate the candidate STRICTLY RELATIVE TO that level:
${ANALYSIS_SCALE}
Keep the score, strengths/gaps, and recommendation consistent with the role's level and the rest of the job context.`;
}

const GENERATION_SCALE =
`- Intern: warm, encouraging; 0-1 years; emphasize learning & fundamentals; modest requirements; simple screening.
- Junior: entry level; ~1-2 years; achievable requirements; fundamentals-focused screening.
- Mid: balanced, professional; ~3-5 years; standard requirements; moderately challenging screening.
- Senior: high bar; ~5-8 years; real depth/specialization; rigorous screening.
- Lead/Manager: leadership & strategy; 8+ years; leadership/stakeholder scope; people-management screening.`;

// Calibration block for the GENERATION prompts (ai-job-assist). Shapes tone, the
// experience bar, and difficulty so generated content is aligned with the role.
export function generationCalibration(level: Seniority): string {
  return `ROLE LEVEL & ALIGNMENT: based on the job title this looks like a ${level} role. Read the job title together with any provided summary/description/context, and make the generated content's seniority, tone, experience bar, and difficulty consistent with the ACTUAL role described — if the title + context clearly indicate a different level than ${level}, follow what they describe. Level scale:
${GENERATION_SCALE}
Ensure the output is internally aligned with the role's level and consistent with the rest of the job details provided.`;
}
