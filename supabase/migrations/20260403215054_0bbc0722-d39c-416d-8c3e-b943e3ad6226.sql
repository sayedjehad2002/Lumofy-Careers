
-- =====================================================
-- CRITICAL SECURITY FIX: Lock down all sensitive tables
-- =====================================================

-- 1. EMPLOYEES - Drop permissive public policy, add service_role only
DROP POLICY IF EXISTS "Service role full access on employees" ON public.employees;
CREATE POLICY "Service role full access on employees"
  ON public.employees FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. CV_LIBRARY_CANDIDATES - Drop permissive public policy, add service_role only
DROP POLICY IF EXISTS "Service role full access on cv_library_candidates" ON public.cv_library_candidates;
CREATE POLICY "Service role full access on cv_library_candidates"
  ON public.cv_library_candidates FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. APPLICANTS - Keep public INSERT for job applications, restrict everything else to service_role
DROP POLICY IF EXISTS "Service role read applicants" ON public.applicants;
DROP POLICY IF EXISTS "Service role update applicants" ON public.applicants;
DROP POLICY IF EXISTS "Service role delete applicants" ON public.applicants;

CREATE POLICY "Service role read applicants"
  ON public.applicants FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role update applicants"
  ON public.applicants FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role delete applicants"
  ON public.applicants FOR DELETE
  TO service_role
  USING (true);

-- 4. TURNOVER_ENTRIES - service_role only
DROP POLICY IF EXISTS "Service role full access on turnover_entries" ON public.turnover_entries;
CREATE POLICY "Service role full access on turnover_entries"
  ON public.turnover_entries FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. COPILOT_SESSIONS - service_role only
DROP POLICY IF EXISTS "Service role full access on copilot_sessions" ON public.copilot_sessions;
CREATE POLICY "Service role full access on copilot_sessions"
  ON public.copilot_sessions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. COPILOT_MESSAGES - service_role only
DROP POLICY IF EXISTS "Service role full access on copilot_messages" ON public.copilot_messages;
CREATE POLICY "Service role full access on copilot_messages"
  ON public.copilot_messages FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 7. COPILOT_MEMORY - Drop BOTH permissive policies, add service_role only
DROP POLICY IF EXISTS "Allow all for copilot_memory" ON public.copilot_memory;
DROP POLICY IF EXISTS "Allow anon read/write copilot_memory" ON public.copilot_memory;
CREATE POLICY "Service role full access on copilot_memory"
  ON public.copilot_memory FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 8. PIPELINE_RULES - service_role only
DROP POLICY IF EXISTS "Service role full access on pipeline_rules" ON public.pipeline_rules;
CREATE POLICY "Service role full access on pipeline_rules"
  ON public.pipeline_rules FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 9. PIPELINE_AUTOMATION_LOG - service_role only
DROP POLICY IF EXISTS "Service role full access on pipeline_automation_log" ON public.pipeline_automation_log;
CREATE POLICY "Service role full access on pipeline_automation_log"
  ON public.pipeline_automation_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 10. HEADCOUNT_RECORDS - service_role only
DROP POLICY IF EXISTS "Service role full access on headcount_records" ON public.headcount_records;
CREATE POLICY "Service role full access on headcount_records"
  ON public.headcount_records FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 11. SURVEY_RESPONSES - Keep public INSERT, restrict read to service_role
DROP POLICY IF EXISTS "Service role full access on survey_responses" ON public.survey_responses;
CREATE POLICY "Service role full access on survey_responses"
  ON public.survey_responses FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 12. SURVEY_ANSWERS - Keep public INSERT, restrict read to service_role
DROP POLICY IF EXISTS "Service role full access on survey_answers" ON public.survey_answers;
CREATE POLICY "Service role full access on survey_answers"
  ON public.survey_answers FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 13. SURVEYS - Drop permissive ALL policy, keep public SELECT for published, add service_role ALL
DROP POLICY IF EXISTS "Service role full access on surveys" ON public.surveys;
CREATE POLICY "Service role full access on surveys"
  ON public.surveys FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 14. SURVEY_QUESTIONS - Drop permissive ALL policy, keep public SELECT for published, add service_role ALL
DROP POLICY IF EXISTS "Service role full access on survey_questions" ON public.survey_questions;
CREATE POLICY "Service role full access on survey_questions"
  ON public.survey_questions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 15. JOBS - Drop permissive ALL policy, keep public SELECT, add service_role for writes
DROP POLICY IF EXISTS "Service role full access on jobs" ON public.jobs;
CREATE POLICY "Service role full access on jobs"
  ON public.jobs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 16. POLICIES TABLE - Drop permissive ALL policy, keep public SELECT for active, add service_role ALL
DROP POLICY IF EXISTS "Service role full access on policies" ON public.policies;
CREATE POLICY "Service role full access on policies"
  ON public.policies FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- STORAGE BUCKET POLICIES - Restrict to service_role
-- =====================================================

-- CVs bucket
DROP POLICY IF EXISTS "Service role can read CVs" ON storage.objects;
DROP POLICY IF EXISTS "Service role can upload CVs" ON storage.objects;
DROP POLICY IF EXISTS "Service role can delete CVs" ON storage.objects;
DROP POLICY IF EXISTS "Applicants can upload CVs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload CVs" ON storage.objects;

CREATE POLICY "Service role only read CVs"
  ON storage.objects FOR SELECT
  TO service_role
  USING (bucket_id = 'cvs');

CREATE POLICY "Service role only upload CVs"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'cvs');

CREATE POLICY "Service role only delete CVs"
  ON storage.objects FOR DELETE
  TO service_role
  USING (bucket_id = 'cvs');

-- CV Library bucket
DROP POLICY IF EXISTS "Service role full access on cv-library" ON storage.objects;
DROP POLICY IF EXISTS "Service role can read cv-library" ON storage.objects;
DROP POLICY IF EXISTS "Service role can upload cv-library" ON storage.objects;
DROP POLICY IF EXISTS "Service role can delete cv-library" ON storage.objects;

CREATE POLICY "Service role only read cv-library"
  ON storage.objects FOR SELECT
  TO service_role
  USING (bucket_id = 'cv-library');

CREATE POLICY "Service role only upload cv-library"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'cv-library');

CREATE POLICY "Service role only delete cv-library"
  ON storage.objects FOR DELETE
  TO service_role
  USING (bucket_id = 'cv-library');

-- JDs bucket
DROP POLICY IF EXISTS "Service role full access on jds" ON storage.objects;
DROP POLICY IF EXISTS "Service role can read JDs" ON storage.objects;
DROP POLICY IF EXISTS "Service role can upload JDs" ON storage.objects;
DROP POLICY IF EXISTS "Service role can delete JDs" ON storage.objects;

CREATE POLICY "Service role only read JDs"
  ON storage.objects FOR SELECT
  TO service_role
  USING (bucket_id = 'jds');

CREATE POLICY "Service role only upload JDs"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'jds');

CREATE POLICY "Service role only delete JDs"
  ON storage.objects FOR DELETE
  TO service_role
  USING (bucket_id = 'jds');
