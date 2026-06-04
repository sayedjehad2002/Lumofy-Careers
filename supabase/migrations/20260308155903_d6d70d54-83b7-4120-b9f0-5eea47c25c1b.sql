CREATE TABLE public.copilot_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.copilot_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for copilot_memory" ON public.copilot_memory
  FOR ALL USING (true) WITH CHECK (true);

-- Insert default preferences
INSERT INTO public.copilot_memory (key, value) VALUES
  ('user_profile', '{"name": "", "role": "", "preferred_language": "en", "timezone": ""}'::jsonb),
  ('preferences', '{"tone": "professional", "verbosity": "balanced", "focus_areas": []}'::jsonb),
  ('interaction_stats', '{"total_conversations": 0, "last_active": null, "frequent_topics": [], "last_topics": []}'::jsonb)
ON CONFLICT (key) DO NOTHING;