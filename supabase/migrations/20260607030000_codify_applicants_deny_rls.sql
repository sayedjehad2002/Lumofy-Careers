-- Repo hygiene: codify the LIVE RLS state on public.applicants so the repo matches
-- the hardened production database.
--
-- Context: the live DB (verified via the Management API on 2026-06-07) restricts all
-- anon/authenticated access to applicants with explicit DENY policies (USING false).
-- Only the service role (used by the edge functions, which BYPASS RLS) can read/write
-- applicant rows. Earlier repo migrations left permissively-written "Service role ..."
-- policies (FOR SELECT/UPDATE/DELETE USING (true) with no TO clause) that did NOT match
-- the hardened live state — so a rebuild from migrations (supabase db reset) would have
-- silently REGRESSED security and exposed applicant PII to the public anon key.
--
-- This migration drops those stale permissive policies and (re)creates the explicit
-- deny policies that production already has. It is idempotent and safe to run repeatedly,
-- including against the already-hardened live DB (net no-op there).

-- 1) Remove any stale/permissive policies from earlier migrations.
DROP POLICY IF EXISTS "Service role read applicants"      ON public.applicants;
DROP POLICY IF EXISTS "Service role update applicants"    ON public.applicants;
DROP POLICY IF EXISTS "Service role delete applicants"    ON public.applicants;
DROP POLICY IF EXISTS "Service role full access on applicants" ON public.applicants;
DROP POLICY IF EXISTS "Anyone can read applicants"        ON public.applicants;
DROP POLICY IF EXISTS "Anyone can update applicants"      ON public.applicants;

-- 2) Explicit deny for the public roles. The service role bypasses RLS, so the edge
--    functions (get-applicants, update-applicant, delete-applicant, submit-application,
--    analyze-cv, etc.) keep full access. INSERT has no anon/authenticated policy, so it
--    is already denied by default (see 20260607020000_tighten_applicants_insert_rls).
DROP POLICY IF EXISTS "Deny public read on applicants" ON public.applicants;
CREATE POLICY "Deny public read on applicants"
  ON public.applicants FOR SELECT
  TO anon, authenticated
  USING (false);

DROP POLICY IF EXISTS "Deny public update on applicants" ON public.applicants;
CREATE POLICY "Deny public update on applicants"
  ON public.applicants FOR UPDATE
  TO anon, authenticated
  USING (false);

DROP POLICY IF EXISTS "Deny public delete on applicants" ON public.applicants;
CREATE POLICY "Deny public delete on applicants"
  ON public.applicants FOR DELETE
  TO anon, authenticated
  USING (false);
