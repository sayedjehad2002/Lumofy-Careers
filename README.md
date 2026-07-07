# Lumofy Careers

AI-powered careers site **+** HR hiring dashboard for [Lumofy](https://lumofy.ai).
Candidates browse and apply to roles; HR reviews applicants with AI-assisted CV
analysis, candidate scoring, a hiring pipeline board, and a searchable CV library.

🔗 Live: **https://careers.lumofy.ai**

## Tech stack

- **Frontend:** Vite + React + TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Supabase — Postgres + Row Level Security, Storage, Deno Edge Functions
- **AI:** Google **Gemini 2.5** (flash + pro, via Gemini's OpenAI-compatible API)
- **Hosting:** Vercel (frontend) + Supabase (backend); source on GitHub

## Getting started (local dev)

Requires Node.js 18+ and npm.

```sh
git clone https://github.com/sayedjehad2002/Lumofy-Careers.git
cd Lumofy-Careers
npm install
cp .env.example .env      # then fill in your Supabase values
npm run dev
```

The dev server runs at **http://localhost:3005**.

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server (port 3005) |
| `npm run build` | Production build |
| `npm run build:dev` | Development-mode build |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run the Vitest test suite once |
| `npm run test:watch` | Run Vitest in watch mode |

CI (GitHub Actions) runs test + build on every push to `main`, plus a
non-blocking lint check.

## Environment variables

Frontend config lives in `.env` (gitignored). See [`.env.example`](.env.example):

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon / publishable key (public; protected by RLS) |
| `VITE_SITE_URL` | *(optional)* Canonical site origin used when building shareable links; falls back to the current origin |

> ⚠️ **Secrets never go in `.env`.** Server-side keys (e.g. `GEMINI_API_KEY`) live as
> Supabase Edge Function secrets — anything in a Vite `.env` ships to the browser.

## HR dashboard auth

HR sign-in uses **Supabase Auth** (email + password, with password reset). Server-side,
edge functions validate the session JWT and authorize against the `hr_users` allowlist
(roles `owner` / `admin` / `viewer`). New team members join via single-use invite links
(`/hr/join`), managed from the dashboard's Team page.

## AI features

All AI runs server-side in Supabase Edge Functions, through one shared helper:
[`supabase/functions/_shared/ai.ts`](supabase/functions/_shared/ai.ts). It calls
Google Gemini's OpenAI-compatible endpoint and is the **single source of truth** for
model selection (the `MODELS` map).

- **Models:** `gemini-2.5-flash` for CV parsing, analysis, classification, and audio
  transcription; `gemini-2.5-pro` for the strong tiers (job-post copywriting in
  `ai-job-assist`, and the blocked-PDF retry rung in `cv-library-parse`). The helper
  retries on overload and falls back across flash-family models.
- **Key:** the `GEMINI_API_KEY` Edge Function secret (Supabase dashboard →
  Project → Edge Functions → Secrets).
- **Functions using AI:** `analyze-cv`, `auto-analyze-applicant`, `cv-library-parse`,
  `cv-library-classify`, `cv-library-analyze`, `ai-job-assist`, `transcribe-audio`.

> 📄 Gemini reads PDFs and images, but **not** Word `.doc/.docx` files — CVs should be
> PDFs for analysis.

## Deployment

- **Frontend → Vercel:** auto-deploys on push to `main`.
- **Edge functions → Supabase:** **not** automatic. Deploy from the repo root:

  ```powershell
  npx supabase functions deploy <function-name> --project-ref <your-project-ref>
  ```

  or use the helper script, which knows which functions import each shared module:

  ```powershell
  .\scripts\deploy-functions.ps1 <function-name>
  .\scripts\deploy-functions.ps1 -Shared ai    # redeploy everything that imports _shared/ai.ts
  ```

  Full runbook: **[docs/DEPLOY.md](docs/DEPLOY.md)**.

## Project structure

```
src/                        # React app (careers site + HR dashboard)
  components/careers/        # feature components
  contexts/                  # CareersContext (auth session + dashboard data)
  pages/                     # routes (Index, JobsPage, ApplyPage, Dashboard, HrJoin, …)
  integrations/supabase/     # generated Supabase client + types
  test/                      # Vitest suites
supabase/
  functions/                 # Deno edge functions (23) — see docs/DEPLOY.md
    _shared/                 # ai.ts, taxonomy.ts, validate-session.ts, cors.ts, …
  migrations/                # database migrations
scripts/
  deploy-functions.ps1       # edge-function deploy helper
docs/
  DEPLOY.md                  # deployment runbook
```
