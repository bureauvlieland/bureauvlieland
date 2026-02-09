
-- Add forwarded_at column to accommodation_quotes
ALTER TABLE public.accommodation_quotes ADD COLUMN forwarded_at timestamptz;

-- Add new app_settings for reminder configuration
INSERT INTO public.app_settings (id, category, label, description, value_type, value) VALUES
  ('reminder_days_partner_quote', 'system', 'Herinnering partner offerte (dagen)', 'Aantal dagen voordat een herinnering wordt aangemaakt als een partner niet op een logiesverzoek heeft gereageerd', 'number', '5'),
  ('reminder_days_customer_quote', 'system', 'Herinnering klant offerte (dagen)', 'Aantal dagen voordat een herinnering wordt aangemaakt als een klant niet op een doorgestuurde offerte heeft gereageerd', 'number', '7'),
  ('reminder_days_customer_request', 'system', 'Herinnering klant aanvraag (dagen)', 'Aantal dagen voordat een herinnering wordt aangemaakt voor een inactieve programma-aanvraag', 'number', '14'),
  ('reminder_email_enabled', 'features', 'Automatische herinneringsmails', 'Schakel automatische herinneringsmails in of uit', 'boolean', 'true')
ON CONFLICT (id) DO NOTHING;

-- Add email templates for reminders
INSERT INTO public.email_templates (id, name, description, subject, body_html, variables) VALUES
  ('reminder_partner_quote', 'Herinnering partner: offerte gevraagd', 'Herinnering aan partner die nog niet heeft gereageerd op een logiesverzoek', 
   'Herinnering: offerteaanvraag logies voor {{customer_name}}',
   '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<h2 style="color: #0f766e;">Herinnering offerteaanvraag</h2>
<p>Beste {{partner_name}},</p>
<p>We hebben {{days_ago}} dagen geleden een logiesaanvraag naar u gestuurd voor <strong>{{customer_name}}</strong>. We hebben nog geen reactie van u ontvangen.</p>
<div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0;">
<p style="margin: 0;"><strong>Periode:</strong> {{arrival_date}} - {{departure_date}}</p>
<p style="margin: 8px 0 0;"><strong>Gasten:</strong> {{number_of_guests}} personen</p>
</div>
<p>U kunt uw offerte indienen via het partnerportaal:</p>
<div style="text-align: center; margin: 30px 0;">
<a href="{{portal_link}}" style="display: inline-block; background-color: #0f766e; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">Naar partnerportaal →</a>
</div>
<p style="color: #666;">Indien u niet beschikbaar bent voor deze periode, kunt u de aanvraag ook afwijzen in het portaal.</p>
<p>Met vriendelijke groet,<br><strong>Bureau Vlieland</strong></p>
</div>',
   '["partner_name", "customer_name", "days_ago", "arrival_date", "departure_date", "number_of_guests", "portal_link"]'::jsonb),

  ('reminder_customer_quote', 'Herinnering klant: offerte staat klaar', 'Herinnering aan klant die nog geen logiesofferte heeft gekozen',
   'Herinnering: logiesofferte(s) wachten op uw keuze',
   '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<h2 style="color: #0f766e;">Uw logiesofferte(s) wachten op u</h2>
<p>Beste {{customer_name}},</p>
<p>U heeft {{quote_count}} logiesofferte(s) ontvangen voor uw verblijf op Vlieland. We willen u er graag aan herinneren dat deze offertes nog op uw keuze wachten.</p>
<div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0;">
<p style="margin: 0;"><strong>Periode:</strong> {{arrival_date}} - {{departure_date}}</p>
<p style="margin: 8px 0 0;"><strong>Gasten:</strong> {{number_of_guests}} personen</p>
</div>
<div style="text-align: center; margin: 30px 0;">
<a href="{{portal_link}}" style="display: inline-block; background-color: #0f766e; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">Bekijk offertes →</a>
</div>
<p>Met vriendelijke groet,<br><strong>Bureau Vlieland</strong></p>
</div>',
   '["customer_name", "quote_count", "arrival_date", "departure_date", "number_of_guests", "portal_link"]'::jsonb),

  ('reminder_customer_request', 'Herinnering klant: aanvraag openstaand', 'Herinnering aan klant wiens programma-aanvraag lang inactief is',
   'Herinnering: uw aanvraag bij Bureau Vlieland staat nog open',
   '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<h2 style="color: #0f766e;">Uw aanvraag staat nog open</h2>
<p>Beste {{customer_name}},</p>
<p>Uw programma-aanvraag bij Bureau Vlieland staat al {{days_ago}} dagen open. We willen u er graag aan herinneren dat er actie nodig is om uw boeking voort te zetten.</p>
<div style="text-align: center; margin: 30px 0;">
<a href="{{portal_link}}" style="display: inline-block; background-color: #0f766e; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">Ga naar uw programma →</a>
</div>
<p style="color: #666;">Heeft u vragen? Neem contact op via hallo@bureauvlieland.nl of 0562 700 208.</p>
<p>Met vriendelijke groet,<br><strong>Bureau Vlieland</strong></p>
</div>',
   '["customer_name", "days_ago", "portal_link"]'::jsonb)
ON CONFLICT (id) DO NOTHING;
