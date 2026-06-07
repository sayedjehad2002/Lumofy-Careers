-- HR access control: a server-enforced allowlist + a custom invite system.
--
-- Before this, ANY signed-in Supabase Auth user passed validate-session (no
-- allowlist). Now: only rows in hr_users (status='active') may use the dashboard.
-- Both tables are RLS-enabled with NO policies → only the service_role (edge
-- functions) can read/write them; anon/authenticated clients are fully denied.

-- ── Allowlist of who may access the HR dashboard ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.hr_users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text UNIQUE NOT NULL,
  role        text NOT NULL DEFAULT 'admin' CHECK (role IN ('owner', 'admin', 'viewer')),
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  invited_by  uuid,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_users ENABLE ROW LEVEL SECURITY;
-- (no policies on purpose → service-role-only access)

-- ── Invites: tokenized, single-use, expiring links to join the HR team ────────
CREATE TABLE IF NOT EXISTS public.invites (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token            text UNIQUE NOT NULL,
  email            text NOT NULL,
  role             text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'viewer')),
  invited_by       uuid,
  invited_by_email text,
  expires_at       timestamptz NOT NULL,
  accepted_at      timestamptz,
  revoked_at       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
-- (no policies on purpose → service-role-only access)

CREATE INDEX IF NOT EXISTS invites_token_idx ON public.invites (token);
CREATE INDEX IF NOT EXISTS invites_email_idx ON public.invites (lower(email));

-- ── Seed the owner so the lockdown can never lock them out ─────────────────────
INSERT INTO public.hr_users (user_id, email, role, status)
VALUES ('5155c5fc-8e6a-45f6-b97d-16681414c810', 'jhasan@lumofy.com', 'owner', 'active')
ON CONFLICT (email) DO UPDATE
  SET user_id = EXCLUDED.user_id, role = 'owner', status = 'active';
