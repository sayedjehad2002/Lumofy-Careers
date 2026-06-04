
-- Create separate intelligence cache table (service_role only)
CREATE TABLE public.survey_intelligence_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  cached_intelligence jsonb,
  intelligence_response_count integer DEFAULT 0,
  intelligence_cached_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (survey_id)
);

ALTER TABLE public.survey_intelligence_cache ENABLE ROW LEVEL SECURITY;

-- Only service_role can access
CREATE POLICY "Service role full access on survey_intelligence_cache"
  ON public.survey_intelligence_cache FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Deny public access to survey_intelligence_cache"
  ON public.survey_intelligence_cache FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- Migrate existing data
INSERT INTO public.survey_intelligence_cache (survey_id, cached_intelligence, intelligence_response_count, intelligence_cached_at)
SELECT id, cached_intelligence, intelligence_response_count, intelligence_cached_at
FROM public.surveys
WHERE cached_intelligence IS NOT NULL;

-- Remove intelligence columns from surveys table
ALTER TABLE public.surveys DROP COLUMN IF EXISTS cached_intelligence;
ALTER TABLE public.surveys DROP COLUMN IF EXISTS intelligence_response_count;
ALTER TABLE public.surveys DROP COLUMN IF EXISTS intelligence_cached_at;
