# Deploy runbook — Lumofy Careers

Everything needed to ship a change, in one place. Last verified against the code
on 2026-07-07.

## TL;DR — what deploys how

| What changed | How it deploys |
|---|---|
| Anything in `src/` (frontend) | **Automatic** — Vercel builds every push to `main` |
| `supabase/functions/**` (edge functions) | **Manual** — `npx supabase functions deploy …` (see below) |
| `supabase/functions/_shared/**` | Manual, **fans out** — redeploy every function that imports the edited module (table below) |
| `supabase/migrations/**` (database) | Manual — `npx supabase link --project-ref dufbgzfqehkfibclaphy` once, then `npx supabase db push` (`--project-ref` is NOT a valid `db push` flag) — or paste into the dashboard SQL editor |
| Edge Function **secrets** | Supabase dashboard → Project → Edge Functions → Secrets |

Git push does **not** deploy edge functions. Forgetting the manual deploy is the
#1 cause of "the fix didn't work" — the code on `main` and the code running in
Supabase drift silently.

## Prerequisites

1. **Run from the repo root** — `cd C:\Projects\lumofycareers-main` first.
   Running from anywhere else (e.g. `C:\WINDOWS\system32`) fails with
   *"Cannot find project ref"*.
2. **Careers Supabase account** — the project lives on the careers account
   (`lumofybh@gmail.com`), *not* the melrweny account. **This machine's global
   CLI login (Windows Credential Manager) is the WRONG account** — bare
   `npx supabase` deploys 403 on this project. The durable fix is the local
   token file: save a careers-account personal access token (from
   supabase.com/dashboard/account/tokens, starts with `sbp_`) to
   **`.supabase-token`** in the repo root (gitignored — never committed).
   `scripts/deploy-functions.ps1` auto-loads it; for bare CLI commands set it
   per-window first:
   ```powershell
   $env:SUPABASE_ACCESS_TOKEN = (Get-Content .supabase-token -Raw).Trim()
   ```
   (`SUPABASE_ACCESS_TOKEN` always beats the stored login, so other projects'
   CLI logins stay untouched. Rotate/revoke the token anytime in the dashboard.)
3. The CLI runs via `npx supabase` (no global install needed). The
   *"WARNING: Docker is not running"* line during deploys is harmless — Docker is
   only needed for local emulation, not remote deploys.

## Deploying edge functions

One function:

```powershell
npx supabase functions deploy update-applicant --project-ref dufbgzfqehkfibclaphy
```

Several, or a whole shared-module fan-out, via the helper script:

```powershell
.\scripts\deploy-functions.ps1 update-applicant get-cv-url   # explicit names
.\scripts\deploy-functions.ps1 -Shared ai                    # all 7 importers of _shared/ai.ts
.\scripts\deploy-functions.ps1 -Shared taxonomy              # the 4 importers of _shared/taxonomy.ts
.\scripts\deploy-functions.ps1 -All                          # every function
```

## Shared-module fan-out

`_shared/*.ts` code is bundled into each function **at deploy time**. Editing a
shared module changes nothing in production until every importer is redeployed:

| Edited module | Redeploy these functions |
|---|---|
| `_shared/ai.ts` | `ai-job-assist`, `analyze-cv`, `auto-analyze-applicant`, `cv-library-analyze`, `cv-library-classify`, `cv-library-parse`, `transcribe-audio` (7) |
| `_shared/taxonomy.ts` | `cv-library-analyze`, `cv-library-classify`, `cv-library-manage`, `cv-library-parse` (4) |
| `_shared/seniority.ts` | `ai-job-assist`, `analyze-cv`, `auto-analyze-applicant`, `cv-library-analyze` (4) |
| `_shared/validate-file.ts` | `cv-library-upload`, `upload-cv` (2) |
| `_shared/validate-session.ts` | every function **except** `verify-password` (22) |
| `_shared/rate-limit.ts` | every function **except** `hr-me`, `hr-team` (21) |
| `_shared/cors.ts` | **all 23** functions |

`scripts/deploy-functions.ps1 -Shared <module>` applies this table automatically.

## Function inventory (23)

| Function | Purpose | AI model |
|---|---|---|
| `admin-data` | Session-gated DB proxy with per-table column allowlists (⚠️ new `jobs` columns need `SELECT_COLUMNS` **and** `WRITABLE_COLUMNS` updated here) | — |
| `ai-job-assist` | Job-post copywriting + JD parsing | 2.5-pro (generation), 2.5-flash (parse_jd) |
| `analyze-cv` | HR-triggered CV-vs-job analysis | 2.5-flash |
| `auto-analyze-applicant` | Same analysis, auto-run after a public application | 2.5-flash |
| `cv-library-analyze` | Deep CV-library analysis + atomic classification write | 2.5-flash |
| `cv-library-classify` | Fast first-pass department/role classification | 2.5-flash |
| `cv-library-manage` | CV-library CRUD, trash, `sync-classification` backfill | — |
| `cv-library-parse` | Multimodal CV parse with 4-rung recovery ladder for blocked PDFs | 2.5-flash (+ 2.5-pro retry rung) |
| `cv-library-upload` | Session-gated CV upload (magic-byte validated) | — |
| `delete-applicant` | Delete applicant + stored CV | — |
| `get-applicants` | Fetch applicants for the dashboard | — |
| `get-cv-url` | Signed URL for an applicant CV (5-min, IDOR-hardened) | — |
| `get-jd-url` | Signed URL for a JD file | — |
| `hr-invite-accept` | Consume invite token → create Supabase Auth user + `hr_users` row | — |
| `hr-me` | Is this session an authorized HR user? (`{authorized, role}`) | — |
| `hr-team` | Owner/admin team management: invites, enable/disable | — |
| `logout` | **Legacy** — revokes old `admin_sessions` tokens; unused by the app | — |
| `submit-application` | Public application submission | — |
| `transcribe-audio` | Screening-answer audio transcription | 2.5-flash |
| `update-applicant` | Applicant mutations: create, edits, note append, stage/status, change-job | — |
| `upload-cv` | Public CV upload for the apply flow | — |
| `upload-jd` | Session-gated JD upload | — |
| `verify-password` | **Legacy** — old custom admin login; unused by the app | — |

## Secrets (Supabase → Edge Functions → Secrets)

| Secret | Used by | Notes |
|---|---|---|
| `GEMINI_API_KEY` | all 7 AI functions (via `_shared/ai.ts`) | The AI key. Rotating it = just replace the secret; **name must be exactly** `GEMINI_API_KEY` |
| `INTERNAL_FUNCTION_SECRET` | `auto-analyze-applicant` | Authenticates trusted function-to-function calls (`x-internal-secret` header) |
| `ADMIN_EMAIL` | `verify-password` (legacy) | Optional override for the legacy admin email |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | `validate-session.ts`, `verify-password` | **Auto-provided by Supabase** — never set these manually |

Frontend env (public, set in Vercel → Project → Settings → Environment Variables):
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, optionally `VITE_SITE_URL`.

## config.toml

`supabase/config.toml` pins `verify_jwt = false` for every function — required
because requests authenticate via the `sessionToken` in the request body (validated
by `validate-session.ts`), not a Supabase-Auth `Authorization` header. **Every new
function must get a `[functions.<name>] verify_jwt = false` block**, or its deploys
will default to JWT-gating and every call from the app will 401.

## Troubleshooting

| Symptom | Cause → fix |
|---|---|
| `403` on deploy | Wrong Supabase account → log into **careers** or set `$env:SUPABASE_ACCESS_TOKEN` |
| "Cannot find project ref" | Not in the repo root → `cd C:\Projects\lumofycareers-main` |
| "WARNING: Docker is not running" | Harmless for remote deploys — ignore |
| Fix pushed but prod behaves old | Edge function not redeployed (git push ≠ deploy) → deploy it; if a `_shared` module changed, deploy the whole fan-out |
| Function returns 401 for every call | Missing `verify_jwt = false` in `config.toml` for that function → add it and redeploy |
| AI calls fail with 5xx in bursts | Concurrent Gemini calls — this key needs **sequential** AI processing; bulk flows must go one candidate at a time |
| `careers.lumofy.ai` serves an old build | Vercel domain drift → Vercel dashboard: connect the domain to **Production** and redeploy |

## After deploying — quick verification

1. `https://careers.lumofy.ai` loads and lists jobs (frontend).
2. Dashboard sign-in works (auth + `hr-me`).
3. If AI functions changed: run one CV analysis from the dashboard and confirm a
   fresh result (check the function's Logs tab in the Supabase dashboard on error).
4. If `update-applicant` changed: edit a field or move a pipeline stage.
