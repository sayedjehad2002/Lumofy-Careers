-- Remove the conflicting policy - we only want the deny
DROP POLICY IF EXISTS "Public can read open jobs via view" ON public.jobs;
DROP POLICY IF EXISTS "Deny direct public read on jobs" ON public.jobs;

-- Single deny policy for all public reads on the base table
CREATE POLICY "Deny public select on jobs"
  ON public.jobs FOR SELECT
  TO anon, authenticated
  USING (false);