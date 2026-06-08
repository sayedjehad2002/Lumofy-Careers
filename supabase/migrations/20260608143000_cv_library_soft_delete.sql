-- Soft-delete (recycle bin) for the CV library. The cv-library-manage "delete"
-- action used to HARD-delete the row AND remove the stored CV file, irreversibly,
-- so a single mis-click lost a candidate permanently. Now "delete" sets
-- deleted_at (recoverable via the new "restore" action), the "list" action hides
-- trashed rows, and a new "purge" action performs the permanent erasure (GDPR
-- right to be forgotten: removes the file + the row).
-- Mirrors the jobs archive pattern (20260607050000_jobs_soft_delete_archive.sql).
-- Applied live via the SQL editor / Management API; this file is the repo record.

ALTER TABLE public.cv_library_candidates ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Keep the active-list query fast as the recycle bin grows. Matches the
-- cv-library-manage "list" query: active rows ordered by uploaded_at desc.
CREATE INDEX IF NOT EXISTS idx_cv_library_active
  ON public.cv_library_candidates (uploaded_at DESC)
  WHERE deleted_at IS NULL;

-- RLS: no change required. The existing "Service role full access on
-- cv_library_candidates" policy already covers the edge function's reads/writes,
-- and "Deny public access to cv_library_candidates" still blocks anon/public.
