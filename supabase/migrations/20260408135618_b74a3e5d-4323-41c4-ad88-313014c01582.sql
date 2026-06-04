-- Add explicit deny for anon/authenticated on policies table
CREATE POLICY "Deny public access to policies"
  ON public.policies
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
