ALTER TABLE public.surveys 
ADD COLUMN IF NOT EXISTS cached_intelligence jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS intelligence_response_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS intelligence_cached_at timestamp with time zone DEFAULT NULL;