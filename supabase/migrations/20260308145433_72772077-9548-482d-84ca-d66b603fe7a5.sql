
-- Pipeline automation rules table
CREATE TABLE public.pipeline_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  
  -- Condition: what triggers the rule
  condition_type text NOT NULL DEFAULT 'ai_score',
  -- ai_score, days_in_stage, missing_rating, stage_match
  condition_operator text NOT NULL DEFAULT 'gte',
  -- gte, lte, eq, gt, lt
  condition_value text NOT NULL DEFAULT '80',
  -- The value to compare against
  condition_stage text DEFAULT NULL,
  -- Optional: only apply when candidate is in this stage
  condition_job_id text DEFAULT NULL,
  -- Optional: only apply to candidates for this job (NULL = all jobs)
  
  -- Action: what happens when condition is met
  action_type text NOT NULL DEFAULT 'move_stage',
  -- move_stage, add_note, flag
  action_value text NOT NULL DEFAULT 'shortlisted',
  -- Target stage or note text or flag type
  
  -- Tracking
  last_run_at timestamptz DEFAULT NULL,
  last_run_affected integer DEFAULT 0,
  total_affected integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pipeline_rules ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access on pipeline_rules"
  ON public.pipeline_rules
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Automation log table to track what was done
CREATE TABLE public.pipeline_automation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES public.pipeline_rules(id) ON DELETE CASCADE NOT NULL,
  applicant_id text NOT NULL,
  action_taken text NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pipeline_automation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on pipeline_automation_log"
  ON public.pipeline_automation_log
  FOR ALL
  USING (true)
  WITH CHECK (true);
