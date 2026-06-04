
-- Drop existing public read policy
DROP POLICY IF EXISTS "Anyone can read published survey metadata" ON public.surveys;

-- Recreate with the same condition (RLS can't filter columns, but we ensure 
-- the edge function strips intelligence data server-side)
-- The actual column filtering happens in the survey-manage edge function
CREATE POLICY "Public can read published surveys"
  ON public.surveys FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

-- Create a security definer function that returns only safe columns
CREATE OR REPLACE FUNCTION public.get_published_survey(p_id uuid)
RETURNS TABLE (
  id uuid, title text, description text, category text, status text,
  is_anonymous boolean, is_public boolean, allow_multiple_responses boolean,
  audience_type text, cover_image_url text, thank_you_message text,
  max_responses integer, response_deadline timestamptz,
  created_at timestamptz, updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.title, s.description, s.category, s.status,
         s.is_anonymous, s.is_public, s.allow_multiple_responses,
         s.audience_type, s.cover_image_url, s.thank_you_message,
         s.max_responses, s.response_deadline,
         s.created_at, s.updated_at
  FROM public.surveys s
  WHERE s.id = p_id AND s.status = 'published';
$$;
