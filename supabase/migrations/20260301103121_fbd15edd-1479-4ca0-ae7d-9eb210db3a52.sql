-- Fix RLS: Change the public insert policy from RESTRICTIVE to PERMISSIVE
-- RESTRICTIVE policies require ALL to pass, which blocks public inserts when combined with service-role-only policies
DROP POLICY IF EXISTS "Public can submit applications" ON public.applicants;
CREATE POLICY "Public can submit applications"
  ON public.applicants
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Also make SELECT/UPDATE/DELETE permissive for service role operations
DROP POLICY IF EXISTS "Service role read applicants" ON public.applicants;
CREATE POLICY "Service role read applicants"
  ON public.applicants
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role update applicants" ON public.applicants;
CREATE POLICY "Service role update applicants"
  ON public.applicants
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role delete applicants" ON public.applicants;
CREATE POLICY "Service role delete applicants"
  ON public.applicants
  FOR DELETE
  USING (true);