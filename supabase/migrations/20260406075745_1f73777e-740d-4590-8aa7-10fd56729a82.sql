-- 1. Fix applicants: drop overly permissive policies (service_role bypasses RLS automatically)
DROP POLICY IF EXISTS "Service role read applicants" ON public.applicants;
DROP POLICY IF EXISTS "Service role update applicants" ON public.applicants;
DROP POLICY IF EXISTS "Service role delete applicants" ON public.applicants;

-- 2. Fix survey_responses: deny SELECT for non-service-role
CREATE POLICY "Deny public read on survey_responses"
  ON public.survey_responses FOR SELECT
  TO anon, authenticated
  USING (false);

-- 3. Fix turnover_entries: deny all for non-service-role
CREATE POLICY "Deny public access to turnover_entries"
  ON public.turnover_entries FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- 4. Fix jobs: restrict public reads to open jobs only
DROP POLICY IF EXISTS "Anyone can read jobs" ON public.jobs;
CREATE POLICY "Anyone can read open jobs"
  ON public.jobs FOR SELECT
  TO public
  USING (status = 'open');