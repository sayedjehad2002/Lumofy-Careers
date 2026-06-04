-- Create a restricted public view for jobs
CREATE VIEW public.jobs_public
WITH (security_invoker = on) AS
  SELECT 
    id, title, department, location, type, status, summary, description,
    responsibilities, requirements, benefits, salary_range, salary_currency,
    posted_date, deadline, created_at
  FROM public.jobs;

-- Drop the old permissive SELECT policy on jobs
DROP POLICY IF EXISTS "Anyone can read open jobs" ON public.jobs;

-- Create a restrictive SELECT policy that denies direct table access for anon/authenticated
CREATE POLICY "Deny direct public read on jobs"
  ON public.jobs FOR SELECT
  TO anon, authenticated
  USING (false);

-- Allow public to read open jobs through the view only
CREATE POLICY "Public can read open jobs via view"
  ON public.jobs FOR SELECT
  TO anon, authenticated
  USING (status = 'open');
