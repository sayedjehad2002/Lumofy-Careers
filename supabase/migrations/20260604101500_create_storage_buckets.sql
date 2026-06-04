-- Create the private storage buckets used by the edge functions:
--   cvs        - applicant CV/resume uploads
--   jds        - job-description file uploads
--   cv-library - internal categorized CV library
-- Idempotent so re-running `supabase db push` is safe.
insert into storage.buckets (id, name, public)
values
  ('cvs', 'cvs', false),
  ('jds', 'jds', false),
  ('cv-library', 'cv-library', false)
on conflict (id) do nothing;
