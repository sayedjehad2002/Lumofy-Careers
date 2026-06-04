ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS is_on_probation boolean NOT NULL DEFAULT false;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS probation_start_date date;