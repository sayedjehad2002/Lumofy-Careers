
-- Add stage_entered_at to applicants table
ALTER TABLE public.applicants 
ADD COLUMN stage_entered_at timestamp with time zone NOT NULL DEFAULT now();

-- Backfill: set stage_entered_at to updated_at for existing rows
UPDATE public.applicants SET stage_entered_at = updated_at;
