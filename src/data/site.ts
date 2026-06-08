/**
 * Site-wide constants — single source of truth for public contact details and
 * company stats. Centralized so values never drift across pages (these were
 * previously hardcoded/duplicated in Footer, JobDetails, DashboardAuth, Hero, etc.).
 */
export const SITE = {
  /** Public careers / HR contact inbox — used by the Footer "Get in Touch" + JobDetails "Contact HR". */
  careersEmail: "hr@lumofy.com",
  recruiter: {
    name: "Hasan Alhashimi",
    title: "Talent Acquisition & Onboarding Specialist",
  },
  /** Canonical company stats — reference these everywhere to keep figures consistent. */
  stats: {
    employees: "30+",
    offices: "Bahrain & Saudi Arabia",
    countries: "10+",
    founded: 2020,
  },
} as const;
