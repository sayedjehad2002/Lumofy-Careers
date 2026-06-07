-- Fix HR Dashboard admin login + set the configured admin password.
--
-- The original seed (20260224095955_7b0b8886-...) stored a PLACEHOLDER hash (the SHA-256
-- of an empty string + "_placeholder"), so verify-password rejected every login. This
-- migration stores the real hash. The value is the lowercase hex SHA-256 of the
-- configured admin password; verify-password accepts this legacy form and upgrades it to
-- salted PBKDF2 on the first successful login. Idempotent -- safe to re-run.
--
-- Pairs with the email gate in supabase/functions/verify-password (ADMIN_EMAIL =
-- jhasan@lumofy.com). SECURITY: the plaintext password is intentionally NOT recorded here.

DELETE FROM public.admin_passwords WHERE label = 'default';
INSERT INTO public.admin_passwords (password_hash, label)
VALUES ('3f4d303e2c70725d86170c9c8df62cec70a768eb833d85f0f2f6651a8d1f0663', 'default');
