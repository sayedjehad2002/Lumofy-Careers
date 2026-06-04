
-- Chat sessions table
CREATE TABLE public.copilot_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL DEFAULT 'New conversation',
  candidate_id text,
  job_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Chat messages table
CREATE TABLE public.copilot_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.copilot_sessions(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.copilot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copilot_messages ENABLE ROW LEVEL SECURITY;

-- Service role full access (edge functions use service role)
CREATE POLICY "Service role full access on copilot_sessions"
  ON public.copilot_sessions FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on copilot_messages"
  ON public.copilot_messages FOR ALL
  USING (true) WITH CHECK (true);

-- Index for fast message lookup
CREATE INDEX idx_copilot_messages_session ON public.copilot_messages(session_id, created_at);

-- Index for listing sessions
CREATE INDEX idx_copilot_sessions_updated ON public.copilot_sessions(updated_at DESC);

-- Trigger to update session timestamp
CREATE OR REPLACE FUNCTION public.update_copilot_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.copilot_sessions SET updated_at = now() WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_copilot_session_on_message
  AFTER INSERT ON public.copilot_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_copilot_session_timestamp();
