
UPDATE public.email_templates
SET
  subject = 'Een vriendelijke herinnering — uw aanvraag bij Bureau Vlieland',
  body_html = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<h2 style="color: #0F4C5C; margin: 0 0 16px;">Even een vriendelijke herinnering</h2>
<p>Beste {{customer_name}},</p>
<p>Uw aanvraag voor een verblijf op Vlieland staat sinds <strong>{{days_since}} dagen</strong> bij ons open. We willen u graag laten weten dat we klaar staan om met u verder te denken.</p>
<p>Heeft u nog vragen of twijfels? Bel of mail ons gerust — we helpen u graag persoonlijk verder. Wilt u doorpakken? Dan opent u via onderstaande knop uw eigen pagina, waar u uw programma kunt afronden.</p>
<div style="text-align: center; margin: 30px 0;">
<a href="{{portal_url}}" style="display: inline-block; background-color: #0F4C5C; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">Open mijn programma →</a>
</div>
<p style="color: #475569;">Bereikbaar via <a href="mailto:hallo@bureauvlieland.nl" style="color:#0F4C5C;">hallo@bureauvlieland.nl</a> of 0562 700 208.</p>
<p>Met hartelijke groet,<br><strong>Bureau Vlieland</strong><br><span style="color:#64748b;font-size:13px;">uw lokale specialist op Vlieland</span></p>
</div>',
  variables = '["customer_name","days_since","portal_url"]'::jsonb
WHERE id = 'reminder_customer_request';

UPDATE public.email_templates
SET
  subject = 'Uw logiesofferte(s) liggen klaar — wij denken graag met u mee',
  body_html = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<h2 style="color: #0F4C5C; margin: 0 0 16px;">Uw logiesofferte(s) staan klaar</h2>
<p>Beste {{customer_name}},</p>
<p>U heeft <strong>{{quote_count}}</strong> logiesofferte(s) ontvangen voor uw verblijf op Vlieland. We willen u graag een seintje geven: de offerte(s) wachten nog op uw keuze.</p>
<div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 3px solid #0F4C5C;">
<p style="margin: 0;"><strong>Periode:</strong> {{arrival_date}} — {{departure_date}}</p>
<p style="margin: 8px 0 0;"><strong>Gasten:</strong> {{number_of_guests}} personen</p>
</div>
<p>Twijfelt u tussen aanbieders, of wilt u een tweede mening? Bel of mail ons gerust, dan denken we met u mee. Klikt u liever zelf door? Dan opent u via onderstaande knop uw persoonlijke pagina met alle details.</p>
<div style="text-align: center; margin: 30px 0;">
<a href="{{portal_url}}" style="display: inline-block; background-color: #0F4C5C; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">Bekijk mijn offertes →</a>
</div>
<p style="color: #475569;">Bereikbaar via <a href="mailto:hallo@bureauvlieland.nl" style="color:#0F4C5C;">hallo@bureauvlieland.nl</a> of 0562 700 208.</p>
<p>Met hartelijke groet,<br><strong>Bureau Vlieland</strong><br><span style="color:#64748b;font-size:13px;">uw lokale specialist op Vlieland</span></p>
</div>',
  variables = '["customer_name","quote_count","arrival_date","departure_date","number_of_guests","portal_url"]'::jsonb
WHERE id = 'reminder_customer_quote';
