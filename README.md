# Lumofy Careers

AI-powered careers site **+** HR hiring dashboard for [Lumofy](https://lumofy.ai).
Candidates browse and apply to roles; HR reviews applicants with AI-assisted CV
analysis, candidate scoring, and a searchable CV library.

🔗 Live: **https://careers.lumofy.ai**

## Tech stack

- **Frontend:** Vite + React + TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Supabase — Postgres + Row Level Security, Storage, Deno Edge Functions
- **AI:** Google **Gemini 2.5 Flash** (via Gemini's OpenAI-compatible API)
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
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run the Vitest test suite |

## Environment variables

Frontend config lives in `.env` (gitignored). See [`.env.example`](.env.example):

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon / publishable key (public; protected by RLS) |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ref |

> ⚠️ **Secrets never go in `.env`.** Server-side keys (e.g. `GEMINI_API_KEY`) live as
> Supabase Edge Function secrets — anything in a Vite `.env` ships to the browser.

## AI features

All AI runs server-side in Supabase Edge Functions, through one shared helper:
[`supabase/functions/_shared/ai.ts`](supabase/functions/_shared/ai.ts). It calls
Google Gemini's OpenAI-compatible endpoint and is the **single source of truth** for
model selection (the `MODELS` map).

- **Model:** `gemini-2.5-flash` for every tier — fast, low-cost, and multimodal
  (text, images, PDF CVs, and audio). Bump a tier to `gemini-2.5-pro` for higher quality.
- **Key:** the `GEMINI_API_KEY` Edge Function secret (Supabase dashboard →
  Project → Edge Functions → Secrets).
- **Functions using AI:** `analyze-cv`, `auto-analyze-applicant`, `cv-library-parse`,
  `cv-library-classify`, `cv-library-analyze`, `ai-job-assist`, `transcribe-audio`.

> 📄 Gemini reads PDFs and images, but **not** Word `.doc/.docx` files — CVs should be
> PDFs for analysis.

## Deployment

- **Frontend → Vercel:** auto-deploys on push to `main`.
- **Edge functions → Supabase:** **not** automatic. Deploy with the Supabase CLI:

  ```sh
  supabase functions deploy <function-name> --project-ref <your-project-ref>
  ```

  (or edit/deploy them in the Supabase dashboard). After changing the shared
  `_shared/ai.ts`, redeploy **every** function that imports it.

## Project structure

```
src/                       # React app (careers site + HR dashboard)
  components/careers/       # feature components
  integrations/supabase/    # generated Supabase client + types
supabase/
  functions/                # Deno edge functions
    _shared/ai.ts           # shared Gemini AI helper (model config lives here)
  migrations/               # database migrations
```
