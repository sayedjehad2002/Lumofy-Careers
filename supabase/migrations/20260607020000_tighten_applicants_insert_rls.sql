-- Audit remediation (post-deploy): remove the public anonymous INSERT on applicants.
--
-- Applications now go exclusively through the `submit-application` edge function,
-- which runs with the service role (bypassing RLS) and validates that the job is
-- open and not past its deadline, server-sets the internal fields (id, status,
-- ai_analysis, rating, timestamps), dedups by (job_id, email), and rate-limits.
--
-- Applied live via the Management API once the frontend was wired to that
-- function; this file is the repo record so migrations match the live schema.

DROP POLICY IF EXISTS "Public can submit applications" ON public.applicants;

-- No replacement anon INSERT policy: anon/authenticated INSERT is now denied by
-- default (RLS). The deny policies for SELECT/UPDATE/DELETE remain in place, so
-- only the service role (the edge function) can create or read applicant rows.
