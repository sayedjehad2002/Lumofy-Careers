-- Step 2: Deny public INSERT on survey_answers
CREATE POLICY "Deny public insert on survey_answers"
  ON public.survey_answers FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

-- Step 3: Enforce anonymous survey data stripping at database level
CREATE OR REPLACE FUNCTION public.enforce_anonymous_survey()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.surveys
    WHERE id = NEW.survey_id AND is_anonymous = true
  ) THEN
    NEW.respondent_name := NULL;
    NEW.respondent_email := NULL;
    NEW.respondent_department := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_anonymous_survey
  BEFORE INSERT ON public.survey_responses
  FOR EACH ROW EXECUTE FUNCTION public.enforce_anonymous_survey();