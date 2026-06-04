
-- Allow reading all jobs (dashboard needs closed jobs too)
DROP POLICY "Anyone can read open jobs" ON public.jobs;
CREATE POLICY "Anyone can read jobs"
  ON public.jobs FOR SELECT
  USING (true);
