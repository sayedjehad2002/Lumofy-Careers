-- Remove insecure policy that uses current_setting('role') which can be spoofed
DROP POLICY IF EXISTS "Only service role can upload CVs" ON storage.objects;
DROP POLICY IF EXISTS "Only service role can read CVs" ON storage.objects;
DROP POLICY IF EXISTS "Only service role can delete CVs" ON storage.objects;