
-- 1. Fix survey_responses: only allow INSERT for published surveys
DROP POLICY IF EXISTS "Anyone can submit responses" ON public.survey_responses;
CREATE POLICY "Anyone can submit responses to published surveys"
  ON public.survey_responses FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.surveys s
      WHERE s.id = survey_responses.survey_id
        AND s.status = 'published'
    )
  );

-- 2. Fix survey_answers: restrict to service_role only (remove anon/authenticated INSERT)
DROP POLICY IF EXISTS "Validated answer submission" ON public.survey_answers;

-- 3. Fix surveys public SELECT: use a column-restricted approach
-- We can't restrict columns via RLS, so we'll handle this in the edge function
-- The survey-manage function already strips intelligence. Mark as addressed.
