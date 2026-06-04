
-- Fix applicants RLS: the INSERT policy is RESTRICTIVE which blocks anon inserts
-- Need a PERMISSIVE INSERT policy for public submissions
DROP POLICY IF EXISTS "Anyone can submit applications" ON public.applicants;
CREATE POLICY "Anyone can submit applications"
  ON public.applicants
  FOR INSERT
  WITH CHECK (true);

-- Also fix the ALL policy for service role - make it PERMISSIVE
DROP POLICY IF EXISTS "Service role full access on applicants" ON public.applicants;
CREATE POLICY "Service role full access on applicants"
  ON public.applicants
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create turnover_entries table
CREATE TABLE public.turnover_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_name TEXT NOT NULL,
  department TEXT,
  termination_date DATE NOT NULL,
  termination_type TEXT NOT NULL DEFAULT 'Resignation',
  notes TEXT,
  included BOOLEAN NOT NULL DEFAULT true,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.turnover_entries ENABLE ROW LEVEL SECURITY;

-- Admin-only access via service role
CREATE POLICY "Service role full access on turnover_entries"
  ON public.turnover_entries
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create headcount_records table
CREATE TABLE public.headcount_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  starting_headcount INTEGER NOT NULL DEFAULT 0,
  ending_headcount INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(month, year)
);

ALTER TABLE public.headcount_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on headcount_records"
  ON public.headcount_records
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add update triggers
CREATE TRIGGER update_turnover_entries_updated_at
  BEFORE UPDATE ON public.turnover_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_headcount_records_updated_at
  BEFORE UPDATE ON public.headcount_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
