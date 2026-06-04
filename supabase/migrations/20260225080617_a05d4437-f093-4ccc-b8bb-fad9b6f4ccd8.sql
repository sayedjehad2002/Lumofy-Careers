
-- Add JD file columns to jobs table
ALTER TABLE public.jobs 
  ADD COLUMN IF NOT EXISTS jd_file_name text,
  ADD COLUMN IF NOT EXISTS jd_file_path text,
  ADD COLUMN IF NOT EXISTS jd_file_size bigint,
  ADD COLUMN IF NOT EXISTS jd_file_uploaded_at timestamp with time zone;

-- Create jds storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('jds', 'jds', false)
ON CONFLICT (id) DO NOTHING;

-- Allow service role full access to jds bucket (edge functions use service role)
CREATE POLICY "Service role full access on jds"
ON storage.objects
FOR ALL
USING (bucket_id = 'jds')
WITH CHECK (bucket_id = 'jds');
