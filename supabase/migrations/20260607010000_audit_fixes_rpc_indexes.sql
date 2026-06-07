-- Audit remediation (Wave 1): public jobs RPC + applicant indexes + duplicate guard.
-- Applied live via the Management API; this file is the repo record.

-- 1) get_public_jobs: expose candidate-safe screening_questions + jd_file_name so the
--    public Job Detail / Apply pages render. Previously these columns were omitted, so
--    job.screeningQuestions was undefined and `.length`/`.map` crashed the whole app.
--    Deliberately STILL omits ai_scoring_weights and jd_file_path (internal-only); the
--    admin dashboard loads full job rows through the authenticated admin-data path.
DROP FUNCTION IF EXISTS public.get_public_jobs();
CREATE FUNCTION public.get_public_jobs()
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
  WHERE j.status = 'open'
  ORDER BY j.created_at ASC;
$func$;
GRANT EXECUTE ON FUNCTION public.get_public_jobs() TO anon, authenticated;

-- 2) Indexes: the FK column + common dashboard filters had no index (only the PK existed).
CREATE INDEX IF NOT EXISTS idx_applicants_job_id ON public.applicants (job_id);
CREATE INDEX IF NOT EXISTS idx_applicants_status ON public.applicants (status);

-- 3) Block duplicate applications (one email per job, case-insensitive).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_applicants_job_email ON public.applicants (job_id, lower(email));
