
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  table_name text NOT NULL,
  ip_address text,
  session_id text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only on audit_log"
  ON public.audit_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "No public access to audit_log"
  ON public.audit_log FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);

CREATE INDEX idx_audit_log_created_at ON public.audit_log (created_at DESC);
CREATE INDEX idx_audit_log_table_name ON public.audit_log (table_name);

-- Also lock down jobs table write operations to service_role only
-- Currently jobs has public SELECT (intentional) and service_role ALL
-- We need to ensure anon/authenticated can't write to jobs
DROP POLICY IF EXISTS "Service role full access on jobs" ON public.jobs;

CREATE POLICY "Service role full access on jobs"
  ON public.jobs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Explicitly deny writes for anon/authenticated
CREATE POLICY "No public writes to jobs"
  ON public.jobs FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "No public updates to jobs"
  ON public.jobs FOR UPDATE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "No public deletes from jobs"
  ON public.jobs FOR DELETE
  TO anon, authenticated
  USING (false);
