-- Durable login brute-force protection (fix #7).
--
-- The verify-password edge function previously rate-limited login purely with an
-- in-memory Map, which resets on every cold start / new instance and is therefore
-- trivially bypassed. This table provides a persistent per-IP failure counter that
-- survives restarts and is shared across function instances.
--
-- One row per (ip, window_start). The edge function (service role) increments the
-- counter on each failed attempt within the current fixed window and enforces a
-- lockout once the count crosses the threshold.
CREATE TABLE IF NOT EXISTS public.login_attempts (
  ip text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ip, window_start)
);

-- Index to make the "delete old windows" cleanup cheap.
CREATE INDEX IF NOT EXISTS login_attempts_window_start_idx
  ON public.login_attempts (window_start);

-- Lock the table down: RLS on, and NO anon/authenticated access whatsoever.
-- Only the service role (edge functions) may read/write it.
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Explicit deny for non-service callers (matches admin_sessions/admin_passwords
-- convention in this project). Service role bypasses RLS, but we still add an
-- explicit service_role policy to document intent.
CREATE POLICY "No public access to login_attempts"
  ON public.login_attempts
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Service role full access on login_attempts"
  ON public.login_attempts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Atomic increment-and-return helper.
--
-- Computes the current fixed window start (floor of now() to `p_window_seconds`),
-- upserts the (ip, window_start) row incrementing its counter by 1, opportunistically
-- prunes stale windows, and returns the new count for that window. Doing the
-- increment as a single INSERT .. ON CONFLICT statement makes it race-free even
-- under concurrent login attempts from the same IP.
--
-- SECURITY DEFINER so it runs with the table owner's rights; we still revoke
-- EXECUTE from anon/authenticated so only the service role can call it.
CREATE OR REPLACE FUNCTION public.record_login_failure(
  p_ip text,
  p_window_seconds integer DEFAULT 900
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start timestamptz;
  v_count integer;
BEGIN
  -- Floor "now" to the start of the current window.
  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  INSERT INTO public.login_attempts (ip, window_start, count, updated_at)
  VALUES (p_ip, v_window_start, 1, now())
  ON CONFLICT (ip, window_start)
  DO UPDATE SET count = public.login_attempts.count + 1, updated_at = now()
  RETURNING count INTO v_count;

  -- Opportunistic cleanup of windows older than 2x the window length.
  DELETE FROM public.login_attempts
  WHERE window_start < now() - make_interval(secs => p_window_seconds * 2);

  RETURN v_count;
END;
$$;

-- Read-only helper: current failure count for an IP in the active window
-- (without incrementing). Used to enforce the lockout before checking the password.
CREATE OR REPLACE FUNCTION public.get_login_failures(
  p_ip text,
  p_window_seconds integer DEFAULT 900
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start timestamptz;
  v_count integer;
BEGIN
  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  SELECT count INTO v_count
  FROM public.login_attempts
  WHERE ip = p_ip AND window_start = v_window_start;

  RETURN COALESCE(v_count, 0);
END;
$$;

-- Clears an IP's attempts (called after a successful login).
CREATE OR REPLACE FUNCTION public.clear_login_failures(p_ip text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.login_attempts WHERE ip = p_ip;
END;
$$;

-- Only the service role (edge functions) may execute these helpers.
REVOKE ALL ON FUNCTION public.record_login_failure(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_login_failures(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.clear_login_failures(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_login_failure(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_login_failures(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.clear_login_failures(text) TO service_role;
