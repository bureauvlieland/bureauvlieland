-- Batch B: ensure partners_public view bypasses RLS using a curated, PII-free column set.
-- The view already excludes email/phone/kvk/bank/tokens; switching off security_invoker
-- lets anonymous visitors read the public marketing data while the underlying partners
-- table remains fully RLS-locked (admins + own row via auth_user_id only).
ALTER VIEW public.partners_public SET (security_invoker = false);