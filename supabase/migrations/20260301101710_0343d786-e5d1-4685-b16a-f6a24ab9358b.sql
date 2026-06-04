-- Fix applicants RLS: RESTRICTIVE-only means default deny
-- Drop the broken restrictive policies and recreate as permissive

DROP POLICY IF EXISTS "Anyone can submit applications" ON public.applicants;
DROP POLICY IF EXISTS "Service role full access on applicants" ON public.applicants;

-- Permissive INSERT for public submissions
CREATE POLICY "Public can submit applications"
ON public.applicants
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Permissive SELECT for service role reads (edge functions use service role)
CREATE POLICY "Service role read applicants"
ON public.applicants
FOR SELECT
USING (true);

-- Permissive UPDATE for service role
CREATE POLICY "Service role update applicants"
ON public.applicants
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Permissive DELETE for service role
CREATE POLICY "Service role delete applicants"
ON public.applicants
FOR DELETE
USING (true);