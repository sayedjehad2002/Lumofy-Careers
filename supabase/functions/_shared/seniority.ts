// Shared seniority inference + AI calibration for the evaluative AI edge functions.
//
// Jobs have no explicit seniority field, so we INFER the level from the job title
// (with the requirements text and employment type as fallback signals) and turn it
// into calibration instructions that make the AI's strictness match the role:
//   Intern → lenient / coaching ............. Lead → strict + leadership bar.
//
// Used by:
//   • ai-job-assist        (generation — tone & difficulty of generated content)
//   • analyze-cv           (scoring)
//   • auto-analyze-applicant (scoring)
//   • cv-library-analyze   (scoring)
//
// Left NEUTRAL on purpose: cv-library-parse, cv-library-classify, transcribe-audio.
// Reading / extracting / transcribing a document must stay faithful regardless of the
// role level — calibration belongs only in EVALUATION and GENERATION, never in parsing.
//
// These are heuristics, not ground truth. They are intentionally conservative and
// default to "Mid" when no signal is found. (A future explicit HR "Seniority" field
// can override this — pass the chosen level straight into inferSeniority's first arg.)

export type Seniority = "Intern" | "Junior" | "Mid" | "Senior" | "Lead";

// Infer a seniority bucket. `title` may also be an explicit level string (e.g. the
// "Senior" value from a future dropdown) — keyword matching normalizes both.
// Order matters: the most senior signals are checked first.
export function inferSeniority(
  title?: string | null,
  requirements?: unknown,
  employmentType?: string | null,
): Seniority {
  const t = String(title || "").toLowerCase();

  // 1) Strong title / level-string signals (most senior first).
  if (/\b(chief|cto|ceo|cfo|coo|vp|vice[- ]president|head\s+of|head|director|principal|staff|lead|manager|mgr)\b/.test(t)) {
    return "Lead";
  }
  if (/\b(senior|sr\.?|expert|specialist\s+ii|ii\b|iii\b)\b/.test(t)) return "Senior";
  if (/\b(intern|internship|trainee|graduate|grad|apprentice|placement)\b/.test(t)) return "Intern";
  if (/\b(junior|jr\.?|associate|entry[- ]?level|entry|assistant)\b/.test(t)) return "Junior";

  // 2) Employment type fallback (Internship → Intern).
  if (String(employmentType || "").toLowerCase().includes("intern")) return "Intern";

  // 3) Years-of-experience signal pulled from the requirements text (e.g. "5+ years").
  const reqText = Array.isArray(requirements)
    ? requirements.join(" ")
    : (typeof requirements === "string" ? requirements : "");
  const m = reqText.toLowerCase().match(/(\d{1,2})\s*\+?\s*years?/);
  if (m) {
    const yrs = parseInt(m[1], 10);
    if (yrs <= 1) return "Junior";
    if (yrs <= 4) return "Mid";
    if (yrs <= 7) return "Senior";
    return "Lead";
  }

  // 4) No signal → standard bar.
  return "Mid";
}

// Calibration block for SCORING / ANALYSIS prompts. Sets the baseline score band,
// experience expectation, and tone so the same candidate is judged appropriately for
// the role's level. The opening line makes it OVERRIDE any static band already in the
// host prompt, so callers only need to drop this string in near the scoring rules.
export function analysisCalibration(level: Seniority): string {
  const bands: Record<Seniority, string> = {
    Intern:
`- Typical candidates should land ~45-65; a promising student / fresh graduate with relevant coursework, projects, or genuine enthusiasm can score 60+.
- Do NOT expect prior full-time experience. Reward potential, learning trajectory, foundational knowledge, and attitude.
- Apply only LIGHT penalties for missing advanced tools or years; frame gaps as development areas, not disqualifiers. Use a supportive, coaching tone.`,
    Junior:
`- Typical candidates should land ~50-70. Expect foundational skills and roughly 0-2 years of experience.
- Reward solid fundamentals and growth trajectory; apply MODERATE (not heavy) penalties for missing advanced or senior-only skills.`,
    Mid:
`- Typical candidates should land ~55-75. Expect ~3-5 years of relevant experience and the ability to deliver independently.
- Apply standard strictness: penalize missing core skills, reward clear specialization.`,
    Senior:
`- Typical candidates should land ~60-80, and ONLY for genuinely strong profiles. Expect ~5-8 years of depth and demonstrated ownership.
- Penalize HEAVILY for shallow experience, no end-to-end ownership, or only basic skills. Do not reward seniority titles that lack substance.`,
    Lead:
`- Typical candidates should land ~60-80, and ONLY with clear leadership evidence. Expect 8+ years plus demonstrated people/technical leadership and strategic impact.
- Penalize HEAVILY for missing team leadership, mentoring, cross-functional, or strategic experience — even when individual-contributor skills are strong.`,
  };
  return `SENIORITY CALIBRATION — ${level.toUpperCase()} ROLE (this REPLACES any other "average should score X-Y" guidance in these instructions; judge strictly RELATIVE TO THIS LEVEL, not in absolute terms):
${bands[level]}`;
}

// Calibration block for the GENERATION prompts (ai-job-assist). Shapes tone, the
// experience bar, and the difficulty of generated job content / screening questions
// to match the role level.
export function generationCalibration(level: Seniority): string {
  const guidance: Record<Seniority, string> = {
    Intern:
`Write warm, encouraging, accessible content. Expect 0-1 years of experience (or none) and emphasize learning, mentorship, curiosity, and fundamentals. Keep requirements modest and avoid an intimidating "must-have" wall. Screening questions must assess fundamentals, attitude, and willingness to learn — NOT deep production experience.`,
    Junior:
`Pitch at entry level. Expect ~1-2 years and foundational skills. Keep requirements achievable; screening questions should probe core fundamentals and growth potential.`,
    Mid:
`Use a balanced, professional tone. Expect ~3-5 years and independent delivery. Use standard requirements and moderately challenging screening questions.`,
    Senior:
`Set a high bar. Expect ~5-8 years, advanced skills, and ownership. Requirements should reflect real depth and specialization; screening questions should be rigorous and probe genuine technical and decision-making depth.`,
    Lead:
`Emphasize leadership, strategy, and impact. Expect 8+ years plus demonstrated people/technical leadership. Requirements should include leadership and stakeholder scope; screening questions should probe people management, strategic thinking, and cross-functional influence.`,
  };
  return `ROLE LEVEL — ${level.toUpperCase()}: ${guidance[level]}`;
}
