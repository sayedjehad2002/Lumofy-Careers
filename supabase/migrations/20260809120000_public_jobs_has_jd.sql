-- get_public_jobs: tell candidates whether a job has a downloadable JD.
--
-- The public job page guards its "Download job description" buttons on the JD
-- being present, but this RPC only ever returned jd_file_name — never the path
-- the guard actually checked. So for anonymous visitors the buttons never
-- rendered, even on the roles where HR had uploaded a JD.
--
-- A boolean is all the UI needs and, unlike jd_file_path, it leaks nothing about
-- storage layout. The signed URL is still issued separately by get-jd-url.
--
-- Changing the return type requires DROP + CREATE, and grants do not survive
-- that, so the original EXECUTE grants are restored at the bottom.

DROP FUNCTION IF EXISTS public.get_public_jobs();

CREATE FUNCTION public.get_public_jobs()
RETURNS TABLE(
  id text,
  title text,
  department text,
  location text,
  type text,
  status text,
  summary text,
  description text,
  responsibilities jsonb,
  requirements jsonb,
  benefits jsonb,
  salary_range text,
  salary_currency text,
  posted_date text,
  deadline text,
  screening_questions jsonb,
  jd_file_name text,
  has_jd boolean,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT j.id, j.title, j.department, j.location, j.type, j.status,
         j.summary, j.description, j.responsibilities, j.requirements,
         j.benefits, j.salary_range, j.salary_currency, j.posted_date,
         j.deadline, j.screening_questions, j.jd_file_name,
         (j.jd_file_path IS NOT NULL) AS has_jd,
         j.created_at
  FROM public.jobs j
  WHERE j.status = 'open' AND j.archived_at IS NULL
  ORDER BY j.created_at ASC;
$function$;

GRANT EXECUTE ON FUNCTION public.get_public_jobs() TO anon, authenticated, service_role;
