
-- Create cv-library storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('cv-library', 'cv-library', false);

-- Storage policies for cv-library bucket
CREATE POLICY "Service role full access on cv-library" ON storage.objects FOR ALL USING (bucket_id = 'cv-library') WITH CHECK (bucket_id = 'cv-library');

-- CV Library Candidates table
CREATE TABLE public.cv_library_candidates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text,
  email text,
  phone text,
  nationality text,
  country text,
  location text,
  years_experience text,
  skills text[] DEFAULT '{}',
  industries text[] DEFAULT '{}',
  roles_summary text,
  tags text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'new',
  resume_file_name text NOT NULL,
  resume_file_path text NOT NULL,
  resume_file_type text,
  resume_file_size bigint,
  extracted_text text,
  suggested_department text,
  suggested_job_title text,
  classification_confidence text,
  classification_reasoning text,
  classification_evidence text[] DEFAULT '{}',
  manual_department text,
  manual_job_title text,
  manual_overrides jsonb DEFAULT '{}'::jsonb,
  uploaded_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cv_library_candidates ENABLE ROW LEVEL SECURITY;

-- RLS: deny all via anon, service role has full access
CREATE POLICY "Service role full access on cv_library_candidates" ON public.cv_library_candidates FOR ALL USING (true) WITH CHECK (true);

-- Timestamp trigger
CREATE TRIGGER update_cv_library_candidates_updated_at
BEFORE UPDATE ON public.cv_library_candidates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for search
CREATE INDEX idx_cv_library_name ON public.cv_library_candidates USING gin(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(email, '') || ' ' || coalesce(phone, '')));
CREATE INDEX idx_cv_library_department ON public.cv_library_candidates (suggested_department);
CREATE INDEX idx_cv_library_status ON public.cv_library_candidates (status);
CREATE INDEX idx_cv_library_skills ON public.cv_library_candidates USING gin(skills);
