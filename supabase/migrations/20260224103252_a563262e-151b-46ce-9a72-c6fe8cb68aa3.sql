
-- Create jobs table
CREATE TABLE public.jobs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  department TEXT NOT NULL,
  location TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  summary TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  responsibilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  benefits JSONB NOT NULL DEFAULT '[]'::jsonb,
  salary_range TEXT,
  salary_currency TEXT CHECK (salary_currency IN ('BHD', 'USD')),
  posted_date TEXT NOT NULL,
  deadline TEXT,
  screening_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Public can read open jobs
CREATE POLICY "Anyone can read open jobs"
  ON public.jobs FOR SELECT
  USING (status = 'open');

-- Service role manages all (dashboard uses edge functions for writes)
CREATE POLICY "Service role full access on jobs"
  ON public.jobs FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create applicants table
CREATE TABLE public.applicants (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  location TEXT NOT NULL,
  linkedin TEXT,
  portfolio TEXT,
  cover_letter TEXT,
  cv_file_name TEXT NOT NULL,
  cv_storage_path TEXT,
  cv_file_type TEXT,
  cv_file_size BIGINT,
  screening_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'shortlisted', 'interview', 'rejected', 'hired')),
  applied_date TEXT NOT NULL,
  notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  rating JSONB,
  ai_analysis JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.applicants ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public application form)
CREATE POLICY "Anyone can submit applications"
  ON public.applicants FOR INSERT
  WITH CHECK (true);

-- Service role manages all
CREATE POLICY "Service role full access on applicants"
  ON public.applicants FOR ALL
  USING (true)
  WITH CHECK (true);

-- Allow reading applicants (dashboard is password-protected, not auth-based)
CREATE POLICY "Anyone can read applicants"
  ON public.applicants FOR SELECT
  USING (true);

-- Allow updating applicants (for status changes from dashboard)
CREATE POLICY "Anyone can update applicants"
  ON public.applicants FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_applicants_updated_at
  BEFORE UPDATE ON public.applicants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
