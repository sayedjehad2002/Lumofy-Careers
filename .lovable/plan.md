

# Security Enhancement Plan

## Findings from Scan

Four issues identified:

1. **Jobs table exposes internal fields publicly** — `SELECT *` on public jobs returns `ai_scoring_weights`, `linkedin_draft_text`, `linkedin_share_caption`, `linkedin_job_id`, `linkedin_last_error`, `jd_file_path`, `screening_questions`, etc. to unauthenticated users via the browser.

2. **Survey answers missing explicit INSERT deny policy** — While no client code writes directly, there's no explicit deny for `anon`/`authenticated` INSERT on `survey_answers`.

3. **Survey responses allow identity spoofing** — Public INSERT allows arbitrary `respondent_name`/`respondent_email` with no server-side validation.

4. **Non-anonymous surveys store respondent identity** — When `is_anonymous=true`, respondent fields should be enforced as null at the database level.

## Plan

### Step 1: Restrict public jobs query to safe columns

Change `src/contexts/CareersContext.tsx` line 141 from `select("*")` to explicitly list only public-safe columns:

```
id, title, department, location, type, status, summary, description,
responsibilities, requirements, benefits, salary_range, salary_currency,
posted_date, deadline
```

This prevents `ai_scoring_weights`, `screening_questions`, `jd_file_path`, `linkedin_*` fields from being sent to the browser for unauthenticated users. The dashboard (authenticated) already uses `adminQuery` for full job data.

### Step 2: Add explicit DENY INSERT policy on `survey_answers`

SQL migration:
```sql
CREATE POLICY "Deny public insert on survey_answers"
  ON public.survey_answers FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);
```

### Step 3: Enforce anonymous survey data stripping at database level

SQL migration — add a trigger that nullifies respondent fields when the survey is anonymous:

```sql
CREATE OR REPLACE FUNCTION public.enforce_anonymous_survey()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
```

### Step 4: Update security scan findings

- Delete/update resolved findings after implementation.

## Impact

- No UX changes — public job pages don't use internal fields
- Dashboard continues working via `adminQuery` (service_role)
- Survey submission flow unchanged; anonymous responses now enforced server-side

