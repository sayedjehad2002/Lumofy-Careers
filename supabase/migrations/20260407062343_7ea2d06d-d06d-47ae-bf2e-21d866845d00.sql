
-- Fix security definer view - use INVOKER instead
ALTER VIEW public.surveys_public SET (security_invoker = on);
