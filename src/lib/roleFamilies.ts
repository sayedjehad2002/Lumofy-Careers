// Derives a canonical ROLE FAMILY and a SENIORITY from the free-text job title
// the AI wrote for a CV. Pure, deterministic, no AI, no stored-data change — the
// original title is never modified and stays the row's visible label.
//
// Why this exists: departments are constrained twice in the classifier (the prompt
// says "choose from EXACTLY this list" and normalizeDepartment cleans the result),
// but job titles are constrained zero times. So departments are clean while titles
// shatter: 99 Engineering CVs across 59 distinct titles, 39 of them singletons.
// "Senior Frontend Developer", "Senior Frontend Engineer", "Senior Front-End
// Developer" and "Senior Front-end Developer" are one role wearing four spellings.
//
// Design rules learned the hard way from testing against all 251 real titles:
//  1. Fold punctuation FIRST, then glue compound words. "Front-End", "Front End"
//     and "Frontend" must all become "frontend" before any pattern runs, or the
//     canonical titles fail their own rules.
//  2. Order is specificity, not position in the string. A "Software Engineer"
//     catch-all must never outrank "Software QA Engineer".
//  3. Department rules win over shared rules, so "AI Product Manager" stays a
//     Product Manager instead of leaking into Machine Learning Engineer.
//  4. Every title lands somewhere. The last rule always matches.

export type Seniority = "Intern" | "Junior" | "Mid" | "Senior" | "Lead+";

export const SENIORITY_ORDER: Seniority[] = ["Intern", "Junior", "Mid", "Senior", "Lead+"];

export interface RoleInfo {
  /** Canonical career track, e.g. "Frontend Engineer". */
  family: string;
  seniority: Seniority;
  /** True when nothing matched and the title is shown as-is. */
  unmatched: boolean;
}

/** Shown when a CV has no title at all — 21 CVs in production have neither a
 *  manual nor a suggested title, and they must still be reachable. */
export const NO_TITLE_FAMILY = "Role not identified";
export const OTHER_FAMILY = "Other roles";

/** Lowercase, strip accents, reduce every separator to a single space, then pad
 *  with spaces so ` word ` patterns match at string edges too. */
function fold(raw: string): string {
  const base = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return ` ${base} `;
}

/** Glue the compound role words that HR spells three different ways. Runs after
 *  fold(), so "Front-End", "Front End" and "Frontend" have already converged on
 *  "front end" and become "frontend" here. */
function canonical(raw: string): string {
  return fold(raw)
    .replace(/ front end /g, " frontend ")
    .replace(/ back end /g, " backend ")
    .replace(/ full stack /g, " fullstack ")
    .replace(/ fullstack developer /g, " fullstack ")
    .replace(/ e learning /g, " elearning ")
    .replace(/ people and culture /g, " people culture ")
    .replace(/ people ops /g, " people culture ")
    .replace(/ human resources /g, " hr ")
    .replace(/ learning and development /g, " learning development ")
    .replace(/ l d /g, " learning development ")
    .replace(/ organisation /g, " organization ")
    .replace(/ organizational /g, " organization ")
    .replace(/ rev ops /g, " revops ")
    .replace(/ revenue operations /g, " revops ")
    .replace(/ go to market /g, " gtm ")
    .replace(/ ui ux /g, " uiux ")
    .replace(/ ux ui /g, " uiux ")
    .replace(/ machine learning /g, " ml ")
    .replace(/ artificial intelligence /g, " ai ")
    .replace(/ business development /g, " bizdev ")
    .replace(/ sales development /g, " sdr ")
    .replace(/ information technology /g, " it ")
    .replace(/ quality assurance /g, " qa ")
    .replace(/ public relations /g, " pr ")
    .replace(/ communications /g, " comms ")
    .replace(/ communication /g, " comms ");
}

interface Rule {
  family: string;
  /** Restrict to one department; omit for a rule that may fire anywhere. */
  dept?: string;
  re: RegExp;
}

// Ordered MOST SPECIFIC FIRST. The first match wins, so a narrow rule must always
// precede the broad one that would otherwise swallow it.
//
// PATTERN CONVENTION, and the reason this file has tests: a leading space with NO
// trailing space is a word-PREFIX match. " cyber" therefore matches "cybersecurity",
// " analy" matches "analyst", " partnership" matches "partnerships". Fully-delimited
// " ai " is reserved for short tokens that would otherwise match inside longer words.
// Testing against the real 251 titles found space-delimited patterns silently
// dropped 7 of 9 cybersecurity CVs into the fallback bucket.
const RULES: Rule[] = [
  // ---------- Engineering ----------
  { dept: "Engineering", family: "QA Engineer", re: / qa | test| sdet| quality/ },
  { dept: "Engineering", family: "Security Engineer", re: / cyber| security| infosec| penetration| soc / },
  { dept: "Engineering", family: "Machine Learning Engineer", re: / ml | ai | nlp| llm| data scien| deep learning/ },
  { dept: "Engineering", family: "DevOps Engineer", re: / devops| sre | site reliability| platform engineer| cloud engineer| infrastructure/ },
  { dept: "Engineering", family: "Data Engineer", re: / data engineer/ },
  { dept: "Engineering", family: "Full Stack Developer", re: / fullstack/ },
  // Frontend precedes Mobile deliberately: a title that says "Frontend Engineer
  // (React/React Native)" is a frontend hire who also ships mobile, and filing it
  // under Mobile would empty the cluster HR actually browses.
  { dept: "Engineering", family: "Frontend Engineer", re: / frontend| react| vue| angular| nuxt| ui engineer| web develop| shopify| wordpress| webflow/ },
  { dept: "Engineering", family: "Mobile Developer", re: / ios | android| mobile| flutter/ },
  { dept: "Engineering", family: "Backend Engineer", re: / backend| server side| api engineer| python| django| node| java| dotnet| net develop| php| laravel| golang| ruby/ },
  { dept: "Engineering", family: "Engineering Manager", re: / engineering manager| head of engineering| cto | vp engineering/ },
  { dept: "Engineering", family: "IT Support", re: / it support| helpdesk| help desk| desktop support| it intern| it technician/ },
  { dept: "Engineering", family: "Software Engineer", re: / software| develop| engineer| programm| coder| technolog/ },

  // ---------- Product ----------
  { dept: "Product", family: "Technical Product Manager", re: / technical product| technical program/ },
  { dept: "Product", family: "Product Designer", re: / designer| uiux| ux research| user experience/ },
  { dept: "Product", family: "Product Analyst", re: / product analyst| analytics/ },
  { dept: "Product", family: "Product Owner", re: / product owner/ },
  { dept: "Product", family: "Product Manager", re: / product| pm | roadmap/ },

  // ---------- Design ----------
  { dept: "Design", family: "Product Designer", re: / product design| uiux| ux | ui design/ },
  { dept: "Design", family: "Graphic Designer", re: / graphic| visual| brand design| illustrat/ },
  { dept: "Design", family: "Content Creator", re: / content| social media| creator| video/ },
  { dept: "Design", family: "Designer", re: / design/ },

  // ---------- Human Resources ----------
  { dept: "Human Resources", family: "Learning & Development Specialist", re: / learning development| elearning| instructional| training| talent development/ },
  { dept: "Human Resources", family: "Talent Acquisition Specialist", re: / talent acquisition| recruit| sourcing/ },
  { dept: "Human Resources", family: "HR Business Partner", re: / business partner| hrbp/ },
  { dept: "Human Resources", family: "Organizational Development Specialist", re: / organization develop| organization design| od specialist/ },
  { dept: "Human Resources", family: "Compensation & Benefits Analyst", re: / compensation| benefit| total rewards| payroll/ },
  { dept: "Human Resources", family: "HR Manager", re: / hr manager| head of hr| head of people| people culture| chro | hr director/ },
  { dept: "Human Resources", family: "HR Generalist", re: / hr | hr$| human| people/ },

  // ---------- Marketing ----------
  { dept: "Marketing", family: "Marketing Communications", re: / comms| pr | public affairs/ },
  { dept: "Marketing", family: "Social Media & Content Creator", re: / social media| content creator| copywrit| videograph/ },
  { dept: "Marketing", family: "Content Strategist", re: / content| editorial| seo /},
  { dept: "Marketing", family: "Growth Marketing Manager", re: / growth| performance| paid | acquisition| demand gen/ },
  { dept: "Marketing", family: "Digital Marketing Specialist", re: / digital| campaign| email marketing| crm / },
  { dept: "Marketing", family: "Brand Manager", re: / brand/ },
  { dept: "Marketing", family: "Marketing Manager", re: / marketing| market / },

  // ---------- Public Relations ----------
  { dept: "Public Relations", family: "Public Relations Manager", re: / pr | comms| media relations| public affairs/ },

  // ---------- Sales ----------
  { dept: "Sales", family: "Sales Development Rep", re: / sdr | bdr | prospect| inside sales| lead generation/ },
  { dept: "Sales", family: "Sales Engineer", re: / sales engineer| solution engineer| presales/ },
  { dept: "Sales", family: "Business Development Manager", re: / bizdev| partnership| alliance/ },
  { dept: "Sales", family: "Sales Manager", re: / sales manager| sales lead| sales team| head of sales| regional sales| vp sales| commercial director/ },
  { dept: "Sales", family: "Account Executive", re: / account executive| ae | closer| sales executive| sales/ },

  // ---------- Customer Success ----------
  { dept: "Customer Success", family: "Customer Education & Enablement", re: / enablement| education| training| onboarding/ },
  { dept: "Customer Success", family: "Customer Support", re: / support| service desk| helpdesk/ },
  { dept: "Customer Success", family: "Renewals Manager", re: / renewal| retention| churn/ },
  { dept: "Customer Success", family: "Customer Success Manager", re: / customer success| csm | client success| customer| client/ },

  // ---------- Customer Experience ----------
  { dept: "Customer Experience", family: "Customer Support", re: / support| service/ },
  { dept: "Customer Experience", family: "Customer Experience Manager", re: / experience| cx | voice of customer| insight/ },

  // ---------- Account Management ----------
  { dept: "Account Management", family: "Account Manager", re: / account| client| relationship| partner/ },

  // ---------- Revenue Operations ----------
  { dept: "Revenue Operations", family: "Revenue Operations Manager", re: / revops| revenue| gtm | sales ops| growth| commercial/ },

  // ---------- Operations ----------
  { dept: "Operations", family: "Logistics Coordinator", re: / logistic| supply chain| warehouse| procurement/ },
  { dept: "Operations", family: "Business Analyst", re: / business analyst| process improvement| analyst/ },
  { dept: "Operations", family: "IT Support", re: / it support| helpdesk| it / },
  { dept: "Operations", family: "Operations Manager", re: / operations| ops | coordinator| administrat/ },

  // ---------- Data & Analytics ----------
  { dept: "Data & Analytics", family: "Data Scientist", re: / data scien| ml | ai | statistic/ },
  { dept: "Data & Analytics", family: "Business Intelligence Analyst", re: / business intelligence| bi | dashboard| reporting/ },
  { dept: "Data & Analytics", family: "Data Analyst", re: / data| analy/ },

  // ---------- Project Management ----------
  { dept: "Project Management", family: "Scrum Master", re: / scrum| agile coach/ },
  { dept: "Project Management", family: "Program Manager", re: / program/ },
  { dept: "Project Management", family: "Project Manager", re: / project| pmo | delivery| coordinator/ },

  // ---------- Finance ----------
  { dept: "Finance", family: "Accountant", re: / accountant| accounting| bookkeep| audit/ },
  { dept: "Finance", family: "Financial Analyst", re: / financ| treasury| investor| analyst| controller/ },

  // ---------- Professional Services ----------
  { dept: "Professional Services", family: "Solutions Consultant", re: / consultant| solution| advisory/ },
  { dept: "Professional Services", family: "Implementation Manager", re: / implementation| deployment| onboarding/ },
  { dept: "Professional Services", family: "Service Delivery Lead", re: / service delivery| delivery| engagement/ },
  { dept: "Professional Services", family: "Technical Account Manager", re: / technical account| tam / },

  // ---------- Shared, lowest priority ----------
  // Only reached when the CV's own department had no matching rule, so an
  // "AI Product Manager" can never be dragged out of Product by the AI rule.
  //
  // Deliberately limited to unmistakable signals. Broad rules like "operations"
  // or "engineer" used to live here and produced cross-discipline nonsense — a
  // Finance CV filed under "Operations Manager". A stray now falls to the
  // department-named bucket below, which says less but never says something false.
  { family: "Machine Learning Engineer", re: / ml | ai | nlp| llm/ },
  { family: "Security Engineer", re: / cyber| security| infosec/ },
  { family: "IT Support", re: / it support| helpdesk| desktop support/ },
];

// ---------------------------------------------------------------- seniority --
// Strongest signal wins, so "Senior Manager" reads Senior rather than Mid. Note
// "leader" is matched explicitly: /\blead\b/ alone misses it, which previously
// made "Customer Success Team Leader" read Mid while "…Team Lead" read Lead+.
const SENIORITY_RULES: Array<{ level: Seniority; re: RegExp }> = [
  // " lead" is a prefix match so it also catches "Leader" — previously
  // "Customer Success Team Leader" read Mid while "…Team Lead" read Lead+.
  { level: "Lead+", re: / head of| chief| ceo | cto | cfo | coo | cgo | cro | cpo | vp | vice president| director| principal| staff | lead| architect/ },
  { level: "Senior", re: / senior| sr | snr | expert/ },
  // " intern " is fully delimited on purpose: a prefix match would read
  // "Internal Communications" as an internship.
  { level: "Intern", re: / intern | internship| trainee| apprentice/ },
  { level: "Junior", re: / junior| jr | entry level| graduate| associate| assistant| fresher/ },
  { level: "Mid", re: / mid level| mid | intermediate/ },
];

export function inferSeniority(title: string): Seniority {
  const s = canonical(title);
  // Intern beats Junior when both appear ("Intern/Junior"), and an explicit
  // senior/lead token beats both — a "Senior … Intern" does not exist, but
  // "Head of …" plus "Associate" does.
  for (const { level, re } of SENIORITY_RULES) if (re.test(s)) return level;
  return "Mid";
}

/** Map a CV's department + free-text title onto a canonical family. */
export function roleFamily(department: string | null | undefined, title: string | null | undefined): RoleInfo {
  const raw = (title || "").trim();
  if (!raw) return { family: NO_TITLE_FAMILY, seniority: "Mid", unmatched: true };

  const s = canonical(raw);
  const dept = (department || "").trim();

  // Department-specific rules first, then the shared tier.
  for (const rule of RULES) {
    if (rule.dept && rule.dept !== dept) continue;
    if (rule.re.test(s)) return { family: rule.family, seniority: inferSeniority(raw), unmatched: false };
  }
  // Known department, unrecognised role: bucket it under the department itself
  // rather than guessing a discipline. Flagged unmatched so the UI can show the
  // original titles rather than implying a canonical role.
  if (dept) return { family: `${dept} — other`, seniority: inferSeniority(raw), unmatched: true };
  return { family: OTHER_FAMILY, seniority: inferSeniority(raw), unmatched: true };
}
