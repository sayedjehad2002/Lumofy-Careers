-- Add unique constraint on copilot_memory.key for upsert to work
ALTER TABLE public.copilot_memory ADD CONSTRAINT copilot_memory_key_unique UNIQUE (key);

-- Add a PERMISSIVE policy for copilot_memory so anon clients can access it
-- (currently only has RESTRICTIVE policy which blocks all access without a permissive one)
CREATE POLICY "Allow anon read/write copilot_memory"
  ON public.copilot_memory
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);