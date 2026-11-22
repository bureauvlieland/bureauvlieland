-- Logies gekozen: wat is inbegrepen en wat volgt (nalezen testmails 22 november).
--
-- De klantmail noemde alleen accommodatie, data, aantal en prijs; de
-- verzorging, de kamers en wat de partner inbegrepen heeft stonden er niet
-- bij. De partnermail zei niets over wat er na de keuze nog komt (gastenlijst,
-- kamerindeling, aantalwijzigingen, vragen via Bureau Vlieland). De code
-- (select-accommodation-quote) geeft board_label, room_configuration_block,
-- includes_block, extras_list en de praktische velden van de aanvraag mee.
-- Beide templates hebben precies één tabel; de blokken komen daar direct na.

update public.email_templates
   set body_html = replace(body_html, '</table>', '</table>'
     || '{{#if board_label}}<p style="margin:16px 0 4px 0;"><strong>Verzorging:</strong> {{board_label}}</p>{{/if}}'
     || '{{room_configuration_block}}'
     || '{{includes_block}}'
     || '{{#if extras_list}}<p style="margin:16px 0 4px 0;"><strong>Extra''s:</strong></p><ul>{{extras_list}}</ul>{{/if}}'
     || '<p style="margin:16px 0 0;color:#4a5568;font-size:14px;">De volledige omschrijving, foto''s en kamers van de accommodatie vindt u op uw klantpagina (knop hieronder). Daar vult u ook de gastenlijst, eventuele dieetwensen en de kamerindeling in; graag uiterlijk twee weken voor aankomst.</p>'),
       variables = (
         select jsonb_agg(v order by v) from (
           select distinct v from (
             select jsonb_array_elements_text(coalesce(variables, '[]'::jsonb)) v
             union select unnest(array['board_label','room_configuration_block','includes_block','extras_list'])
           ) u
         ) s
       ),
       updated_at = now()
 where id = 'accommodation_selected_customer'
   and position('{{board_label}}' in body_html) = 0;

update public.email_templates
   set body_html = replace(body_html, '</table>', '</table>'
     || '{{#if board_label}}<p style="margin:16px 0 4px 0;"><strong>Verzorging:</strong> {{board_label}}</p>{{/if}}'
     || '{{room_configuration_block}}'
     || '{{includes_block}}'
     || '{{#if special_requests}}<p style="margin:16px 0 4px 0;"><strong>Bijzonderheden van de gast:</strong></p><p style="margin:0;white-space:pre-wrap;">{{special_requests}}</p>{{/if}}'
     || '{{#if dietary_notes}}<p style="margin:16px 0 4px 0;"><strong>Dieetwensen:</strong></p><p style="margin:0;white-space:pre-wrap;">{{dietary_notes}}</p>{{/if}}'
     || '{{#if room_assignment}}<p style="margin:16px 0 4px 0;"><strong>Kamerindeling (voorlopig):</strong></p><p style="margin:0;white-space:pre-wrap;">{{room_assignment}}</p>{{/if}}'
     || '<div style="background:#f7fafc;padding:20px;border-radius:8px;margin:20px 0;">'
     || '<h3 style="margin:0 0 8px;color:#2d3748;">Wat volgt</h3>'
     || '<ul style="margin:0;padding-left:18px;color:#4a5568;line-height:1.6;">'
     || '<li>De gast vult de gastenlijst, dieetwensen en kamerindeling in op zijn klantpagina, uiterlijk twee weken voor aankomst. Je ziet dat direct bij deze aanvraag in je partnerportaal; wij sturen er geen aparte mail over.</li>'
     || '<li>Verandert het aantal gasten, dan krijg je daarover een mail en bevestig je het nieuwe aantal en totaal in je partnerportaal.</li>'
     || '<li>Vragen van de gast lopen via Bureau Vlieland; berichten over deze boeking vind je in het berichtenpaneel bij de aanvraag.</li>'
     || '</ul></div>'),
       variables = (
         select jsonb_agg(v order by v) from (
           select distinct v from (
             select jsonb_array_elements_text(coalesce(variables, '[]'::jsonb)) v
             union select unnest(array['board_label','room_configuration_block','includes_block','special_requests','dietary_notes','room_assignment'])
           ) u
         ) s
       ),
       updated_at = now()
 where id = 'accommodation_selected_partner'
   and position('{{board_label}}' in body_html) = 0;

-- Laatste factuurherinnering (T+14) zonder indicatief bedrag: de partner weet
-- zelf wat hij factureert, en een afwijkend bedrag in onze mail roept vragen op.
update public.email_templates
   set body_html = replace(body_html,
         E'Referentie: {{reference_number}}<br/>\nBedrag (excl. btw, indicatief): {{amount_excl_vat}}</p>',
         'Referentie: {{reference_number}}</p>'),
       variables = (variables - 'amount_excl_vat'),
       updated_at = now()
 where id = 'partner_invoice_reminder_t14'
   and position('{{amount_excl_vat}}' in body_html) > 0;

-- Vier partnertemplates hadden een eigen mailskelet (gekleurde kop "Bureau
-- Vlieland" plus omkaderde inhoud) terwijl de huisstijlwrapper dat al om de
-- mail zet; in de mail zag je twee koppen en een kader in een kader. Alleen
-- de inhoud blijft, met de ondertitel als kop.
update public.email_templates
   set body_html = regexp_replace(regexp_replace(regexp_replace(regexp_replace(body_html,
         '^<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">', ''),
         '<div style="background: linear-gradient\([^"]*\); padding: 24px; border-radius: 8px 8px 0 0;"><h1[^>]*>Bureau Vlieland</h1><p[^>]*>([^<]*)</p></div>', '<h2 style="color:#0F4C5C;margin:0 0 16px;">\1</h2>'),
         '<div style="padding: 24px; background: #fff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">', ''),
         '</div></div>$', ''),
       updated_at = now()
 where id in ('partner_activity_unconfirmed_t7', 'partner_invoice_reminder_t1', 'partner_invoice_reminder_t7')
   and position('linear-gradient' in body_html) > 0;

update public.email_templates
   set body_html = replace(replace(replace(regexp_replace(regexp_replace(body_html,
         '^<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">\s*<div style="background: #1a365d; padding: 24px; text-align: center;">\s*<h1[^>]*>Bureau Vlieland</h1>\s*</div>\s*<div style="padding: 32px;">\s*', ''),
         '\s*</div>\s*</div>\s*$', ''),
         '<h2 style="color: #1a365d; margin-bottom: 16px;">', '<h2 style="color:#0F4C5C;margin:0 0 16px;">'),
         'Beste {{provider_name}},', 'Hoi {{provider_name}},'),
         'Open Partner Portal', 'Open het partnerportaal'),
       updated_at = now()
 where id = 'counter_proposal_partner'
   and position('<h1' in body_html) > 0;

-- Partneruitnodiging: ook voor nieuwe partners, en zonder de aanname dat de
-- klant zelf het programma samenstelt (nalezen testmails 22 november).
update public.email_templates
   set subject = 'Welkom bij het partnerportaal van Bureau Vlieland — stel je wachtwoord in',
       body_html = replace(replace(replace(replace(body_html,
         '<p style="margin:0 0 18px;color:#374151;">
  We zijn verheugd je te verwelkomen bij het nieuwe <strong>Bureau Vlieland Partner Portaal</strong>.
  Dit digitale platform is ontwikkeld om onze jarenlange samenwerking nog efficiënter en transparanter te maken.
</p>

<p style="margin:0 0 25px;color:#374151;">
  Het portaal is een evolutie van hoe we samenwerken — geen vervanging van de persoonlijke relatie die we waarderen,
  maar een aanvulling die het administratieve werk verlicht en de communicatie verbetert. In principe brengen we vraag en aanbod bij elkaar voor groepen.
</p>',
         '<p style="margin:0 0 18px;color:#374151;">
  Welkom bij het <strong>partnerportaal van Bureau Vlieland</strong>. Wij brengen groepen die Vlieland bezoeken
  samen met het aanbod op het eiland: activiteiten, catering en logies. In het portaal zie je de aanvragen die
  voor jou bedoeld zijn, reageer je erop en volg je wat er daarna gebeurt.
</p>

<p style="margin:0 0 25px;color:#374151;">
  Het portaal vervangt het persoonlijke contact niet; het maakt het administratieve deel lichter, voor jou en voor ons.
</p>'),
         '    <strong>1. Klanten stellen hun programma samen</strong><br>
    Via onze online configurator kiezen gasten activiteiten, catering en logies voor hun verblijf op Vlieland.',
         '    <strong>1. Er komt een aanvraag binnen</strong><br>
    Soms stelt een groep zelf een programma samen op onze website; vaak werken wij op verzoek van de klant een
    programma uit en nemen we jouw aanbod daarin op. In beide gevallen leggen we het eerst aan de klant voor.'),
         '    <strong>2. Je ontvangt automatisch een aanvraag</strong><br>
    Wanneer een klant jouw diensten selecteert, krijg je direct bericht met alle relevante details: datum, tijd, aantal personen en speciale wensen.',
         '    <strong>2. Jij ontvangt de aanvraag</strong><br>
    Zodra de klant akkoord is, krijg je per mail een aanvraag met datum, tijd, aantal personen en bijzonderheden.'),
         E'\n\n<div style="background:#e8f0f8;border-radius:8px;padding:20px 25px;margin:0 0 25px;">
  <p style="margin:0;color:#374151;font-size:14px;">
    <strong>💡 Goed om te weten:</strong> Naast programma''s die klanten zelf samenstellen, gebruiken wij het portaal
    ook voor maatwerk programma''s die we op verzoek van de klant uitwerken. Wij verwerken jouw aanbod dan in programma''s, stellen dat voor aan de klant en als ze interesse hebben starten we de aanvraag richting jou. De werkwijze voor aanvragen en facturatie blijft hetzelfde.
  </p>
</div>', ''),
       updated_at = now()
 where id = 'partner_invitation'
   and position('jarenlange samenwerking' in body_html) > 0;
