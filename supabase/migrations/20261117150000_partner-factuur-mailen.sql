-- Inkoopfacturen van partners alleen nog via de inkoop-inbox, fase 1
-- (docs/plan-inkoopfacturen-via-inbox.md, §3.1 en §3.7).
--
-- Het partnerportaal toont voortaan "Factuur mailen" (een mailto: naar de
-- inkoop-inbox) in plaats van de registratiedialogen. Deze instelling zet de
-- oude dialogen tijdelijk terug als de mailroute ergens hapert; standaard
-- uit. Het portaal leest hem met het anonieme sleutel, vandaar is_public.
insert into public.app_settings (id, category, label, description, value_type, value, is_public)
values (
  'partner_invoice_registration_enabled',
  'system',
  'Partners mogen facturen zelf registreren in het portaal',
  'Uit (standaard): partners mailen de pdf van hun factuur naar de inkoop-inbox en zien in het portaal of hij is ontvangen, verwerkt en betaald. Aan: de oude knoppen "Factuur registreren" en "Gefactureerd via e-mail" staan weer in het portaal (noodrem).',
  'boolean',
  'false'::jsonb,
  true
)
on conflict (id) do update
  set is_public = true;

-- De herinneringsmails sturen de partner naar het portaal om te uploaden;
-- voortaan: mail de pdf, met ons nummer erop.
update public.email_templates
   set body_html = replace(
         replace(body_html,
           'Wij verzoeken je vriendelijk de factuur naar Bureau Vlieland te sturen. Wij verwerken deze in onze administratie en factureren het project centraal richting de klant.',
           'Mail de pdf van je factuur naar <a href="mailto:invoices@reply.bureauvlieland.nl">invoices@reply.bureauvlieland.nl</a>, met onze referentie erop. Je hoeft verder niets in te vullen; wij verwerken de factuur en factureren het project centraal richting de klant.'),
         '>Factuur uploaden in portaal<',
         '>Status bekijken in het portaal<'),
       updated_at = now()
 where id = 'partner_invoice_reminder_t1';

update public.email_templates
   set body_html = replace(
         replace(body_html,
           'Om de eindafrekening richting de klant tijdig op te kunnen maken, willen we je vragen je factuur deze week te sturen. Lukt dat niet, laat het ons dan even weten via deze mail.',
           'Om de eindafrekening richting de klant tijdig op te kunnen maken, willen we je vragen de pdf van je factuur deze week te mailen naar <a href="mailto:invoices@reply.bureauvlieland.nl">invoices@reply.bureauvlieland.nl</a>, met onze referentie erop. Lukt dat niet, laat het ons dan even weten via deze mail.'),
         '>Factuur uploaden in portaal<',
         '>Status bekijken in het portaal<'),
       updated_at = now()
 where id = 'partner_invoice_reminder_t7';
