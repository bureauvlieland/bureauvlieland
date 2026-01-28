-- Create email templates table for managing transactional email content
CREATE TABLE public.email_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Only admins can manage templates
CREATE POLICY "Admins can view all email templates"
  ON public.email_templates FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert email templates"
  ON public.email_templates FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update email templates"
  ON public.email_templates FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete email templates"
  ON public.email_templates FOR DELETE
  USING (is_admin(auth.uid()));

-- Add update trigger
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default templates for all email types
INSERT INTO public.email_templates (id, name, description, subject, body_html, variables) VALUES
-- Program request emails
('program_request_bureau', 'Programma aanvraag (Bureau)', 'Email naar Bureau Vlieland bij nieuwe programma-aanvraag', 
 'Nieuwe programma-aanvraag van {{customer_name}}',
 '<h1>Nieuwe programma-aanvraag ontvangen</h1><p>Beste Bureau Vlieland,</p><p>Er is een nieuwe programma-aanvraag binnengekomen van <strong>{{customer_name}}</strong> ({{customer_company}}).</p><p><strong>Details:</strong></p><ul><li>Aantal personen: {{number_of_people}}</li><li>Email: {{customer_email}}</li><li>Telefoon: {{customer_phone}}</li></ul><p>Bekijk de volledige aanvraag in het admin panel.</p>',
 '["customer_name", "customer_company", "customer_email", "customer_phone", "number_of_people"]'::jsonb),

('program_request_customer', 'Programma aanvraag (Klant)', 'Bevestigingsmail naar klant na programma-aanvraag',
 'Uw programma-aanvraag is ontvangen',
 '<h1>Bedankt voor uw aanvraag!</h1><p>Beste {{customer_name}},</p><p>We hebben uw programma-aanvraag voor {{number_of_people}} personen ontvangen.</p><p>U kunt uw programma volgen via deze link:</p><p><a href="{{portal_url}}">Bekijk uw programma</a></p><p>Heeft u vragen? Neem gerust contact met ons op.</p><p>Met vriendelijke groet,<br>Bureau Vlieland</p>',
 '["customer_name", "number_of_people", "portal_url"]'::jsonb),

('program_request_partner', 'Programma aanvraag (Partner)', 'Notificatie naar partner bij nieuwe boeking',
 'Nieuwe aanvraag voor {{activity_name}}',
 '<h1>Nieuwe activiteit aangevraagd</h1><p>Beste {{partner_name}},</p><p>Er is een nieuwe aanvraag binnengekomen voor <strong>{{activity_name}}</strong>.</p><p><strong>Klantgegevens:</strong></p><ul><li>Naam: {{customer_name}}</li><li>Bedrijf: {{customer_company}}</li><li>Aantal personen: {{number_of_people}}</li></ul><p>Log in op het partnerportaal om te reageren.</p><p>Met vriendelijke groet,<br>Bureau Vlieland</p>',
 '["partner_name", "activity_name", "customer_name", "customer_company", "number_of_people"]'::jsonb),

-- Status update emails
('status_confirmed', 'Status: Bevestigd', 'Email wanneer activiteit bevestigd wordt',
 'Uw activiteit {{activity_name}} is bevestigd!',
 '<h1>Activiteit bevestigd</h1><p>Beste {{customer_name}},</p><p>Goed nieuws! Uw activiteit <strong>{{activity_name}}</strong> is bevestigd door {{partner_name}}.</p>{{#if quoted_price}}<p><strong>Prijs:</strong> €{{quoted_price}}</p>{{/if}}{{#if status_note}}<p><strong>Opmerking:</strong> {{status_note}}</p>{{/if}}<p><a href="{{portal_url}}">Bekijk uw programma</a></p><p>Met vriendelijke groet,<br>Bureau Vlieland</p>',
 '["customer_name", "activity_name", "partner_name", "quoted_price", "status_note", "portal_url"]'::jsonb),

('status_unavailable', 'Status: Niet beschikbaar', 'Email wanneer activiteit niet beschikbaar is',
 'Helaas: {{activity_name}} is niet beschikbaar',
 '<h1>Activiteit niet beschikbaar</h1><p>Beste {{customer_name}},</p><p>Helaas is <strong>{{activity_name}}</strong> niet beschikbaar op de door u gewenste datum.</p>{{#if status_note}}<p><strong>Reden:</strong> {{status_note}}</p>{{/if}}<p>We zoeken graag samen naar een alternatief.</p><p><a href="{{portal_url}}">Bekijk uw programma</a></p><p>Met vriendelijke groet,<br>Bureau Vlieland</p>',
 '["customer_name", "activity_name", "status_note", "portal_url"]'::jsonb),

('status_alternative', 'Status: Alternatief', 'Email wanneer alternatief wordt voorgesteld',
 'Alternatief voorstel voor {{activity_name}}',
 '<h1>Alternatief voorstel</h1><p>Beste {{customer_name}},</p><p>Voor <strong>{{activity_name}}</strong> hebben we een alternatief voorstel.</p>{{#if status_note}}<p><strong>Voorstel:</strong> {{status_note}}</p>{{/if}}<p>Bekijk het alternatief in uw programma-overzicht.</p><p><a href="{{portal_url}}">Bekijk uw programma</a></p><p>Met vriendelijke groet,<br>Bureau Vlieland</p>',
 '["customer_name", "activity_name", "status_note", "portal_url"]'::jsonb),

-- Cancellation emails
('cancellation_customer', 'Annulering (Klant)', 'Bevestiging van annulering naar klant',
 'Uw programma-aanvraag is geannuleerd',
 '<h1>Programma geannuleerd</h1><p>Beste {{customer_name}},</p><p>Uw programma-aanvraag is succesvol geannuleerd.</p>{{#if cancellation_reason}}<p><strong>Reden:</strong> {{cancellation_reason}}</p>{{/if}}<p>Mocht u in de toekomst alsnog een bedrijfsuitje naar Vlieland willen organiseren, horen we dat graag!</p><p>Met vriendelijke groet,<br>Bureau Vlieland</p>',
 '["customer_name", "cancellation_reason"]'::jsonb),

('cancellation_partner', 'Annulering (Partner)', 'Annuleringsnotificatie naar partner',
 'Annulering: {{activity_name}} voor {{customer_name}}',
 '<h1>Activiteit geannuleerd</h1><p>Beste {{partner_name}},</p><p>De volgende activiteit is geannuleerd:</p><ul><li><strong>Activiteit:</strong> {{activity_name}}</li><li><strong>Klant:</strong> {{customer_name}}</li></ul>{{#if cancellation_reason}}<p><strong>Reden:</strong> {{cancellation_reason}}</p>{{/if}}<p>Met vriendelijke groet,<br>Bureau Vlieland</p>',
 '["partner_name", "activity_name", "customer_name", "cancellation_reason"]'::jsonb),

('cancellation_bureau', 'Annulering (Bureau)', 'Annuleringsnotificatie naar Bureau Vlieland',
 'Programma geannuleerd: {{customer_name}}',
 '<h1>Programma geannuleerd</h1><p>Het programma van <strong>{{customer_name}}</strong> ({{customer_company}}) is geannuleerd.</p>{{#if cancellation_reason}}<p><strong>Reden:</strong> {{cancellation_reason}}</p>{{/if}}',
 '["customer_name", "customer_company", "cancellation_reason"]'::jsonb),

-- Accommodation emails
('accommodation_request_bureau', 'Logies aanvraag (Bureau)', 'Email naar Bureau bij nieuwe logies-aanvraag',
 'Nieuwe logies-aanvraag van {{customer_name}}',
 '<h1>Nieuwe logies-aanvraag</h1><p>Er is een nieuwe logies-aanvraag binnengekomen:</p><ul><li><strong>Naam:</strong> {{customer_name}}</li><li><strong>Bedrijf:</strong> {{customer_company}}</li><li><strong>Aantal gasten:</strong> {{number_of_guests}}</li><li><strong>Aankomst:</strong> {{arrival_date}}</li><li><strong>Vertrek:</strong> {{departure_date}}</li></ul>{{#if special_requests}}<p><strong>Bijzondere wensen:</strong> {{special_requests}}</p>{{/if}}',
 '["customer_name", "customer_company", "number_of_guests", "arrival_date", "departure_date", "special_requests"]'::jsonb),

('accommodation_request_customer', 'Logies aanvraag (Klant)', 'Bevestiging naar klant na logies-aanvraag',
 'Uw logies-aanvraag is ontvangen',
 '<h1>Bedankt voor uw logies-aanvraag!</h1><p>Beste {{customer_name}},</p><p>We hebben uw logies-aanvraag voor {{number_of_guests}} gasten ontvangen.</p><p><strong>Periode:</strong> {{arrival_date}} t/m {{departure_date}}</p><p>Wij gaan direct aan de slag om geschikte accommodaties voor u te vinden. U ontvangt binnen enkele werkdagen de eerste offertes.</p><p><a href="{{portal_url}}">Bekijk uw aanvraag</a></p><p>Met vriendelijke groet,<br>Bureau Vlieland</p>',
 '["customer_name", "number_of_guests", "arrival_date", "departure_date", "portal_url"]'::jsonb),

('accommodation_quote_notification', 'Logies offerte notificatie', 'Email naar klant bij nieuwe offerte',
 'Nieuwe logies-offerte ontvangen: {{accommodation_name}}',
 '<h1>Nieuwe offerte ontvangen!</h1><p>Beste {{customer_name}},</p><p>Goed nieuws! We hebben een nieuwe offerte ontvangen voor uw logies-aanvraag:</p><ul><li><strong>Accommodatie:</strong> {{accommodation_name}}</li><li><strong>Totaalprijs:</strong> €{{price_total}}</li><li><strong>Geldig tot:</strong> {{valid_until}}</li></ul><p>Bekijk de offerte en vergelijk met eventuele andere opties:</p><p><a href="{{portal_url}}">Bekijk offertes</a></p><p>Met vriendelijke groet,<br>Bureau Vlieland</p>',
 '["customer_name", "accommodation_name", "price_total", "valid_until", "portal_url"]'::jsonb),

('accommodation_selected_partner', 'Logies gekozen (Partner)', 'Notificatie naar partner wanneer offerte gekozen wordt',
 'Uw offerte is gekozen door {{customer_name}}',
 '<h1>Gefeliciteerd!</h1><p>Beste partner,</p><p>Uw offerte voor <strong>{{accommodation_name}}</strong> is gekozen door {{customer_name}}.</p><p><strong>Details:</strong></p><ul><li>Aantal gasten: {{number_of_guests}}</li><li>Aankomst: {{arrival_date}}</li><li>Vertrek: {{departure_date}}</li></ul><p>U kunt rechtstreeks contact opnemen met de klant voor verdere afhandeling.</p><p>Met vriendelijke groet,<br>Bureau Vlieland</p>',
 '["accommodation_name", "customer_name", "number_of_guests", "arrival_date", "departure_date"]'::jsonb),

('accommodation_selected_customer', 'Logies gekozen (Klant)', 'Bevestiging naar klant na kiezen offerte',
 'Uw logies is geboekt: {{accommodation_name}}',
 '<h1>Logies bevestigd!</h1><p>Beste {{customer_name}},</p><p>Uw logies bij <strong>{{accommodation_name}}</strong> is bevestigd.</p><p><strong>Details:</strong></p><ul><li>Periode: {{arrival_date}} t/m {{departure_date}}</li><li>Aantal gasten: {{number_of_guests}}</li></ul><p>De accommodatie neemt binnenkort contact met u op voor verdere details.</p><p>Met vriendelijke groet,<br>Bureau Vlieland</p>',
 '["customer_name", "accommodation_name", "arrival_date", "departure_date", "number_of_guests"]'::jsonb),

-- Other emails
('partner_invitation', 'Partner uitnodiging', 'Email voor nieuwe partner-uitnodigingen',
 'Welkom bij Bureau Vlieland - Partner Portal',
 '<h1>Welkom bij Bureau Vlieland!</h1><p>Beste {{partner_name}},</p><p>U bent uitgenodigd om partner te worden van Bureau Vlieland.</p><p>Met uw partner-account kunt u:</p><ul><li>Boekingsaanvragen ontvangen en beheren</li><li>Uw beschikbaarheid aangeven</li><li>Facturen registreren</li></ul><p>Klik hieronder om uw wachtwoord in te stellen en aan de slag te gaan:</p><p><a href="{{invite_url}}">Account activeren</a></p><p>Met vriendelijke groet,<br>Bureau Vlieland</p>',
 '["partner_name", "invite_url"]'::jsonb),

('quote_request_bureau', 'Offerte aanvraag (Bureau)', 'Email naar Bureau bij offerte-aanvraag via website',
 'Nieuwe offerte-aanvraag van {{customer_name}}',
 '<h1>Nieuwe offerte-aanvraag</h1><ul><li><strong>Naam:</strong> {{customer_name}}</li><li><strong>Bedrijf:</strong> {{customer_company}}</li><li><strong>Email:</strong> {{customer_email}}</li><li><strong>Telefoon:</strong> {{customer_phone}}</li><li><strong>Aantal personen:</strong> {{number_of_people}}</li><li><strong>Budget p.p.:</strong> {{budget}}</li></ul><p><strong>Beschrijving:</strong></p><p>{{description}}</p>',
 '["customer_name", "customer_company", "customer_email", "customer_phone", "number_of_people", "budget", "description"]'::jsonb),

('quote_request_customer', 'Offerte aanvraag (Klant)', 'Bevestiging naar klant na offerte-aanvraag',
 'Uw offerte-aanvraag is ontvangen',
 '<h1>Bedankt voor uw aanvraag!</h1><p>Beste {{customer_name}},</p><p>We hebben uw offerte-aanvraag ontvangen en nemen zo snel mogelijk contact met u op.</p><p><strong>Uw aanvraag:</strong></p><ul><li>Aantal personen: {{number_of_people}}</li><li>Budget per persoon: {{budget}}</li></ul><p>Heeft u vragen? Bel ons gerust op 0562-451234.</p><p>Met vriendelijke groet,<br>Bureau Vlieland</p>',
 '["customer_name", "number_of_people", "budget"]'::jsonb),

('customer_program_update_partner', 'Programma wijziging (Partner)', 'Notificatie naar partner bij programma-wijziging',
 'Wijziging in programma van {{customer_name}}',
 '<h1>Programma-wijziging</h1><p>Beste {{partner_name}},</p><p>Er is een wijziging doorgevoerd in het programma van {{customer_name}}.</p><p>Log in op het partnerportaal om de wijzigingen te bekijken.</p><p>Met vriendelijke groet,<br>Bureau Vlieland</p>',
 '["partner_name", "customer_name"]'::jsonb);