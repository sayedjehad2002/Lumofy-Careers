CREATE TABLE public.performance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_name TEXT NOT NULL,
  snapshot_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_employees INTEGER NOT NULL DEFAULT 0,
  avg_manager_rating NUMERIC(3,2),
  high_performers INTEGER NOT NULL DEFAULT 0,
  red_flag_count INTEGER NOT NULL DEFAULT 0,
  high_potential INTEGER NOT NULL DEFAULT 0,
  department_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
  nine_box_distribution JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_analysis JSONB,
  employee_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.performance_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on performance_snapshots" 
ON public.performance_snapshots
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);