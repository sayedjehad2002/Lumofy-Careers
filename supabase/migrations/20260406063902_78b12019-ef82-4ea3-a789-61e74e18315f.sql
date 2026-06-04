
-- survey_responses: remove any public SELECT, keep service_role
-- Currently there's no public SELECT on survey_responses, but let's ensure
-- survey_answers: tighten INSERT check
DROP POLICY IF EXISTS "Anyone can submit answers" ON public.survey_answers;

CREATE POLICY "Validated answer submission"
  ON public.survey_answers FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.survey_responses sr
      WHERE sr.id = response_id
        AND sr.status = 'in_progress'
    )
  );

-- Restrict policies table to service_role only
DROP POLICY IF EXISTS "Anyone can read active policies" ON public.policies;

CREATE POLICY "Service role read policies"
  ON public.policies FOR SELECT
  TO service_role
  USING (true);
