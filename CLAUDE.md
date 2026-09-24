# CLAUDE.md — Lumofy Careers

Guidance for Claude Code in this repo. Last refreshed 2026-09-23 (verified against the
code, `docs/DEPLOY.md` and git history). Deeper runbook: **[docs/DEPLOY.md](docs/DEPLOY.md)**.

## Purpose & users

AI-powered careers site + HR hiring dashboard for Lumofy. Live at https://careers.lumofy.ai
(also `lumofy-careers.vercel.app`).
- **Candidates** browse roles and apply with a CV on the public site (`/`, `/jobs`,
  `/jobs/:id`, `/jobs/:id/apply`). It is their first impression of Lumofy, so it has to be fast
  and trustworthy, and it has to work on mobile.
- **HR / recruiters** (primary users) work in the private dashboard (`/dashboard/:tab/:sub`):
  overview, jobs, applicants roster, pipeline board, CV Library (talent pool), HR team.
  AI parses, classifies and scores CVs; HR wants evidence-backed verdicts they can scan fast.
- Invite links land on `/hr/join`.

## Stack

- Frontend: Vite 5 + React 18 + TypeScript, Tailwind 3, shadcn/ui (Radix), framer-motion,
  react-router 6, recharts, @hello-pangea/dnd, Vitest + Testing Library (jsdom).
- Backend: Supabase: Postgres + RLS, private Storage, Deno Edge Functions (24).
- AI: Google Gemini 2.5 (flash + pro) via Gemini's OpenAI-compatible endpoint, server-side only.
- Hosting: Vercel (frontend, project `lumofy-careers`) + Supabase project `dufbgzfqehkfibclaphy`
  (eu-central-1). GitHub: `sayedjehad2002/Lumofy-Careers`, branch `main`.

## Commands (from `package.json`)

- `npm run dev`: dev server on **port 3005** (not 8080). The preview config in
  `.claude/launch.json` is named `lumofy`.
- `npm run build` / `npm run build:dev` / `npm run preview`
- `npm run typecheck`: `tsc --noEmit -p tsconfig.app.json`. **Run this.** `vite build` strips types
  without checking them, so a real type error ships green.
- `npm run test`: Vitest single run (`src/**/*.{test,spec}.{ts,tsx}`). `npm run test:watch`: watch mode.
- `npm run lint`: ESLint. The existing lint debt (~70 errors, mostly `no-explicit-any`) is
  pre-existing and non-blocking in CI.
- Edge-function deploy (PowerShell, repo root):
  - `.\scripts\deploy-functions.ps1 <name> [<name> ...]`
  - `.\scripts\deploy-functions.ps1 -Shared <ai|cors|rate-limit|seniority|taxonomy|validate-file|validate-session>`
  - `.\scripts\deploy-functions.ps1 -All`
- Bare CLI deploy: `npx supabase functions deploy <name> --project-ref dufbgzfqehkfibclaphy`.
  Set the token first (see Deployment). The CLI runs through `npx`. It is not installed globally.

CI (`.github/workflows/ci.yml`, push to `main` + PRs): lint (non-blocking) → **typecheck** →
test → build. It is a safety net only, not a deploy gate: Vercel deploys `main` regardless.

## Architecture map

```
src/
  pages/            Index, JobsPage, JobDetails, ApplyPage, Dashboard (all tabs), HrJoin, NotFound
  App.tsx           routes, ScrollToTop, ThemeRouteSync, ErrorBoundary, MotionConfig
  contexts/CareersContext.tsx   Supabase session → sessionToken, jobs + applicants data
  components/careers/
    applicants/     ApplicantsRoster, CandidateTimeline, InternalNotes, compare, email templates…
    pipeline/       PipelineBoard, PipelineColumn, PipelineTriageBar, BulkActionBar, pipelineView.ts
    cvlibrary/      CandidateAnalysis (shared analysis UI), BulkReparse, TrashBin, SmartSearch…
    jobs/           JobsView, JobRow
    CandidateProfile.tsx, DashboardOverview.tsx, HrTeam.tsx, DashboardAuth.tsx, JobFormModal.tsx
    statusColors.ts, sections/ (public homepage sections)
  components/icons/lumofy.tsx   official Lumofy icon set
  hooks/            use-applicant-events, use-live-refresh, use-saved-jobs…
  lib/              adminQuery, *Metrics.ts (pure, tested), attribution, motion, deptColor…
  integrations/supabase/client.ts   Supabase client (cleanEnv, see Gotchas)
  test/             Vitest suites
supabase/
  functions/        24 Deno edge functions + _shared/ (ai, cors, rate-limit, seniority,
                    taxonomy, validate-file, validate-session)
  migrations/       62 SQL migrations. These files are the record of the schema, but they do
                    not prove the change is live.
  config.toml       per-function verify_jwt = false
scripts/deploy-functions.ps1   deploy helper with the shared-module fan-out
docs/DEPLOY.md                 deploy runbook, function inventory, secrets table
docs/superpowers/              dated design specs + plans (dashboard overview, roster, …)
DESIGN.md, PRODUCT.md          brand/design system, product context (see stale notes below)
```

## Auth & permissions

- HR login is **Supabase Auth** (`signInWithPassword` in `DashboardAuth.tsx`). Accounts are
  invite-only, with no public signup. Forgot-password and sign-out both work.
- The session's access-token JWT goes to edge functions **in the request body as
  `sessionToken`** (not an Authorization header). `_shared/validate-session.ts` checks it with
  `auth.getUser()` and then the `hr_users` allowlist (status `active`).
- **`hr_users.role` is the source of truth.** There is no hardcoded email list.
  - `owner`: full access plus team management. Promoting someone to owner is a deliberate DB
    action. `hr-team` can only assign `admin` or `viewer` (`ASSIGNABLE_ROLES`).
  - `admin`: full hiring access, no team management.
  - `viewer`: can read everything and run AI analysis. Its only writes are `appendNote`, `rating`
    and `ai_analysis` (`VIEWER_UPDATE_FIELDS` in `update-applicant`). Everything else returns 403.
    Viewers get `appendNote`, never the raw `notes` array, so they cannot erase a colleague's note.
- Gate a mutating endpoint with `validateSession(token, cors, { require: "write" })`. Mixed
  read/write endpoints (`admin-data`, `cv-library-manage`, `update-applicant`) call `writeDenied()`
  per action or field instead.
- `upload-cv` and `submit-application` are deliberately ungated: they form the public apply flow.
- Invites: `hr-team` creates the link → `/hr/join` → `hr-invite-accept` creates the user.
- Legacy: `verify-password` and `logout` (the old `admin_passwords` / `admin_sessions` path)
  remain only as a server-side fallback. Nothing in `src/` calls them.

## AI (Gemini) — `supabase/functions/_shared/ai.ts`

- Every AI function goes through `chatCompletion()` in `ai.ts`, which calls Gemini's
  OpenAI-compatible endpoint (`generativelanguage.googleapis.com/v1beta/openai/chat/completions`).
  Change models in its **`MODELS` map**, not per function. `visionStrong`/`textStrong` = `gemini-2.5-pro`; all other tiers =
  `gemini-2.5-flash`.
- Retry and fallback: 4 attempts per model with backoff, then the fallback chain
  `2.5-flash → 2.0-flash → 2.5-flash-lite`. A 60s timeout becomes a clean 504.
- AI functions, i.e. the 7 importers of `ai.ts`: `analyze-cv`, `auto-analyze-applicant`,
  `cv-library-parse`, `cv-library-classify`, `cv-library-analyze`, `ai-job-assist`, `transcribe-audio`.
  - `ai-job-assist` generation → pro. Its `parse_jd` action → flash.
  - `cv-library-classify` → flash on purpose: a small schema, faster, and it avoids pro timeouts.
  - Exception to the map: `cv-library-parse`'s blocked-PDF ladder passes the raw id
    `gemini-2.5-pro`, and `mapModel` lets unknown ids through unchanged.
- **Do not blanket-switch the analyzers to pro.** Their big JSON schemas time out on pro.
- CV pipeline for the library: **parse** (reads the PDF, extracts name/contact/`extracted_text`)
  → **classify** (reads only parse's text, assigns department/role) → **analyze** (reads the PDF
  directly, produces score and summary). An empty parse makes the profile and the classification
  blank while analyze still looks fine.
- PDFs, images and audio work (a PDF is sent as a base64 data URL). **Word `.doc/.docx` cannot be
  read**: they are skipped, never sent.

## Data & storage

- Private buckets `cvs`, `jds`, `cv-library`. Files are served only through short-lived signed
  URLs (`get-cv-url`, `get-jd-url`, `cv-library-manage`). An applicant whose `cv_storage_path`
  starts with `library/` was promoted from the CV Library, so the file is read from the
  `cv-library` bucket.
- Jobs: read and written through `admin-data`, which keeps per-table column allowlists.
  Applicants: read through `get-applicants`, written through `update-applicant`, which handles
  create, field edits, `appendNote`, stage and status, change-job, and a batch `applicantIds`
  status branch (max 500). CV Library: `cv-library-manage` (`list`, trash, `sync-classification`).
- Jobs are soft-deleted via `jobs.archived_at`, and `get_public_jobs` filters them out.
  `applicants.job_title` is a snapshot that survives job edits.
- `applicant_events` is an **append-only** audit trail (stage changes + notes), read per
  candidate through `applicant-events`. A NULL actor means the system or pre-history. Never
  backfill a person into it.
- `applicants.source` / `referrer` / `utm_*` are written by `submit-application`. NULL means the
  row was submitted before tracking existed, so report it as untracked. Never guess a source.
  Arrival attribution is captured client-side in `src/lib/attribution.ts` (sessionStorage).
- Applicant RLS denies anon/authenticated. All data access goes through service-role edge
  functions.

## Deployment & environments

| What changed | How it ships |
|---|---|
| `src/**` | **Automatic.** Vercel builds every push to `main` (~1 min). |
| `supabase/functions/**` | **Manual.** A git push does NOT deploy edge functions. |
| `supabase/functions/_shared/**` | Manual, and you must **redeploy every importer** (`-Shared <module>`; table in DEPLOY.md). |
| `supabase/migrations/**` | Manual: dashboard SQL editor, `npx supabase link` + `npx supabase db push`, or the Management API. Recent migrations went in through the API, so the remote migration history may not list them: run `npx supabase migration list` before any `db push`, and prefer running the one new file. |
| Edge secrets | Supabase dashboard → Edge Functions → Secrets. |

- **Supabase token:** this machine's *global* Supabase CLI login belongs to a different Lumofy
  account (not the careers one), so it 403s here. A
  careers-account personal access token lives in the gitignored **`.supabase-token`** file at the
  repo root. `deploy-functions.ps1` loads it automatically. For bare CLI use:
  PowerShell `$env:SUPABASE_ACCESS_TOKEN = (Get-Content .supabase-token -Raw).Trim()`, or
  Bash `export SUPABASE_ACCESS_TOKEN=$(tr -d '\r\n ' < .supabase-token)`.
  Check with `npx supabase projects list`: it must show `dufbgzfqehkfibclaphy`. If the file is
  missing or the token is revoked, ask the user to save a fresh token to that file. Never ask
  for it in chat, and never read it out or commit it.
- Always run deploys from the repo root; anywhere else gives "Cannot find project ref". The ref
  is exactly `dufbgzfqehkfibclaphy` (20 chars). PowerShell predictive text once appended a stray
  character to it. "Docker is not running" warnings are harmless.
- **Ground truth for the DB and logs:** Supabase Management API with the same token:
  `POST https://api.supabase.com/v1/projects/dufbgzfqehkfibclaphy/database/query`, and
  `analytics/endpoints/logs.all` against `function_logs` / `function_edge_logs` for edge errors.
  The query endpoint runs any SQL on production, so keep to `SELECT` unless the user asked for a
  change. Clean up any test rows you create.
- **Supabase MCP:** a Supabase connector attached to Claude has previously been signed into an
  unrelated account (every call permission-denied). Run `list_projects` and check that this ref
  is there before using it. Otherwise use the Management API or the SQL editor.
- Verify after a deploy: the site lists jobs; dashboard sign-in works (`hr-me`); if AI changed,
  run one analysis and check the function logs; if `update-applicant` changed, move a stage.

## Environment variables & secrets (names only)

- Frontend `.env` (gitignored, public values; the same names are set in Vercel project settings):
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SITE_URL` (optional canonical origin
  for share/invite links), `VITE_SUPABASE_PROJECT_ID` (optional, not read by the app).
- Edge Function secrets: `GEMINI_API_KEY` (all AI; the name must be exact),
  `INTERNAL_FUNCTION_SECRET` (function-to-function `x-internal-secret`), `ADMIN_EMAIL` (optional,
  legacy login only). `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are injected by Supabase, so
  never set them.
- **Never put a server secret in a `VITE_` var.** Anything in Vite env ships to the browser.

## Accounts (who owns what)

- GitHub, Vercel (project `lumofy-careers`, team `sayedjehad2002s-projects` as of June 2026): the
  personal **`sayedjehad2002`** account, not the work Lumofy account. Pushing needs
  `sayedjehad2002` GitHub credentials (`gh auth switch --user sayedjehad2002` if a push says
  "Repository not found").
- Supabase careers project and Google Gemini key: the **careers Google account** (the user knows which).
  An older June note says Supabase is on `sayedjehad2002`; `docs/DEPLOY.md` and the verified
  2026-07-08 token fix say the careers account. Confirm with `npx supabase projects list` under the
  token before moving anything.
- The Gemini key belongs to the Google Cloud project "Lumofy Career Page", which is on a
  **prepay** billing account. Open Google billing signed in as the careers account: the
  sayedjehad2002 Google login shows a misleading "No billing account".
- DNS for careers.lumofy.ai is at Namecheap.

## Working agreements with the user

- **Commit or push only when the user says "git push".** Then: `git status`, stage only the
  relevant files by explicit path, never `git add -A` (and never `.env*`, `.supabase-token`,
  `dist/`, `.vercel`, caches), write a clear commit message, `git pull --rebase`,
  `git push origin main`. Other agents have pushed to this
  repo concurrently before. Work directly on `main`: no branches, no PRs.
- Work only inside `C:\Projects\lumofycareers-main`. Never create per-session folders. Explore
  first, then extend existing components and utilities rather than adding parallel ones.
- Claude can deploy edge functions itself with the script and token (no user PowerShell needed),
  but an edge deploy goes straight to production, so do it only when the user asks in the current
  turn. When code changes an edge function or a `_shared` module, say exactly which functions need
  deploying (or were deployed).
- **Metrics must be provable.** Before adding or restyling any score or health number, run its
  formula against live data and ask what value it takes when the team does everything right. If
  the answer is "the same", replace it with counts that name a next action and double as filters.
  Read the count and the filter from one predicate, and lock that with a test. Three screens
  shipped numbers that could never move (a pipeline "health" score stuck at 12/100, a strip that
  silently dropped `rejected`, a skills count capped at 12).
- AI trust rules: **no predictive percentages** (interview success, offer acceptance, turnover
  risk, etc.). They were removed as unvalidated guesses. Do not re-add them without a validated
  model and HR approval. `fitScore` is recomputed server-side from the clamped `scoreBreakdown` ×
  HR weights. `skillsCoveragePercent` is derived from `skillsAlignment`.

## Conventions & design

- Match the existing file style. Comments explain *why* (see migrations and `ai.ts` for the tone).
  Keep AI model config only in `_shared/ai.ts` and department taxonomy only in `_shared/taxonomy.ts`.
- Brand language "lx" (from the main lumofy.ai site): a **light corporate canvas** with dark
  bookends (nav, hero, closing CTA card, footer). Pill CTAs, eyebrow-pill kickers, `.sec-title`,
  `.lx-card`. Tokens and component classes live in `src/index.css` (`@layer components`).
  Fonts: Source Sans 3 for display, IBM Plex Sans for body (`font-sans`).
- Theme: **public routes are always light** (`ThemeRouteSync` in `App.tsx`). The stored dark/light
  preference (`ThemeToggle`) applies only on `/dashboard` and `/hr/*`. Never hard-code dark
  surface colours; use tokens.
- One analysis UI: `cvlibrary/CandidateAnalysis.tsx` renders analyses for both applicants and CV
  Library. `AIAnalysisPanel` is a thin run/re-run wrapper around it. Edit the shared component.
- Heavy libraries stay lazy (jspdf/html2canvas on export, xlsx, recharts). `vite.config.ts`
  `manualChunks` splits vendors. Don't import these eagerly into shared chunks.
- Motion: transform/opacity, 150–400ms, reduced-motion safe (`src/lib/motion.ts`,
  `<MotionConfig reducedMotion="user">`).
- Pure metric logic lives in `src/lib/*Metrics.ts` with tests in `src/test/`. Add a test when you
  change it.

## Gotchas & hard-won lessons

- **Git push ≠ edge deploy.** Forgetting the manual deploy is the #1 cause of "the fix didn't
  work". A `_shared` edit changes nothing in production until every importer is redeployed.
- **New edge function → add `[functions.<name>] verify_jwt = false` to `supabase/config.toml`**,
  or it deploys JWT-gated. `applicant-events` has no block yet (see Open threads).
- **admin-data allowlists:** a new `jobs` column must be added to BOTH `SELECT_COLUMNS.jobs` and
  `WRITABLE_COLUMNS.jobs` in `admin-data/index.ts`, and then admin-data must be redeployed.
  Otherwise every job save returns 400 with "Failed to save job" (this caused a prod outage in June).
- **Call Gemini sequentially.** Even 2 concurrent calls on this key produce sustained 5xx. Bulk
  flows go one candidate at a time: `useBulkAnalysis` is strictly sequential, and `BulkReparse`
  also waits 3s between calls.
- **Temperatures are load-bearing:** the analyzers run at `0.2` (the default ~1.0 gave ±20-point
  score swings); parse and classify run at `0.1` (the default returned all-null extractions).
  Don't remove them, and don't use 0 for large JSON. Analyzer `max_tokens` is **16000**: the v2
  schema truncates at 8000.
- **Date anchor:** every evaluative prompt must include `currentDateLine()` +
  `CHRONOLOGY_AND_IDENTITY_RULES` from `ai.ts`. Without them the model dates "now" at its training
  cutoff, flags recent roles as future-dated, and labels employed people "students".
- **Blocked PDFs:** LinkedIn profile exports and similar templated CVs make Gemini return an
  empty or blocked response every time (content filtering). This is not overload.
  `cv-library-parse` runs a recovery ladder only on an empty response: (1) the PDF's text layer
  (sent by the browser's pdf.js as `clientExtractedText`, else edge `unpdf`) goes to flash as
  text → (2) multimodal flash@0.9 → (3) pro@0.3 → (4) zero-AI extraction (LinkedIn slug for the
  name, regex for email and phone).
- **AI returning 429 on every model = check the Gemini prepay credit balance first.** On
  2026-08-10 all AI was down: the balance was $0 and auto-reload was off. Usage was <1% of the
  limits. `ai.ts` logs only the status, not Google's response body, which names the exact quota.
  Supabase egress over quota is a separate problem and does not cause this.
- **Notes are appended server-side** (`updates.appendNote`). Sending the full array duplicated
  notes. `auto-analyze-applicant` writes only when `ai_analysis` is null. `analyze-cv` does not
  save `ai_analysis` (the client does); it only backfills a blank name, email or phone on the
  applicant row.
- **Vercel env BOM:** `VITE_SUPABASE_PUBLISHABLE_KEY` on Vercel once carried a U+FEFF that broke
  every request header. `cleanEnv()` in `integrations/supabase/client.ts` strips it. Keep it.
- **Pipeline board** (`components/careers/pipeline/`):
  - `renderClone` looks up the card by `draggableId`, never by index. The clone is portalled to
    `<body>` because the tab's `filter` animation traps `position: fixed`.
  - Windowing freezes during a drag (`frozenRef`).
  - Cards are `memo`'d, with primitive or id-based props only.
  - View state lives in `Dashboard.tsx`, and `onViewChange` must stay a `Dispatch<SetStateAction>`.
  - `INITIAL_PIPELINE_VIEW` stays in `pipelineView.ts`: importing it from the board breaks the
    lazy split.
  - The full-height layout needs `min-h-0` on every link of the chain.
- **Candidate URLs:** `/dashboard/applicants/<id>?from=<tab>`. The open profile is *derived* from
  the id against live data (never a `useState` snapshot), and `from` is validated with `isTab()`.
- **Scroll:** `ScrollToTop` in `App.tsx` plus `scroll-mt-24` in `SectionShell`. Don't also add
  `scroll-padding-top`, because the two stack.
- **Browser automation:** Dashboard tab content sits behind `AnimatePresence mode="wait"`. In an
  occluded or hidden browser window the exit tween never finishes, so tab clicks look broken. Test
  data paths via the edge-function API instead: the session token comes from localStorage
  `sb-dufbgzfqehkfibclaphy-auth-token` and goes in the body as `{ sessionToken }`.
- **careers.lumofy.ai serving an old build:** in Vercel → Domains, connect it to **Production**,
  then trigger a fresh production deploy.
- `scripts/deploy-functions.ps1` must stay **pure ASCII**. Windows PowerShell 5.1 reads it as
  Windows-1252, and an em dash breaks parsing.

## Current state & open threads (as of 2026-09-23)

- Last commit `fff2884` (2026-08-12, dashboard icon set / multi-job filter / timeline). Apart from
  this CLAUDE.md refresh the tree was clean, and local `main` matched `origin/main` (last fetch).
  No work since mid-August.
- **Doc/config drift:** there are 24 functions, but `docs/DEPLOY.md` still says 23 and omits
  `applicant-events` from the inventory and fan-out tables. `applicant-events` also has no
  `verify_jwt = false` block in `config.toml`. The deploy script already lists it. Fix both the
  next time you touch deploys.
- Migrations since `20260809*` (public jobs `has_jd`, owner roles, source tracking,
  `applicant_events`) were applied by hand. Before relying on one, confirm it is live with the
  Management API.
- Confirmed still open in code on 2026-09-23:
  - `get-applicants` does `select("*")` with no limit, pulling `ai_analysis` and cover letters
    for every applicant.
  - `cv-library-manage` `list` does `select("*")`, which includes the unused `extracted_text`.
  - React Query is installed and configured but unused. All fetching is manual `useEffect`.
  - `CandidateProfile.tsx` still uses `window.confirm` for delete; use the shared `AlertDialog`.
  - `cv-library-analyze` lacks the CV realism/plausibility check that the two applicant
    analyzers have.
  - `ai.ts` does not log the 429 response body.
  - From the 2026-06-09 QA backlog, re-checked in code on 2026-09-23 and still open:
    - Status colours in `types/careers.ts` `APPLICANT_STATUSES` (and `AIAnalysisResults`) are
      hardcoded Tailwind literals; shortlisted vs hired look nearly identical.
    - `MobileBottomNav` hash links (`/#why`, `/#growth`) never show an active state.
    - The `JobFormModal` AI-weight range inputs have no `aria-label`.
    - `EditCandidateDialog` (in `CVLibrary.tsx`) writes manual edits to `suggested_*`,
      overwriting the AI's suggestion.
    - `cv-library-manage` `purge` ignores storage-remove errors.
    - The dashboard still blocks on full-screen loading gates; shell + skeletons would fix it.
- From the same backlog, not re-verified: some touch targets are under 44px; `upload-cv` can
  orphan files in storage. (`JobDetails`/`ApplyPage` now have a Footer: fixed.)
- Minor: re-parsing an already-named CV through parse's last rung can replace a full name with a
  LinkedIn-slug form.
- On the user's side:
  - Keep Gemini funded (switch to postpay or turn on auto-reload).
  - Supabase egress was over the Free-plan quota (2026-08-10).
  - Re-paste the Vercel publishable key without the BOM.
  - Rotate the first HR admin password, which was once shared in chat.
  - Optionally drop the legacy `verify-password`/`logout` functions and the
    `admin_passwords`/`admin_sessions` tables.
  - A second, redundant Vercel project was once seen building from this repo. Confirm it
    before deleting.
- **Stale docs, don't trust them:** `PRODUCT.md` says "dark-only" and "custom auth". Both are
  wrong now: the site is light, and auth is Supabase Auth. The colour table in `DESIGN.md` calls
  the site "dark-first", but its lx section at the top is current. `README.md`'s script table
  omits `typecheck`, and its CI note predates the blocking typecheck step.

## Deeper docs

- `docs/DEPLOY.md`: deploy runbook, shared-module fan-out, function inventory, secrets, troubleshooting.
- `DESIGN.md`: lx tokens, palette, typography. `PRODUCT.md`: users and principles (see stale note).
- `docs/superpowers/specs|plans/`: dated design specs and plans (June: careers "intelligence in
  motion", HR dashboard intelligence; August: dashboard overview, applicants roster).
- `README.md`: public-facing setup and scripts.
