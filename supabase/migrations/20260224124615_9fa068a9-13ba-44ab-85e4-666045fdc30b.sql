
-- Remove the permissive upload policy and restrict to service role only
DROP POLICY IF EXISTS "Anyone can upload CVs" ON storage.objects;

CREATE POLICY "Only service role can upload CVs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'cvs' AND (SELECT current_setting('role')) = 'service_role');
