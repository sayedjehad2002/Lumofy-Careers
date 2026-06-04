
-- Add secondary department suggestion columns
ALTER TABLE public.cv_library_candidates 
ADD COLUMN IF NOT EXISTS suggested_department_2 text,
ADD COLUMN IF NOT EXISTS suggested_job_title_2 text,
ADD COLUMN IF NOT EXISTS classification_confidence_2 text;
