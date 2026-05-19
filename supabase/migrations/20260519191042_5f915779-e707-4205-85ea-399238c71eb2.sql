CREATE OR REPLACE FUNCTION public.email_templates_block_hardcoded_urls()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  combined text;
  stripped text;
  bad_urls text[];
BEGIN
  combined := coalesce(NEW.body_html, '') || ' ' || coalesce(NEW.subject, '');

  -- Whitelist: strip allowed URLs before scanning
  stripped := combined;
  stripped := regexp_replace(stripped, 'https?://[a-z0-9.-]*bureauvlieland\.nl/email-logo[^\s"''<>]*', '', 'gi');
  stripped := regexp_replace(stripped, 'https?://[a-z0-9.-]*reply\.bureauvlieland\.nl[^\s"''<>]*', '', 'gi');
  -- Templating-variabelen die volledig de URL leveren (bv. {{portal_url}})
  stripped := regexp_replace(stripped, '\{\{\s*\w+\s*\}\}', '', 'g');

  SELECT array_agg(DISTINCT m[1])
    INTO bad_urls
  FROM regexp_matches(stripped, '(https?://[^\s"''<>{}]+)', 'g') AS m;

  IF bad_urls IS NOT NULL AND array_length(bad_urls, 1) > 0 THEN
    RAISE EXCEPTION
      'Email template "%": hardcoded URL(s) niet toegestaan. Gebruik een {{variable}} of voeg toe aan whitelist. Gevonden: %',
      NEW.id, array_to_string(bad_urls, ', ')
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS email_templates_block_hardcoded_urls_trg ON public.email_templates;
CREATE TRIGGER email_templates_block_hardcoded_urls_trg
BEFORE INSERT OR UPDATE OF body_html, subject ON public.email_templates
FOR EACH ROW EXECUTE FUNCTION public.email_templates_block_hardcoded_urls();