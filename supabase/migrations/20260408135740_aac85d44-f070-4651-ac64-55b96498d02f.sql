-- Add explicit service_role policy on admin_passwords
CREATE POLICY "Service role full access on admin_passwords"
  ON public.admin_passwords
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add explicit service_role policy on admin_sessions  
CREATE POLICY "Service role full access on admin_sessions"
  ON public.admin_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
