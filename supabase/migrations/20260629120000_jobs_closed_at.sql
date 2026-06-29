-- Job lifespan: stamp when a job is closed so the dashboard can show an
-- "Open N days" / "Closed in N days" lifespan badge. Set by the admin-data
-- proxy when a job's status flips to a non-open state.
-- Applied live via the Management API; this file is the repo record so a fresh
-- database matches production.

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS closed_at timestamptz;

-- NOTE: closed_at is also added to the admin-data jobs SELECT + WRITABLE allowlists
-- (supabase/functions/admin-data/index.ts) so the dashboard can read/set it.
