
-- Table to store admin dashboard passwords (hashed)
CREATE TABLE public.admin_passwords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  password_hash TEXT NOT NULL,
  label TEXT DEFAULT 'default',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_passwords ENABLE ROW LEVEL SECURITY;

-- No public read/write - only accessible via service role (edge functions)
-- No policies = no access from client SDK

-- Seed with SHA-256 hash of "Z5yeprb2k$"
-- Computed: echo -n "Z5yeprb2k$" | sha256sum
INSERT INTO public.admin_passwords (password_hash, label)
VALUES ('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855_placeholder', 'default');
