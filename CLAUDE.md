# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

**Lumofy Careers** — an AI-powered careers site + HR hiring dashboard. Candidates
apply to roles; HR reviews applicants with AI CV analysis, scoring, and a searchable
CV library. Live at https://careers.lumofy.ai.

## Stack

- **Frontend:** Vite + React + TypeScript, Tailwind, shadcn/ui (`src/`)
- **Backend:** Supabase — Postgres + RLS, Storage, Deno Edge Functions (`supabase/`)
- **AI:** Google Gemini 2.5 Flash via the OpenAI-compatible API
- **Hosting:** Vercel (frontend) + Supabase (backend); GitHub `sayedjehad2002/Lumofy-Careers`

## Commands

- `npm run dev` — dev server on **port 3005**
- `npm run build` / `npm run preview`
- `npm run lint` — ESLint
- `npm run test` — Vitest

## Architecture notes

- **Admin/HR auth is custom**, not Supabase Auth: an `admin_passwords` + `admin_sessions`
  token system (login is email + password, validated by the `verify-password` function).
  There is no `user_roles` table or `has_role()` function.
- **AI is centralized.** Every AI edge function calls `supabase/functions/_shared/ai.ts`.
  Change models in its `MODELS` map (the single source of truth) — not per-function.
  - Endpoint: Gemini OpenAI-compatible (`generativelanguage.googleapis.com/v1beta/openai`).
  - Secret: `GEMINI_API_KEY` (a Supabase Edge Function secret).
  - Model: `gemini-2.5-flash` everywhere. PDFs/images/audio are supported; Word `.doc/.docx`
    are NOT readable by Gemini.
  - AI functions: `analyze-cv`, `auto-analyze-applicant`, `cv-library-parse`,
    `cv-library-classify`, `cv-library-analyze`, `ai-job-assist`, `transcribe-audio`.
- Storage buckets `cvs` / `jds` / `cv-library` are private; access via signed URLs.

## Deployment ⚠️

- **Frontend → Vercel:** auto-deploys on push to `main`.
- **Edge functions → Supabase do NOT auto-deploy on git push.** Deploy explicitly:
  `supabase functions deploy <name> --project-ref dufbgzfqehkfibclaphy`
  After editing `_shared/ai.ts`, redeploy **all** functions that import it.
- Supabase project ref: `dufbgzfqehkfibclaphy` (region eu-central-1).

## Conventions

- Match the existing file style; keep AI model config in `_shared/ai.ts`.
- Never commit secrets. `.env` is frontend-only (public values); server-side secrets
  live in Supabase. See `.env.example`.
