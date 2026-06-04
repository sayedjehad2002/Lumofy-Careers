-- Recreate the view as security definer (default) with open-only filter
DROP VIEW IF EXISTS public.jobs_public;

CREATE VIEW public.jobs_public AS
  SELECT 
    id, title, department, location, type, status, summary, description,
    responsibilities, requirements, benefits, salary_range, salary_currency,
    posted_date, deadline, created_at
  FROM public.jobs
  WHERE status = 'open';