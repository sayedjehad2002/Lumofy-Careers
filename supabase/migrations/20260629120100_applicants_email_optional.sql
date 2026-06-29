-- Email is optional for HR-added candidates (e.g. promoting a CV-library
-- candidate or a referral into the pipeline before an email is on file). Drop the
-- NOT NULL constraint so create/insert no longer 500s when email is absent.
-- The public apply flow still requires email at the form/Zod layer; this only
-- relaxes the column so HR-initiated records can be created without one.
-- Applied live via the Management API; this file is the repo record so a fresh
-- database matches production.

ALTER TABLE public.applicants ALTER COLUMN email DROP NOT NULL;
