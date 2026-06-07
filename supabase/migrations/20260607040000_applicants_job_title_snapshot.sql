-- Data integrity: snapshot the job title onto each application so a candidate's
-- position survives job edits/deletes (no more "Unknown" in the dashboard).
-- New rows are set by the submit-application edge function; existing rows are
-- backfilled from the current jobs table. Idempotent / safe to re-run.
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS job_title text;

UPDATE public.applicants a
SET job_title = j.title
FROM public.jobs j
WHERE a.job_id = j.id AND a.job_title IS NULL;
