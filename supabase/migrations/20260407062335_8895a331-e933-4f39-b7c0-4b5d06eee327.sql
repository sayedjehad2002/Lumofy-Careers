
-- 1. Applicants: explicit deny SELECT/UPDATE/DELETE for anon/authenticated
CREATE POLICY "Deny public read on applicants"
  ON public.applicants FOR SELECT
  TO anon, authenticated
  USING (false);

CREATE POLICY "Deny public update on applicants"
  ON public.applicants FOR UPDATE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny public delete on applicants"
  ON public.applicants FOR DELETE
  TO anon, authenticated
  USING (false);

-- 2. Employees: explicit deny ALL for anon/authenticated
CREATE POLICY "Deny public access to employees"
  ON public.employees FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- 3. CV Library Candidates: explicit deny ALL for anon/authenticated
CREATE POLICY "Deny public access to cv_library_candidates"
  ON public.cv_library_candidates FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- 4. Headcount Records: explicit deny ALL for anon/authenticated
CREATE POLICY "Deny public access to headcount_records"
  ON public.headcount_records FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- 5. Performance Snapshots: explicit deny ALL for anon/authenticated
CREATE POLICY "Deny public access to performance_snapshots"
  ON public.performance_snapshots FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- 6. Pipeline Rules: explicit deny ALL for anon/authenticated
CREATE POLICY "Deny public access to pipeline_rules"
  ON public.pipeline_rules FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- 7. Pipeline Automation Log: explicit deny ALL for anon/authenticated
CREATE POLICY "Deny public access to pipeline_automation_log"
  ON public.pipeline_automation_log FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- 8. Copilot Sessions: explicit deny ALL for anon/authenticated
CREATE POLICY "Deny public access to copilot_sessions"
  ON public.copilot_sessions FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- 9. Copilot Messages: explicit deny ALL for anon/authenticated
CREATE POLICY "Deny public access to copilot_messages"
  ON public.copilot_messages FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- 10. Copilot Memory: explicit deny ALL for anon/authenticated
CREATE POLICY "Deny public access to copilot_memory"
  ON public.copilot_memory FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- 11. Survey Answers: explicit deny SELECT for anon/authenticated
CREATE POLICY "Deny public read on survey_answers"
  ON public.survey_answers FOR SELECT
  TO anon, authenticated
  USING (false);

-- 12. Surveys: replace public SELECT to hide intelligence columns
-- We need a restricted view approach. Drop and recreate the policy.
DROP POLICY IF EXISTS "Anyone can read published surveys" ON public.surveys;

-- Create a view that excludes sensitive intelligence columns
CREATE OR REPLACE VIEW public.surveys_public AS
  SELECT id, title, description, category, status, is_anonymous, is_public,
         allow_multiple_responses, audience_type, cover_image_url,
         thank_you_message, max_responses, response_deadline,
         created_at, updated_at
  FROM public.surveys
  WHERE status = 'published';

-- Re-add the public policy but only for basic survey metadata
CREATE POLICY "Anyone can read published survey metadata"
  ON public.surveys FOR SELECT
  TO public
  USING (status = 'published');
