-- Record where an application actually came from.
--
-- Until now nothing recorded a source. The dashboard's "Sources" tab derived one
-- from whether the candidate happened to fill in their LinkedIn or portfolio
-- field, which measured form completeness and presented it as an acquisition
-- channel: all 365 existing applications in fact arrived through the careers page.
--
-- `source` is written by submit-application on every new application from now on,
-- defaulting to 'Direct'. That makes NULL mean exactly one thing — "submitted
-- before tracking existed" — so historic rows can be reported as untracked
-- instead of guessed at.
ALTER TABLE public.applicants
  ADD COLUMN IF NOT EXISTS source        text,
  ADD COLUMN IF NOT EXISTS referrer      text,
  ADD COLUMN IF NOT EXISTS utm_source    text,
  ADD COLUMN IF NOT EXISTS utm_medium    text,
  ADD COLUMN IF NOT EXISTS utm_campaign  text;

COMMENT ON COLUMN public.applicants.source IS
  'Normalised acquisition channel set server-side (LinkedIn, Google, Direct, ...). NULL = applied before source tracking was added.';

-- The Sources tab groups by this on every load.
CREATE INDEX IF NOT EXISTS applicants_source_idx ON public.applicants (source);
