
CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text,
  phone text,
  nationality text,
  id_iqama_number text,
  job_title text,
  department text,
  reports_to text,
  tier text DEFAULT 'Tier 1',
  status text NOT NULL DEFAULT 'Active',
  joining_date date,
  photo_url text,
  last_active_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on employees"
  ON public.employees FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
