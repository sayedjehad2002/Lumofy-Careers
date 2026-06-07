/**
 * Site-wide constants — single source of truth for public contact details and
 * company stats. Centralized so values never drift across pages (these were
 * previously hardcoded/duplicated in Footer, JobDetails, DashboardAuth, Hero, etc.).
 */
export const SITE = {
  /**
   * Public careers contact inbox.
   * NOTE: confirm this is the correct, monitored address — it was inconsistent
   * (`.com` on a `.ai` brand) and is the address candidates are told to email.
   */
  careersEmail: "Jhasan@lumofy.com",
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
