
-- Phase 2: Tone-of-voice harmonisation for email templates
-- Customer templates → fully formal "u/uw"; Partner templates → informal "je/jij/jouw"

-- ---- CUSTOMER (formal) ----

UPDATE public.email_templates
SET subject = 'Uw boeking is definitief — {{reference_number}}',
    body_html = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color:#333;">
  <h2 style="color:#1e3a5f;">Uw boeking is definitief!</h2>
  <p>Beste {{customer_name}},</p>
  <p>Hartelijk dank voor uw boeking bij Bureau Vlieland. Hieronder vindt u de bevestiging van uw programma. Alle activiteiten zijn nu definitief in de planning vastgelegd.</p>
  {{#if booking_summary}}{{booking_summary}}{{/if}}
  <p>Heeft u nog vragen? U kunt deze e-mail beantwoorden of contact met ons opnemen via uw klantportaal.</p>
  <p>We kijken ernaar uit u te ontvangen op Vlieland.</p>
  <p>Met vriendelijke groet,<br>Bureau Vlieland</p>
</div>',
    updated_at = now()
WHERE id = 'booking_confirmed_customer';

UPDATE public.email_templates
SET subject = 'Uw programma is bijgewerkt — {{reference_number}}',
    body_html = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color:#333;">
  <p>Beste {{customer_name}},</p>
  <p>Uw programma is bijgewerkt. Hieronder vindt u een overzicht van de wijzigingen:</p>
  {{#if changes_summary}}{{changes_summary}}{{/if}}
  <p>U kunt het bijgewerkte programma in uw klantportaal bekijken: <a href="{{portal_url}}">{{portal_url}}</a></p>
  <p>Heeft u vragen over deze wijzigingen? U kunt eenvoudig op deze e-mail reageren.</p>
  <p>Met vriendelijke groet,<br>Bureau Vlieland</p>
</div>',
    updated_at = now()
WHERE id = 'item_changes_customer';

UPDATE public.email_templates
SET subject = 'Nieuw bericht van Bureau Vlieland',
    body_html = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color:#333;">
  <p>Beste {{visitor_name}},</p>
  <p>U heeft een nieuw bericht ontvangen van Bureau Vlieland in uw chatgesprek:</p>
  <blockquote style="border-left: 3px solid #1e3a5f; padding: 8px 16px; margin: 16px 0; background:#f8f9fa; color:#333;">
    {{message_preview}}
  </blockquote>
  <p>U kunt direct reageren via de chat:</p>
  <p><a href="{{chat_url}}" style="display:inline-block; background:#1e3a5f; color:#fff; padding:12px 24px; border-radius:6px; text-decoration:none;">Open de chat</a></p>
  <p>Met vriendelijke groet,<br>Bureau Vlieland</p>
</div>',
    updated_at = now()
WHERE id = 'chat_reply_visitor';

-- For mixed-tone templates: use targeted regex (case-sensitive on capitalised forms to avoid breaking words like "uur", "buurt")
UPDATE public.email_templates
SET body_html = regexp_replace(
                  regexp_replace(
                    regexp_replace(
                      regexp_replace(body_html, '\mje boeking\M', 'uw boeking', 'gi'),
                    '\mjouw\M', 'uw', 'gi'),
                  '\mJij\M', 'U', 'g'),
                '\mjij\M', 'u', 'g'),
    updated_at = now()
WHERE id IN ('accommodation_request_customer','cancellation_customer');

-- ---- PARTNER (informal) ----
-- Replace formal "uw" with informal "je" / "jouw" — case-sensitive on standalone "U"/"Uw" words

UPDATE public.email_templates
SET body_html = regexp_replace(
                  regexp_replace(
                    regexp_replace(
                      regexp_replace(
                        regexp_replace(body_html, '\mUw\M', 'Je', 'g'),
                      '\muw\M', 'je', 'g'),
                    '\mU kunt\M', 'Je kunt', 'g'),
                  '\mU heeft\M', 'Je hebt', 'g'),
                '\mU bent\M', 'Je bent', 'g'),
    updated_at = now()
WHERE id IN (
  'accommodation_quote_notification',
  'accommodation_selected_partner',
  'date_change_accommodation',
  'date_change_partner',
  'people_change_accommodation',
  'proforma_commission_notification',
  'quote_expired_partner',
  'reminder_partner_quote'
);

-- 8) booking_confirmed_partner — full rewrite (was bare div, also missing facturatie-instructie)
UPDATE public.email_templates
SET subject = 'Definitieve boeking — {{customer_name}}',
    body_html = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color:#333;">
  <h2 style="color:#1e3a5f;">Definitieve boeking bevestigd</h2>
  <p>Hoi {{partner_name}},</p>
  <p>De klant heeft de boeking definitief bevestigd. Hieronder vind je de details:</p>
  {{#if booking_details}}{{booking_details}}{{/if}}
  <p style="background:#f8f9fa; padding:12px 16px; border-left:3px solid #1e3a5f;"><strong>Facturatie:</strong> Bureau Vlieland verzorgt centraal de facturatie aan de klant. Stuur jouw factuur dus naar <a href="mailto:facturatie@bureauvlieland.nl">facturatie@bureauvlieland.nl</a> en niet rechtstreeks naar de klant.</p>
  <p>Bekijk de boeking in je partnerportaal: <a href="{{portal_url}}">{{portal_url}}</a></p>
  <p>Vragen? Reageer gerust op deze e-mail.</p>
  <p>Met vriendelijke groet,<br>Bureau Vlieland</p>
</div>',
    updated_at = now()
WHERE id = 'booking_confirmed_partner';
