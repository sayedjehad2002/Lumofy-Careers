// Shared department/role taxonomy — the SINGLE source of truth for how candidates
// are organized into folders in the CV Library. Used by:
//   - cv-library-classify  (fast first-pass classification from extracted text)
//   - cv-library-analyze   (deep PDF analysis; its departmentMatches are constrained
//                           to these names, and classification is SYNCED from it)
//   - cv-library-manage    (the zero-AI-call "sync-classification" backfill)
// Keep the department names in sync with the frontend's DEPARTMENTS lists
// (src/components/careers/CVLibrary.tsx, JobFormModal.tsx).

export const TAXONOMY = {
  "Human Resources": ["HR Manager", "HR Business Partner", "Recruiter", "Talent Acquisition Specialist", "HR Coordinator", "Compensation & Benefits Analyst", "Learning & Development Specialist", "People Analytics Specialist", "Organizational Development Specialist"],
  "Customer Success": ["Customer Success Manager", "Senior CSM", "Customer Success Lead", "Onboarding Specialist", "Customer Support Lead", "Renewals Manager"],
  "Account Management": ["Account Manager", "Key Account Manager", "Strategic Account Manager", "Client Partner", "Relationship Manager"],
  "Client Services": ["Client Services Manager", "Client Relations Manager", "Engagement Manager", "Service Delivery Manager"],
  "Customer Experience": ["Customer Experience Manager", "CX Specialist", "Voice of Customer Analyst", "Customer Insights Manager"],
  "Sales": ["Account Executive", "Sales Development Rep", "Sales Engineer", "Regional Sales Manager", "VP Sales", "Business Development Manager"],
  "Revenue Operations": ["Revenue Operations Manager", "Sales Operations Analyst", "RevOps Analyst", "GTM Operations Manager"],
  "Product": ["Product Manager", "Senior Product Manager", "Product Owner", "Product Analyst", "UX Researcher"],
  "Engineering": ["Full Stack Developer", "Backend Engineer", "Frontend Engineer", "Mobile Developer", "DevOps Engineer", "QA Engineer", "Engineering Manager", "Data Engineer", "Machine Learning Engineer"],
  "Data & Analytics": ["Data Analyst", "Data Scientist", "Business Intelligence Analyst", "Analytics Engineer", "Quantitative Analyst"],
  "Marketing": ["Marketing Manager", "Digital Marketing Specialist", "Content Strategist", "Brand Manager", "SEO Specialist", "Growth Marketing Manager"],
  "Finance": ["Financial Analyst", "Accountant", "Finance Manager", "Controller", "Treasury Analyst", "Auditor"],
  "Operations": ["Operations Manager", "Supply Chain Analyst", "Business Analyst", "Process Improvement Specialist", "Logistics Coordinator"],
  "Project Management": ["Project Manager", "Program Manager", "Scrum Master", "PMO Analyst", "Delivery Manager"],
  "Design": ["UI/UX Designer", "Graphic Designer", "Product Designer", "Visual Designer", "Design Lead"],
  "Professional Services": ["Professional Services Manager", "Solutions Consultant", "Implementation Manager", "Service Delivery Lead", "Onboarding Consultant", "Technical Account Manager"],
};

export const DEPARTMENTS = Object.keys(TAXONOMY);

// Common non-taxonomy names the models produce (especially legacy analyses written
// before departmentMatches was constrained) mapped onto the canonical departments,
// so folders never fragment into near-duplicates.
const ALIASES: Record<string, string> = {
  "hr": "Human Resources",
  "people": "Human Resources",
  "people & culture": "Human Resources",
  "talent acquisition": "Human Resources",
  "recruitment": "Human Resources",
  "it": "Engineering",
  "information technology": "Engineering",
  "technology": "Engineering",
  "software": "Engineering",
  "software engineering": "Engineering",
  "software development": "Engineering",
  "development": "Engineering",
  "cybersecurity": "Engineering",
  "security": "Engineering",
  "analytics": "Data & Analytics",
  "data": "Data & Analytics",
  "data science": "Data & Analytics",
  "business intelligence": "Data & Analytics",
  "customer service": "Customer Success",
  "customer support": "Customer Success",
  "support": "Customer Success",
  "client success": "Customer Success",
  "account management & sales": "Account Management",
  "business development": "Sales",
  "sales & business development": "Sales",
  "revenue": "Revenue Operations",
  "revops": "Revenue Operations",
  "pmo": "Project Management",
  "program management": "Project Management",
  "delivery": "Project Management",
  "ux": "Design",
  "ui/ux": "Design",
  "creative": "Design",
  "product design": "Design",
  "product management": "Product",
  "growth": "Marketing",
  "communications": "Marketing",
  "content": "Marketing",
  "accounting": "Finance",
  "supply chain": "Operations",
  "logistics": "Operations",
  "administration": "Operations",
  "consulting": "Professional Services",
  "implementation": "Professional Services",
};

// Snap a model-produced department name onto the canonical taxonomy:
// exact (case-insensitive) -> alias -> substring containment -> raw as last resort
// (a raw name still folders meaningfully instead of dropping the candidate into
// Unclassified). Returns null only for empty input.
export function normalizeDepartment(raw: unknown): string | null {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return null;
  const lower = s.toLowerCase();
  const exact = DEPARTMENTS.find((d) => d.toLowerCase() === lower);
  if (exact) return exact;
  if (ALIASES[lower]) return ALIASES[lower];
  const partial = DEPARTMENTS.find(
    (d) => d.toLowerCase().includes(lower) || lower.includes(d.toLowerCase()),
  );
  return partial || s;
}

// Map a model confidence onto the classification badge scale. Accepts 0-100
// numerics, "85%"-style strings, and textual High/Medium/Low (model drift).
export function scoreToConfidence(n: unknown): "High" | "Medium" | "Low" {
  if (typeof n === "string") {
    const t = n.trim().toLowerCase();
    if (t === "high") return "High";
    if (t === "medium" || t === "med") return "Medium";
    if (t === "low") return "Low";
    n = t.replace(/%$/, "");
  }
  const v = Number(n);
  if (!Number.isFinite(v)) return "Low";
  return v >= 75 ? "High" : v >= 50 ? "Medium" : "Low";
}

// Junk strings a model may emit instead of a real candidate name. Writing these
// as the name would permanently block the filename fallback AND the
// "unnamed" re-parse scope (the never-overwrite rule would then protect junk).
const JUNK_NAMES = new Set([
  "null", "none", "unknown", "n/a", "na", "not provided", "not available",
  "not mentioned", "not found", "candidate", "the candidate", "-", "--", "unnamed",
]);

// Validate a model-supplied candidate name: real names only, never junk.
export function sanitizeCandidateName(raw: unknown): string | null {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s || s.length > 80) return null;
  if (JUNK_NAMES.has(s.toLowerCase())) return null;
  if (!/\p{L}/u.test(s)) return null; // must contain at least one letter
  return s;
}

// Derive the 8 classification columns from a stored ai_analysis object — the
// alignment core. The analysis reads the raw PDF, so whenever it exists it is
// strictly better informed than a classification computed from (possibly empty)
// extracted text; callers overwrite the suggested_*/classification_* columns with
// this result. Returns NULL when the analysis has nothing usable (unreadable
// marker, or no departmentMatches) — callers must then write NOTHING, so an
// existing classification is never nulled out. Never touches manual_* columns.
export function deriveClassificationFromAnalysis(
  a: Record<string, any> | null | undefined,
): Record<string, unknown> | null {
  if (!a || a.unreadable === true) return null;
  // Order matches best-first ourselves — no prompt version guarantees the model
  // emits them sorted, and a low-confidence first element would otherwise become
  // the primary. Stable sort: entries with unparseable confidence keep their
  // original relative order (ranked below any numeric one).
  const conf = (m: unknown): number => {
    const v = Number((m as { confidence?: unknown })?.confidence);
    return Number.isFinite(v) ? v : -1;
  };
  const dm = (Array.isArray(a.departmentMatches) ? a.departmentMatches : [])
    .filter((m: unknown) => typeof (m as { department?: unknown })?.department === "string" &&
      ((m as { department: string }).department).trim())
    .sort((x: unknown, y: unknown) => conf(y) - conf(x));
  const primary = dm[0];
  if (!primary) return null;

  const dept = normalizeDepartment(primary.department);
  const cleanTitle = (t: unknown): string | null => {
    const s = typeof t === "string" ? t.trim() : "";
    return s ? s.slice(0, 80) : null;
  };
  const title =
    cleanTitle(a.recruiterVerdict?.shortlistFor) ||
    cleanTitle(a.professionalIdentity?.primary);

  // Second-best fit: the first departmentMatch that lands on a DIFFERENT
  // canonical department than the primary.
  const second = dm.find(
    (m: any) =>
      m !== primary &&
      typeof m?.department === "string" &&
      normalizeDepartment(m.department) !== dept,
  );

  return {
    suggested_department: dept,
    suggested_job_title: title,
    classification_confidence: scoreToConfidence(primary.confidence),
    suggested_department_2: second ? normalizeDepartment(second.department) : null,
    suggested_job_title_2: cleanTitle(a.professionalIdentity?.secondary),
    classification_confidence_2: second
      ? scoreToConfidence(second.confidence)
      : scoreToConfidence(a.professionalIdentity?.secondaryConfidence),
    classification_reasoning:
      (typeof primary.reason === "string" && primary.reason.trim()) ||
      (typeof a.professionalIdentity?.keyIdentity === "string" && a.professionalIdentity.keyIdentity.trim()) ||
      null,
    classification_evidence: Array.isArray(a.evidenceFor)
      ? a.evidenceFor.filter((e: unknown) => typeof e === "string").slice(0, 3)
      : [],
  };
}
