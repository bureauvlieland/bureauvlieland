ALTER TABLE public.email_log
  ADD COLUMN IF NOT EXISTS html_body text,
  ADD COLUMN IF NOT EXISTS text_body text,
  ADD COLUMN IF NOT EXISTS from_email text,
  ADD COLUMN IF NOT EXISTS reply_to text;