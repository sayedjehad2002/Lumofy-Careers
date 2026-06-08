# Lumofy Careers — Product Context

register: product

Grounded in CLAUDE.md, DESIGN.md, and the live codebase (not invented). Refine freely.

## What this is

An AI-powered careers platform with two faces sharing one brand:

1. **Public careers site** (careers.lumofy.ai) — candidates browse roles and apply, uploading their CV.
2. **HR hiring dashboard** (private, custom auth) — recruiters review applicants with AI CV analysis: automatic parsing, true-identity classification, recruiter-grade scoring, and a searchable **CV Library** of past candidates.

## Users

- **HR / recruiters** (primary — the dashboard). Time-pressed, screening many CVs, judging fit fast and accurately. They live in the Applicants view and the CV Library. They value: scannability, evidence-backed verdicts, no wall-of-text, quick search/filter, and confidence in the AI's reasoning.
- **Candidates** (the public apply flow). Applying to a role; this is their first impression of Lumofy. They value a fast, modern, trustworthy application that respects their time and works on mobile.

## Product purpose

Help HR make better, faster, less-biased hiring decisions with AI that reads a CV the way an expert recruiter would (true professional identity, evidence over titles/keywords), and give candidates a polished application experience.

## Brand & tone

Cosmic, aspirational, guiding ("Guide Your Journey", "Ignite Your Potential"). Confident and clear, never gimmicky. **Dark-first, blue-led** (Sirius `#215BEA`), with cosmic accents (Eclipse purple, Aurora green, Stellar yellow, Nova pink) used deliberately for data/status, not decoration. Source Sans 3 throughout, headings weight 800. Full tokens in DESIGN.md.

## Strategic principles

- **Evidence over keywords.** The AI judges true professional identity from responsibilities and achievements, not job titles or HR buzzwords. The UI must *surface* that evidence (identity, evidence-for / evidence-against, recruiter verdict), never bury it.
- **Scannable, not scrollable.** HR should grasp a candidate at a glance: identity, fit, score, verdict up top; depth on demand (tabs / progressive disclosure). Never one long text dump.
- **One product.** CV Library and Applicants should feel like the same tool. Reuse patterns and the analysis vocabulary across both.
- **Brand-consistent everywhere.** The dark cosmic system applies to the public apply flow as much as the dashboard.

## Anti-references

- Generic ATS chrome (Workday / Taleo enterprise-grey sludge).
- Wall-of-text AI output with no hierarchy (the current CV Library pain point).
- SaaS-cliché hero-metric dashboards, identical icon-card grids, decorative gradients.
- Light-mode-default anything (this product is dark-only).
