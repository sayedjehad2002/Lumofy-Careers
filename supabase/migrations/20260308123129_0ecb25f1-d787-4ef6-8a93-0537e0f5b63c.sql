
-- Surveys table
CREATE TABLE public.surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  category text NOT NULL DEFAULT 'custom',
  audience_type text NOT NULL DEFAULT 'internal',
  is_anonymous boolean NOT NULL DEFAULT false,
  allow_multiple_responses boolean NOT NULL DEFAULT false,
  response_deadline timestamptz,
  thank_you_message text DEFAULT 'Thank you for completing this survey!',
  cover_image_url text,
  status text NOT NULL DEFAULT 'draft',
  is_public boolean NOT NULL DEFAULT true,
  max_responses integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Survey questions table
CREATE TABLE public.survey_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  type text NOT NULL,
  question_text text NOT NULL DEFAULT '',
  help_text text,
  placeholder text,
  is_required boolean NOT NULL DEFAULT false,
  options jsonb DEFAULT '[]',
  order_index integer NOT NULL DEFAULT 0,
  settings jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Survey responses table
CREATE TABLE public.survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  respondent_name text,
  respondent_email text,
  respondent_department text,
  is_anonymous boolean NOT NULL DEFAULT false,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'in_progress'
);

-- Survey answers table
CREATE TABLE public.survey_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL REFERENCES public.survey_responses(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.survey_questions(id) ON DELETE CASCADE,
  answer_text text,
  answer_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_answers ENABLE ROW LEVEL SECURITY;

-- Surveys RLS
CREATE POLICY "Anyone can read published surveys" ON public.surveys FOR SELECT USING (status = 'published');
CREATE POLICY "Service role full access on surveys" ON public.surveys FOR ALL USING (true) WITH CHECK (true);

-- Questions RLS
CREATE POLICY "Anyone can read questions of published surveys" ON public.survey_questions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.surveys WHERE id = survey_id AND status = 'published')
);
CREATE POLICY "Service role full access on survey_questions" ON public.survey_questions FOR ALL USING (true) WITH CHECK (true);

-- Responses RLS
CREATE POLICY "Anyone can submit responses" ON public.survey_responses FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role full access on survey_responses" ON public.survey_responses FOR ALL USING (true) WITH CHECK (true);

-- Answers RLS
CREATE POLICY "Anyone can submit answers" ON public.survey_answers FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role full access on survey_answers" ON public.survey_answers FOR ALL USING (true) WITH CHECK (true);

-- Triggers
CREATE TRIGGER update_surveys_updated_at BEFORE UPDATE ON public.surveys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_survey_questions_survey_id ON public.survey_questions(survey_id);
CREATE INDEX idx_survey_responses_survey_id ON public.survey_responses(survey_id);
CREATE INDEX idx_survey_answers_response_id ON public.survey_answers(response_id);
CREATE INDEX idx_survey_answers_question_id ON public.survey_answers(question_id);
