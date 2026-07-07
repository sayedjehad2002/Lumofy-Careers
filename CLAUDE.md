# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

**Lumofy Careers** — an AI-powered careers site + HR hiring dashboard. Candidates
apply to roles; HR reviews applicants with AI CV analysis, scoring, a pipeline
board, and a searchable CV library. Live at https://careers.lumofy.ai.

## Stack

- **Frontend:** Vite + React + TypeScript, Tailwind, shadcn/ui (`src/`)
- **Backend:** Supabase — Postgres + RLS, Storage, Deno Edge Functions (`supabase/`)
- **AI:** Google Gemini 2.5 (flash + pro) via the OpenAI-compatible API
- **Hosting:** Vercel (frontend) + Supabase (backend); GitHub `sayedjehad2002/Lumofy-Careers`

## Commands

- `npm run dev` — dev server on **port 3005**
- `npm run build` / `npm run build:dev` / `npm run preview`
- `npm run lint` — ESLint
- `npm run test` — Vitest (single run); `npm run test:watch` — watch mode

## Architecture notes

- **HR/admin auth is Supabase Auth.** Dashboard login calls
  `supabase.auth.signInWithPassword` (`src/components/careers/DashboardAuth.tsx`);
  the session's access-token JWT is passed to edge functions as `sessionToken` and
  validated in `_shared/validate-session.ts` via `auth.getUser()` plus the
  `hr_users` allowlist (role `owner`/`admin`/`viewer`, status must be `active`).
  Team invites flow through `hr-team` (creates the invite link) → the `/hr/join`
  page → `hr-invite-accept` (creates the account).
  The old custom `admin_passwords`/`admin_sessions` UUID-token path (the
  `verify-password` and `logout` functions) survives server-side as a legacy
  fallback only — nothing in `src/` calls it anymore.
- **AI is centralized.** Every AI edge function calls `supabase/functions/_shared/ai.ts`.
  Change models in its `MODELS` map — not per-function. (One known exception:
  cv-library-parse's blocked-PDF retry rung pins the raw id `gemini-2.5-pro` at
  `cv-library-parse/index.ts` and bypasses the map.)
  - Endpoint: Gemini OpenAI-compatible (`generativelanguage.googleapis.com/v1beta/openai`).
  - Secret: `GEMINI_API_KEY` (a Supabase Edge Function secret).
  - Models today: `gemini-2.5-flash` for CV parsing/analysis/classify/transcribe;
    `gemini-2.5-pro` for the `visionStrong`/`textStrong` tiers (used by `ai-job-assist`
    generation and cv-library-parse's blocked-PDF retry rung). Retries + an overload
    fallback chain (2.5-flash → 2.0-flash → 2.5-flash-lite) also live in `ai.ts`.
  - PDFs/images/audio are supported; Word `.doc/.docx` are NOT readable by Gemini.
  - AI functions (the 7 importers of `ai.ts`): `analyze-cv`, `auto-analyze-applicant`,
    `cv-library-parse`, `cv-library-classify`, `cv-library-analyze`, `ai-job-assist`,
    `transcribe-audio`.
  - **Call AI sequentially.** Concurrent Gemini calls on this key cause sustained
    overload 5xx — all bulk flows process one candidate at a time with short breathers.
- Other `_shared` modules: `taxonomy.ts` (single source of truth for departments/
  classification), `seniority.ts`, `validate-session.ts`, `validate-file.ts`,
  `rate-limit.ts`, `cors.ts`. Editing a shared module requires redeploying every
  function that imports it — the fan-out table is in `docs/DEPLOY.md`.
- Storage buckets `cvs` / `jds` / `cv-library` are private; files are served via
  short-lived signed URLs from session-gated functions (`get-cv-url`, `get-jd-url`,
  `cv-library-manage`).
- **admin-data gotcha:** adding a `jobs` column requires updating BOTH
  `SELECT_COLUMNS.jobs` and `WRITABLE_COLUMNS.jobs` in `admin-data/index.ts` and
  redeploying it — otherwise the dashboard shows "Failed to save job".

## Deployment ⚠️

- **Frontend → Vercel:** auto-deploys on push to `main`.
- **Edge functions → Supabase do NOT auto-deploy on git push.** Deploy explicitly,
  from the repo root, logged into the **careers** Supabase account:
  `npx supabase functions deploy <name> --project-ref dufbgzfqehkfibclaphy`
  or use `scripts/deploy-functions.ps1` (knows the shared-module fan-out; supports
  `-Shared ai`, `-All`, or explicit names).
- Full runbook (accounts, token fallback, fan-out table, troubleshooting):
  **[docs/DEPLOY.md](docs/DEPLOY.md)**.
- Supabase project ref: `dufbgzfqehkfibclaphy` (region eu-central-1).

## Git workflow

- Work directly on `main` — no branches, no PRs.
- **Never commit or push unless the user explicitly says "git push".** When they do:
  commit everything with a descriptive message and push straight to `origin main`.
- Never commit secrets. `.env` is frontend-only public config (gitignored);
  server-side secrets live as Supabase Edge Function secrets. See `.env.example`.

## Conventions

- Match the existing file style; keep AI model config in `_shared/ai.ts`.
- CI (`.github/workflows/ci.yml`) runs test + build (pass/fail) plus a non-blocking
  lint on every push to `main` — lint becomes blocking once the existing lint debt
  is cleared.
