-- Soft-delete (archive) for jobs: deleting a job used to CASCADE-wipe all its
-- applicants. Instead, HR now ARCHIVES a job — it leaves the public careers site
-- but stays in the dashboard (restorable) and its applicants are preserved.
-- Applied live via the Management API; this file is the repo record.

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Public jobs RPC: hide archived jobs (in addition to the existing status='open' gate).
CREATE OR REPLACE FUNCTION public.get_public_jobs()
RETURNS TABLE(
  id text, title text, department text, location text, type text, status text,
  summary text, description text, responsibilities jsonb, requirements jsonb,
  benefits jsonb, salary_range text, salary_currency text, posted_date text,
  deadline text, screening_questions jsonb, jd_file_name text, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $func$
  SELECT j.id, j.title, j.department, j.location, j.type, j.status,
         j.summary, j.description, j.responsibilities, j.requirements,
         j.benefits, j.salary_range, j.salary_currency, j.posted_date,
         j.deadline, j.screening_questions, j.jd_file_name, j.created_at
  FROM public.jobs j
  WHERE j.status = 'open' AND j.archived_at IS NULL
  ORDER BY j.created_at ASC;
$func$;
GRANT EXECUTE ON FUNCTION public.get_public_jobs() TO anon, authenticated;

-- NOTE: archived_at is also added to the admin-data jobs SELECT + WRITABLE allowlists
-- (supabase/functions/admin-data/index.ts) so the dashboard can read/set it.
