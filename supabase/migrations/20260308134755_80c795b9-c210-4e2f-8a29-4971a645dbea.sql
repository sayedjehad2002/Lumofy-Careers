
CREATE TABLE public.policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL,
  summary text NOT NULL,
  content text NOT NULL,
  key_points jsonb DEFAULT '[]'::jsonb,
  related_policies text[] DEFAULT '{}'::text[],
  effective_date date,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;

-- Anyone can read active policies (employees need access)
CREATE POLICY "Anyone can read active policies" ON public.policies
  FOR SELECT USING (status = 'active');

-- Service role full access for admin management
CREATE POLICY "Service role full access on policies" ON public.policies
  FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_policies_updated_at
  BEFORE UPDATE ON public.policies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
