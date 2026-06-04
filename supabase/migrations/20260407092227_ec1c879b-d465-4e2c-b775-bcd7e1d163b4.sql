-- Drop the view, use a function instead
DROP VIEW IF EXISTS public.jobs_public;

-- Create a security definer function for public job access
CREATE OR REPLACE FUNCTION public.get_public_jobs()
RETURNS TABLE (
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
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT j.id, j.title, j.department, j.location, j.type, j.status,
         j.summary, j.description, j.responsibilities, j.requirements,
         j.benefits, j.salary_range, j.salary_currency, j.posted_date,
         j.deadline, j.created_at
  FROM public.jobs j
  WHERE j.status = 'open'
  ORDER BY j.created_at ASC;
$$;