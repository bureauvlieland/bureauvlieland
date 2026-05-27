
INSERT INTO public.email_templates (id, name, subject, body_html, is_active, description, variables) VALUES
(
  'partner_activity_unconfirmed_t7',
  'Partner — activiteit onbevestigd (T-7)',
  'Reactie nodig: {{block_name}} over 7 dagen voor {{customer_name}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 24px; border-radius: 8px 8px 0 0;"><h1 style="color: white; margin: 0; font-size: 22px;">Bureau Vlieland</h1><p style="color: white; margin: 4px 0 0; opacity: 0.9; font-size: 14px;">Reactie gevraagd — uitvoering nadert</p></div><div style="padding: 24px; background: #fff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;"><p>Hoi {{partner_name}},</p><p>De activiteit <strong>{{block_name}}</strong> voor <strong>{{customer_name}}</strong> staat over <strong>7 dagen</strong> ({{event_date}}) gepland, maar we hebben nog geen bevestiging van je ontvangen.</p><p>Wil je deze vandaag nog bevestigen of weigeren via je partnerportaal? Zo kunnen wij richting de klant op tijd duidelijkheid geven.</p><p style="margin: 24px 0;"><a href="{{portal_url}}" style="display:inline-block; background:#d97706; color:white; padding:12px 24px; text-decoration:none; border-radius:6px; font-weight:600;">Naar het partnerportaal</a></p><hr style="border:none; border-top:1px solid #e5e7eb; margin:24px 0;" /><p style="font-size: 13px; color: #6b7280;">Bureau Vlieland regelt de communicatie en facturatie richting de klant — wij staan tussen jou en de klant in.</p><p style="font-size: 13px; color: #6b7280;">Met vriendelijke groet,<br/>Bureau Vlieland</p></div></div>',
  true,
  'Escalatie naar partner als een activiteit 7 dagen voor de uitvoeringsdatum nog niet is bevestigd.',
  '["partner_name", "block_name", "customer_name", "event_date", "portal_url"]'::jsonb
),
(
  'partner_briefing_t3',
  'Partner — briefing (T-3)',
  'Briefing: {{block_name}} over 3 dagen voor {{customer_name}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 24px; border-radius: 8px 8px 0 0;"><h1 style="color: white; margin: 0; font-size: 22px;">Bureau Vlieland</h1><p style="color: white; margin: 4px 0 0; opacity: 0.9; font-size: 14px;">Briefing — uitvoering over 3 dagen</p></div><div style="padding: 24px; background: #fff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;"><p>Hoi {{partner_name}},</p><p>Een korte heads-up: over <strong>3 dagen</strong> ({{event_date}}) staat <strong>{{block_name}}</strong> voor <strong>{{customer_name}}</strong> gepland.</p><ul style="line-height: 1.7;"><li><strong>Aantal personen:</strong> {{number_of_people}}</li><li><strong>Tijd:</strong> {{time_info}}</li></ul><p>Loop voor de zekerheid je voorbereiding nog even na (materiaal, weersomstandigheden, route, eventuele dieetwensen). Bijzonderheden of laatste vragen? Laat het ons weten via het partnerportaal of beantwoord deze mail — wij koppelen het direct terug naar de klant.</p><p style="margin: 24px 0;"><a href="{{portal_url}}" style="display:inline-block; background:#2563eb; color:white; padding:12px 24px; text-decoration:none; border-radius:6px; font-weight:600;">Bekijk in partnerportaal</a></p><hr style="border:none; border-top:1px solid #e5e7eb; margin:24px 0;" /><p style="font-size: 13px; color: #6b7280;">Bureau Vlieland regelt de communicatie en facturatie richting de klant — wij staan tussen jou en de klant in.</p><p style="font-size: 13px; color: #6b7280;">Met vriendelijke groet,<br/>Bureau Vlieland</p></div></div>',
  true,
  'Briefing/heads-up naar partner 3 dagen voor de uitvoering van een bevestigde activiteit.',
  '["partner_name", "block_name", "customer_name", "event_date", "number_of_people", "time_info", "portal_url"]'::jsonb
),
(
  'partner_invoice_reminder_t1',
  'Partner — factuurverzoek (T+1)',
  'Vriendelijk verzoek: factuur voor {{block_name}} ({{customer_name}})',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 24px; border-radius: 8px 8px 0 0;"><h1 style="color: white; margin: 0; font-size: 22px;">Bureau Vlieland</h1><p style="color: white; margin: 4px 0 0; opacity: 0.9; font-size: 14px;">Verzoek tot facturatie</p></div><div style="padding: 24px; background: #fff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;"><p>Hoi {{partner_name}},</p><p>Gisteren is <strong>{{block_name}}</strong> voor <strong>{{customer_name}}</strong> uitgevoerd. Bedankt voor de uitvoering!</p><p>Wij verzoeken je vriendelijk de factuur naar Bureau Vlieland te sturen. Wij verwerken deze in onze administratie en factureren het project centraal richting de klant.</p><ul style="line-height: 1.7;"><li><strong>Referentie:</strong> {{reference_number}}</li><li><strong>Bedrag (excl. BTW, indicatief):</strong> {{amount_excl_vat}}</li></ul><p style="margin: 24px 0;"><a href="{{portal_url}}" style="display:inline-block; background:#2563eb; color:white; padding:12px 24px; text-decoration:none; border-radius:6px; font-weight:600;">Factuur uploaden in portaal</a></p><hr style="border:none; border-top:1px solid #e5e7eb; margin:24px 0;" /><p style="font-size: 13px; color: #6b7280;">Bureau Vlieland regelt de communicatie en facturatie richting de klant — stuur facturen daarom niet rechtstreeks naar de klant.</p><p style="font-size: 13px; color: #6b7280;">Met vriendelijke groet,<br/>Bureau Vlieland</p></div></div>',
  true,
  'Verzoek aan partner om factuur te sturen, 1 dag na uitvoering van een activiteit.',
  '["partner_name", "block_name", "customer_name", "reference_number", "amount_excl_vat", "portal_url"]'::jsonb
),
(
  'partner_invoice_reminder_t7',
  'Partner — factuur-escalatie (T+7)',
  'Herinnering: factuur ontbreekt nog voor {{block_name}} ({{customer_name}})',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 24px; border-radius: 8px 8px 0 0;"><h1 style="color: white; margin: 0; font-size: 22px;">Bureau Vlieland</h1><p style="color: white; margin: 4px 0 0; opacity: 0.9; font-size: 14px;">Herinnering — factuur ontbreekt</p></div><div style="padding: 24px; background: #fff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;"><p>Hoi {{partner_name}},</p><p>Een week geleden is <strong>{{block_name}}</strong> voor <strong>{{customer_name}}</strong> uitgevoerd, maar we hebben jouw factuur nog niet binnen.</p><p>Om de eindafrekening richting de klant tijdig op te kunnen maken, willen we je vragen je factuur deze week te sturen. Lukt dat niet, laat het ons dan even weten via deze mail.</p><ul style="line-height: 1.7;"><li><strong>Referentie:</strong> {{reference_number}}</li><li><strong>Bedrag (excl. BTW, indicatief):</strong> {{amount_excl_vat}}</li></ul><p style="margin: 24px 0;"><a href="{{portal_url}}" style="display:inline-block; background:#d97706; color:white; padding:12px 24px; text-decoration:none; border-radius:6px; font-weight:600;">Factuur uploaden in portaal</a></p><hr style="border:none; border-top:1px solid #e5e7eb; margin:24px 0;" /><p style="font-size: 13px; color: #6b7280;">Bureau Vlieland regelt de communicatie en facturatie richting de klant — stuur facturen niet rechtstreeks naar de klant.</p><p style="font-size: 13px; color: #6b7280;">Met vriendelijke groet,<br/>Bureau Vlieland</p></div></div>',
  true,
  'Herinnering/escalatie naar partner als 7 dagen na uitvoering nog geen factuur is geregistreerd.',
  '["partner_name", "block_name", "customer_name", "reference_number", "amount_excl_vat", "portal_url"]'::jsonb
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    subject = EXCLUDED.subject,
    body_html = EXCLUDED.body_html,
    description = EXCLUDED.description,
    variables = EXCLUDED.variables,
    is_active = true,
    updated_at = now();
