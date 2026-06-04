
-- Create admin sessions table for server-side session validation
CREATE TABLE public.admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '2 hours')
);

ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

-- Only service role can access sessions
CREATE POLICY "Service role only on admin_sessions"
ON public.admin_sessions
FOR ALL
USING (false)
WITH CHECK (false);

-- Drop overly permissive applicant policies
DROP POLICY "Anyone can read applicants" ON public.applicants;
DROP POLICY "Anyone can update applicants" ON public.applicants;

-- RLS on admin_passwords: no public access
CREATE POLICY "No public access to admin_passwords"
ON public.admin_passwords
FOR ALL
USING (false)
WITH CHECK (false);
