-- Who did what to a candidate, and when.
--
-- Nothing recorded this before. Two gaps in particular:
--
--   * `applicants.stage_entered_at` is a single timestamp that is OVERWRITTEN on
--     every move, so it says when the current stage began and nothing else. The
--     path a candidate took — and who moved them — was never stored, so "who
--     hired this person" was not a question the data could answer even in
--     principle.
--
--   * `applicants.notes` is a bare jsonb array of strings: no author, no
--     timestamp. The "Note #1 / Note #2" labels in the UI are array positions.
--
-- The existing `audit_log` table cannot fill either gap: it has no actor column
-- at all, and 7,214 of its 7,283 rows are `select jobs` noise.
--
-- This table is append-only. Nothing updates or deletes a row except the cascade
-- when a candidate is deleted — an audit trail you can edit is not one.
CREATE TABLE IF NOT EXISTS public.applicant_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- text, not uuid: applicants.id is a text column. The values look like UUIDs
  -- but some are client-generated (`job_<timestamp>` style ids exist elsewhere
  -- in this schema), so the FK has to match the referenced type exactly.
  applicant_id  text NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE,
  kind          text NOT NULL CHECK (kind IN ('stage_change', 'note')),

  -- NULL actor means the system did it, or it happened before this table
  -- existed. Never backfill a person into these: an audit trail that guesses is
  -- worse than one with gaps, because you cannot tell the guesses apart.
  actor_email   text,
  actor_user_id uuid,

  -- stage_change only
  from_status   text,
  to_status     text,

  -- note only
  note          text,

  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.applicant_events IS
  'Append-only record of stage moves and notes per candidate, with the HR user who did it. NULL actor = system, or before this table existed.';
COMMENT ON COLUMN public.applicant_events.actor_email IS
  'Lowercased email of the acting HR user, taken from the validated session. NULL = system or pre-tracking; never inferred.';

-- Every read is "the history for this candidate, newest first".
CREATE INDEX IF NOT EXISTS applicant_events_applicant_idx
  ON public.applicant_events (applicant_id, created_at DESC);

-- Only the edge functions (service role) touch this table. RLS on with no
-- policies denies every anon/authenticated client outright, matching how the
-- rest of the candidate data is protected.
ALTER TABLE public.applicant_events ENABLE ROW LEVEL SECURITY;
