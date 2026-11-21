-- Notificaties fase 1 (docs/plan-notificaties.md, §5 Fase 1).
--
-- Factuurherinneringen aan partners gaan voortaan als vaste reeks T+3, T+7,
-- T+14, elk precies één keer per onderdeel; daarna geen mail meer maar een
-- hoge prioriteit op de commissietaak van het bureau. Dit is de template van
-- de laatste stap; de fallback staat in check-pending-items.
insert into public.email_templates (id, name, description, subject, body_html, variables, is_active)
values (
  'partner_invoice_reminder_t14',
  'Partner — factuur laatste herinnering (T+14)',
  'Twee weken na uitvoering, nog geen factuur-pdf in de inkoop-inbox. Laatste herinnering per mail; daarna neemt het bureau persoonlijk contact op. Gaat één keer per onderdeel.',
  'Laatste herinnering: factuur voor {{block_name}} ({{customer_name}}, {{reference_number}})',
  $body$
<p>Hoi {{partner_name}},</p>

<p>Twee weken geleden is <strong>{{block_name}}</strong> voor {{customer_name}} uitgevoerd en we hebben je factuur nog niet ontvangen. Dit is onze laatste herinnering per mail; daarna nemen we persoonlijk contact met je op.</p>

<p>Mail de pdf van je factuur naar <a href="mailto:invoices@reply.bureauvlieland.nl">invoices@reply.bureauvlieland.nl</a>, met onze referentie {{reference_number}} erop. Wij factureren centraal aan de klant.</p>

<p>Referentie: {{reference_number}}<br/>
Bedrag (excl. btw, indicatief): {{amount_excl_vat}}</p>

<p style="margin:24px 0;"><a href="{{portal_url}}" style="display:inline-block;padding:12px 20px;background:#0F4C5C;color:#ffffff;text-decoration:none;border-radius:6px;">Status bekijken in het portaal</a></p>

<p>Al gemaild? Dan kruisen onze berichten elkaar en hoef je niets te doen.</p>

<p>Met vriendelijke groet,<br/>Bureau Vlieland</p>
$body$,
  '["partner_name","block_name","customer_name","reference_number","amount_excl_vat","portal_url"]'::jsonb,
  true
)
on conflict (id) do nothing;

-- De T+3-template zei "Gisteren" terwijl de mail na drie dagen gaat.
update public.email_templates
   set body_html = replace(body_html, 'Gisteren is', 'Een paar dagen geleden is'),
       updated_at = now()
 where id = 'partner_invoice_reminder_t1'
   and position('Gisteren is' in body_html) > 0;
