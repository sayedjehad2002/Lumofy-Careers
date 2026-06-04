
-- Create private storage bucket for CVs
INSERT INTO storage.buckets (id, name, public)
VALUES ('cvs', 'cvs', false);

-- Allow anonymous users to upload CVs (for public application form)
CREATE POLICY "Anyone can upload CVs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'cvs');

-- Allow service role to read CVs (for HR dashboard via edge functions)
CREATE POLICY "Service role can read CVs"
ON storage.objects FOR SELECT
USING (bucket_id = 'cvs');
