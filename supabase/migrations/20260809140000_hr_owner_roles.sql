-- Make hr_users.role the single source of truth for team management.
--
-- Team management used to be gated by a hardcoded email list inside the hr-team
-- edge function (jhasan@ and halhashimi@). That meant the role column disagreed
-- with the code: halhashimi was stored as 'admin' yet had owner powers, and
-- changing who manages the team required editing and redeploying a function.
--
-- hr-team now grants management on role = 'owner'. Promoting halhashimi keeps
-- the effective permissions identical to what the email list already allowed --
-- this changes where the rule lives, not who can do what.
--
-- Idempotent: re-running is a no-op.
UPDATE public.hr_users
SET role = 'owner'
WHERE email = 'halhashimi@lumofy.com'
  AND role <> 'owner';
