-- Wachtwoord-resetlink (zelfservice en admin-reset) is 24 uur geldig in plaats
-- van 1 uur. De echte termijn is de Supabase-instelling "Email OTP expiration"
-- (86400 s, zie supabase/config.toml [auth.email]); dit past alleen de tekst in
-- de mailtemplate aan. De fallback-teksten in de edge functions zijn gelijk
-- aangepast.
update public.email_templates
set body_html = replace(body_html, 'Deze link is persoonlijk en 1 uur geldig.', 'Deze link is persoonlijk en 24 uur geldig.'),
    updated_at = now()
where id = 'partner_password_reset'
  and body_html like '%Deze link is persoonlijk en 1 uur geldig.%';
