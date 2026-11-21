-- Notificaties fase 3, partnermails (docs/plan-notificaties.md §5 "Fase 3",
-- docs/notificaties-audit-inhoud.md Deel B): één tekst per moment, huisstijl
-- en toon ("Hoi … je"), referentie in het onderwerp, de drie onderdeelsoorten
-- (docs/plan-afhandeling-onderdelen.md) en facturatie alleen bij onderdelen
-- op de bureaufactuur.
--
-- Bouwt voort op 20261121140000_notificaties-teksten-fase1.sql: elke replace()
-- werkt op de zin zoals die ná die migratie in de template staat. Staat de zin
-- er niet (al eerder aangepast), dan verandert replace() niets.

-- ---------------------------------------------------------------------------
-- 1. program_request_partner (approve-quote-item): referentie in onderwerp en
--    tabel, {{#if}}-blokken voor bevestiging/mededeling, facturatie alleen bij
--    bureaufactuur (bureau_invoice), anders de verblijfsnota-regel (billing_note).
--    Klantregel zonder lege haakjes als er geen bedrijfsnaam is.
-- ---------------------------------------------------------------------------
update public.email_templates
set subject = 'Aanvraag bevestigd door klant — {{block_name}} ({{reference_number}})',
    body_html = replace(
      replace(
        replace(
          replace(
            replace(
              body_html,
              $old$Wij hebben jouw onderdeel definitief in het programma opgenomen en willen je vragen de aanvraag te bevestigen via je partnerportaal.$old$,
              $new$Wij hebben jouw onderdeel definitief in het programma opgenomen{{#if is_inform}} en geven het je hierbij ter kennisgeving door. Je hoeft hier niets mee te doen.{{else}}{{#if is_confirm_only}} en vragen je alleen even te bevestigen dat dit geregeld is; een prijs of offerte is niet nodig.{{else}} en willen je vragen de aanvraag te bevestigen via je partnerportaal, met je prijs erbij.{{/if}}{{/if}}$new$
            ),
            $old$<tr><td style="padding:5px 0;color:#666;">Klant:</td><td style="padding:5px 0;"><strong>{{customer_company}}{{#if customer_name}} ({{customer_name}}){{/if}}</strong></td></tr>$old$,
            $new${{#if reference_number}}<tr><td style="padding:5px 0;color:#666;">Referentie:</td><td style="padding:5px 0;"><strong>{{reference_number}}</strong></td></tr>{{/if}}
    <tr><td style="padding:5px 0;color:#666;">Klant:</td><td style="padding:5px 0;"><strong>{{#if customer_company}}{{customer_company}} ({{customer_name}}){{else}}{{customer_name}}{{/if}}</strong></td></tr>$new$
          ),
          $old$Bevestig in partnerportaal →</a>$old$,
          $new${{#if is_inform}}Bekijk in partnerportaal →{{else}}Bevestig in partnerportaal →{{/if}}</a>$new$
        ),
        $old$<strong>Facturatie:</strong> Bureau Vlieland regelt de communicatie en facturatie richting de klant. Mail na uitvoering$old$,
        $new${{#if bureau_invoice}}<strong>Facturatie:</strong> Mail na uitvoering$new$
      ),
      $old$met onze referentie (het BV-nummer) erop. Wij factureren centraal aan de klant. Vragen?$old$,
      $new$met onze referentie {{reference_number}} erop. Wij factureren centraal aan de klant.{{else}}{{billing_note}}{{/if}} Vragen?$new$
    ),
    variables = '["partner_name","customer_name","customer_company","block_name","dates","number_of_people","effective_time","portal_url","reference_number","is_confirm_only","is_inform","bureau_invoice","billing_note"]'::jsonb,
    updated_at = now()
where id = 'program_request_partner';

-- ---------------------------------------------------------------------------
-- 2. partner_headsup_t3 (send-partner-headsup-t3): de heads-up drie dagen vóór
--    uitvoering stond alleen in code. Inhoud van die mail, in de nieuwe toon;
--    facturatiezin alleen bij een onderdeel op de bureaufactuur; de interne
--    prijsnotitie (admin_price_notes) gaat niet meer mee.
-- ---------------------------------------------------------------------------
insert into public.email_templates (id, name, description, subject, body_html, variables, is_active)
values (
  'partner_headsup_t3',
  'Partner — heads-up (T-3)',
  'Drie dagen vóór de uitvoering van een definitief onderdeel: laatste stand van zaken voor de partner (datum, tijd, aantal, locatie, gastenlijst en dieetwensen, instructie van het bureau). Facturatiezin alleen bij een onderdeel op de bureaufactuur. Gaat één keer per onderdeel, via de dagcron.',
  'Over 3 dagen: {{block_name}} op {{event_date}} ({{reference_number}})',
  $body$
<h2 style="color:#0F4C5C;margin:0 0 16px;">Over 3 dagen op het programma</h2>

<p style="color:#4a5568;font-size:16px;margin:0 0 12px;">Hoi {{partner_name}},</p>

<p style="color:#4a5568;font-size:16px;line-height:1.6;margin:0 0 16px;">
  Over drie dagen staat <strong>{{block_name}}</strong> voor {{customer_name}} op het programma. Hierbij de laatste stand van zaken, zodat je goed voorbereid bent.
</p>

<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;">
  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    <tr><td style="padding:4px 0;color:#6b7280;width:160px;">Datum</td><td><strong>{{event_date}}</strong></td></tr>
    {{#if time_info}}<tr><td style="padding:4px 0;color:#6b7280;">Tijd</td><td><strong>{{time_info}}</strong></td></tr>{{/if}}
    {{#if duration}}<tr><td style="padding:4px 0;color:#6b7280;">Duur</td><td>{{duration}}</td></tr>{{/if}}
    {{#if number_of_people}}<tr><td style="padding:4px 0;color:#6b7280;">Aantal personen</td><td><strong>{{number_of_people}}</strong></td></tr>{{/if}}
    {{#if location}}<tr><td style="padding:4px 0;color:#6b7280;">Locatie</td><td>{{location}}</td></tr>{{/if}}
    {{#if reference_number}}<tr><td style="padding:4px 0;color:#6b7280;">Referentie</td><td>{{reference_number}}</td></tr>{{/if}}
  </table>
</div>

{{#if partner_instructions}}
<div style="background:#fff7ed;border-left:4px solid #E36414;padding:12px 14px;border-radius:6px;margin:12px 0;">
  <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#92400e;margin-bottom:4px;">Instructie van Bureau Vlieland</div>
  <div style="font-size:14px;">{{partner_instructions}}</div>
</div>
{{/if}}

{{#if guest_names}}
<div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin:12px 0;">
  <div style="font-weight:600;color:#0F4C5C;margin-bottom:6px;">Gastenlijst{{#if guests_updated}} <span style="font-weight:400;color:#6b7280;font-size:12px;">(bijgewerkt op {{guests_updated}})</span>{{/if}}</div>
  <div style="font-size:13px;">{{guest_names}}</div>
</div>
{{/if}}

{{#if dietary_notes}}
<div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin:12px 0;">
  <div style="font-weight:600;color:#0F4C5C;margin-bottom:6px;">Dieetwensen</div>
  <div style="font-size:13px;">{{dietary_notes}}</div>
</div>
{{/if}}

{{#if bureau_invoice}}
<p style="font-size:13px;color:#475569;background:#f1f5f9;padding:10px 12px;border-radius:6px;">
  <strong>Facturatie:</strong> Mail na uitvoering de pdf van je factuur naar <a href="mailto:invoices@reply.bureauvlieland.nl">invoices@reply.bureauvlieland.nl</a>, met onze referentie {{reference_number}} erop. Wij factureren centraal aan de klant.
</p>
{{/if}}

<p style="margin:20px 0;">
  <a href="{{portal_url}}" style="background:#0F4C5C;color:#ffffff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block;">Bekijk in partnerportaal</a>
</p>

<p style="font-size:13px;color:#6b7280;">Vragen of wijzigingen? Reageer op deze mail; die komt direct in het dossier terecht.</p>
<p style="font-size:13px;color:#6b7280;">Met vriendelijke groet,<br>Bureau Vlieland</p>
$body$,
  '["partner_name","block_name","event_date","time_info","duration","number_of_people","location","reference_number","customer_name","partner_instructions","guest_names","dietary_notes","guests_updated","bureau_invoice","portal_url"]'::jsonb,
  true
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 3. cancellation_partner (notify-partner-cancellation): de portaalknop stond
--    in code achter de al gewrapte template geplakt (na </html>); nu binnen de
--    template als {{portal_url}}.
-- ---------------------------------------------------------------------------
update public.email_templates
set body_html = replace(
      body_html,
      E'<p style="color:#4a5568;font-size:16px;line-height:1.6;margin:16px 0 0;">\n  Je hoeft verder niets te doen. Heb je vragen, mail of bel ons gerust.\n</p>',
      E'<p style="color:#4a5568;font-size:16px;line-height:1.6;margin:16px 0 0;">\n  Je hoeft verder niets te doen. Heb je vragen, mail of bel ons gerust.\n</p>\n\n{{#if portal_url}}\n<div style="text-align:center;margin:24px 0 8px;">\n  <a href="{{portal_url}}" style="display:inline-block;background-color:#0F4C5C;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Bekijk in je partnerportaal</a>\n</div>\n<p style="font-size:12px;color:#64748b;text-align:center;margin:0;">Geannuleerde aanvragen blijven in je portaal vindbaar via zoeken op referentie {{reference_number}}.</p>\n{{/if}}'
    ),
    variables = '["partner_name","customer_name","reference_number","cancelled_items","cancellation_reason","portal_url"]'::jsonb,
    updated_at = now()
where id = 'cancellation_partner'
  and position('{{portal_url}}' in body_html) = 0;

-- ---------------------------------------------------------------------------
-- 4. cancellation_accommodation_partner (notify-partner-cancellation): de
--    template werd nergens gerenderd; de code had eigen HTML ("Beste … Uw
--    offerte", rauwe ISO-datums, geen wrapper). Nu rendert de code deze
--    template. De tekst is actor-neutraal (ook het bureau annuleert), maakt
--    onderscheid tussen een gekozen offerte (boeking vervalt) en een lopende
--    aanvraag (reactie niet meer nodig) en linkt naar het portaal.
-- ---------------------------------------------------------------------------
update public.email_templates
set subject = 'Logiesaanvraag {{reference_number}} is geannuleerd ({{customer_name}})',
    body_html = $body$
<h2 style="color:#0F4C5C;margin:0 0 16px;font-size:20px;">Logiesaanvraag geannuleerd</h2>

<p style="color:#4a5568;font-size:16px;margin:0 0 16px;">Hoi {{partner_name}},</p>

<p style="color:#4a5568;font-size:16px;line-height:1.6;margin:0 0 16px;">
  De logiesaanvraag <strong>{{reference_number}}</strong> van {{customer_name}} voor <strong>{{dates}}</strong> is geannuleerd.{{#if program_reference}} De aanvraag hoorde bij programma {{program_reference}}.{{/if}}
</p>

<div style="background:#f7fafc;padding:16px;border-radius:8px;margin:20px 0;color:#4a5568;">
  {{#if accommodation_name}}<p style="margin:0 0 10px 0;"><strong>Accommodatie:</strong> {{accommodation_name}}</p>{{/if}}
  <p style="margin:0;">{{#if was_selected}}Je offerte was al gekozen voor deze aanvraag; met deze annulering vervalt de boeking.{{else}}Je offerte was nog in behandeling; met deze annulering vervalt de offerteaanvraag en is een reactie niet meer nodig.{{/if}}</p>
  {{#if cancellation_reason}}
  <p style="margin:10px 0 0 0;padding-top:10px;border-top:1px solid #e2e8f0;"><strong>Reden:</strong> {{cancellation_reason}}</p>
  {{/if}}
</div>

<p style="color:#4a5568;font-size:16px;line-height:1.6;margin:16px 0 0;">
  Je hoeft verder niets te doen. Excuses voor het ongemak; heb je vragen, reageer dan gerust op deze mail.
</p>

{{#if portal_url}}
<div style="text-align:center;margin:24px 0 8px;">
  <a href="{{portal_url}}" style="display:inline-block;background-color:#0F4C5C;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Bekijk in je partnerportaal</a>
</div>
<p style="font-size:12px;color:#64748b;text-align:center;margin:0;">Geannuleerde aanvragen blijven in je portaal vindbaar via zoeken op referentie {{reference_number}}.</p>
{{/if}}
$body$,
    variables = '["partner_name","customer_name","reference_number","program_reference","accommodation_name","dates","was_selected","cancellation_reason","portal_url"]'::jsonb,
    updated_at = now()
where id = 'cancellation_accommodation_partner';

-- ---------------------------------------------------------------------------
-- 5. partner_password_reset (send-partner-reset-email én admin-reset-partner-
--    password): "Hallo" → "Hoi", "Partner Portal" → "partnerportaal", eigen
--    kop en voettekst weg (de wrapper levert logo en voettekst), en een
--    {{#if admin_initiated}}-variant voor de link die het bureau aanmaakt.
-- ---------------------------------------------------------------------------
update public.email_templates
set subject = '{{#if admin_initiated}}Nieuwe link om je wachtwoord in te stellen{{else}}Wachtwoord resetten{{/if}} — partnerportaal Bureau Vlieland',
    body_html = $body$
<h2 style="color:#0F4C5C;margin:0 0 16px;">{{#if admin_initiated}}Nieuwe link voor je wachtwoord{{else}}Wachtwoord resetten{{/if}}</h2>

<p style="color:#4a5568;font-size:16px;margin:0 0 12px;">Hoi {{partner_name}},</p>

<p style="color:#4a5568;font-size:16px;line-height:1.6;margin:0 0 16px;">
  {{#if admin_initiated}}Bureau Vlieland heeft een nieuwe link voor je aangemaakt om je wachtwoord voor het partnerportaal in te stellen.{{else}}We hebben een verzoek ontvangen om je wachtwoord voor het partnerportaal te resetten.{{/if}}
  Klik op de knop om een nieuw wachtwoord in te stellen:
</p>

<div style="text-align:center;margin:32px 0;">
  <a href="{{reset_link}}" style="display:inline-block;background-color:#0F4C5C;color:#ffffff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;">Wachtwoord instellen</a>
</div>

<p style="font-size:14px;color:#666;margin:0 0 12px;">Deze link is persoonlijk en 1 uur geldig.{{#if admin_initiated}}{{else}} Heb je geen reset aangevraagd, dan kun je deze mail negeren.{{/if}}</p>

<p style="font-size:12px;color:#999;word-break:break-all;margin:0;">Werkt de knop niet? Kopieer dan deze link:<br><a href="{{reset_link}}" style="color:#0F4C5C;">{{reset_link}}</a></p>

<p style="margin:24px 0 0;color:#374151;">Met vriendelijke groet,<br><strong>Bureau Vlieland</strong></p>
$body$,
    variables = '["partner_name","reset_link","admin_initiated"]'::jsonb,
    updated_at = now()
where id = 'partner_password_reset';

-- ---------------------------------------------------------------------------
-- 6. partner_invitation: "Beste" → "Hoi", de rest van de gedateerde
--    feedback-alinea weg, één zin over logies in "Hoe werkt het?".
-- ---------------------------------------------------------------------------
update public.email_templates
set body_html = replace(
      replace(
        replace(
          body_html,
          $old$<h2 style="color:#0F4C5C;margin:0 0 20px;font-size:20px;">Beste {{partner_name}},</h2>$old$,
          $new$<h2 style="color:#0F4C5C;margin:0 0 20px;font-size:20px;">Hoi {{partner_name}},</h2>$new$
        ),
        $old$Met één klik bevestig je de aanvraag, stel je een alternatief voor, of geef je aan dat je niet beschikbaar bent.$old$,
        $new$Met één klik bevestig je de aanvraag, stel je een alternatief voor, of geef je aan dat je niet beschikbaar bent. Voor logies dien je via het portaal een offerte in; de gast kiest daarna uit de ontvangen offertes.$new$
      ),
      E'Jouw feedback is voor ons waardevol.\n  Heb je vragen, opmerkingen of suggesties? Laat het ons weten — we ontwikkelen dit platform samen.',
      'Heb je vragen of suggesties? Laat het ons weten; reageer gerust op deze mail.'
    ),
    updated_at = now()
where id = 'partner_invitation';

-- ---------------------------------------------------------------------------
-- 7. accommodation_selected_partner (select-accommodation-quote): aanhef,
--    "geaccepteerd door Bureau Vlieland" → "gekozen door de gast" (de klant
--    kiest), {{reference_number}} in plaats van "(het LOG-nummer)" en in het
--    onderwerp, en een variant voor de gast die het verblijf rechtstreeks
--    betaalt (docs/factuur-aan-de-gast.md: excluded_fees = accommodation).
-- ---------------------------------------------------------------------------
update public.email_templates
set subject = 'Je logiesofferte is gekozen — {{accommodation_name}} ({{reference_number}})',
    body_html = replace(
      replace(
        replace(
          body_html,
          $old$<h2 style="color:#16a34a;margin:0 0 16px;">Je offerte is geaccepteerd!</h2>$old$,
          $new$<h2 style="color:#16a34a;margin:0 0 16px;">Je offerte is gekozen</h2>

<p style="color:#4a5568;font-size:16px;margin:0 0 12px;">Hoi {{partner_name}},</p>$new$
        ),
        $old$is geaccepteerd door Bureau Vlieland.$old$,
        $new$is gekozen door de gast (referentie {{reference_number}}).$new$
      ),
      $old$<p style="color:#4a5568;margin:0;">Mail na uitvoering de pdf van je factuur naar <a href="mailto:invoices@reply.bureauvlieland.nl">invoices@reply.bureauvlieland.nl</a>, met onze referentie (het LOG-nummer) erop. Wij factureren centraal aan de klant.</p>$old$,
      $new$<p style="color:#4a5568;margin:0;">{{#if guest_pays_directly}}De gast betaalt het verblijf rechtstreeks aan jullie; Bureau Vlieland betaalt deze factuur niet. Mail na het verblijf wel de pdf van je factuur naar <a href="mailto:invoices@reply.bureauvlieland.nl">invoices@reply.bureauvlieland.nl</a>, met onze referentie {{reference_number}} erop: die is de grondslag voor onze commissie.{{else}}Mail na uitvoering de pdf van je factuur naar <a href="mailto:invoices@reply.bureauvlieland.nl">invoices@reply.bureauvlieland.nl</a>, met onze referentie {{reference_number}} erop. Wij factureren centraal aan de klant.{{/if}}</p>$new$
    ),
    variables = '["partner_name","accommodation_name","reference_number","guest_name","arrival_date","departure_date","number_of_guests","extras_list","price_total","guest_pays_directly","partner_portal_link"]'::jsonb,
    updated_at = now()
where id = 'accommodation_selected_partner';

-- ---------------------------------------------------------------------------
-- 8. reminder_headcount_pending (check-pending-items): de code zet de
--    variabelen al klaar maar er was geen template, dus ging altijd de
--    "Beste … u"-noodrem. Toon van reminder_quote_pending.
-- ---------------------------------------------------------------------------
insert into public.email_templates (id, name, description, subject, body_html, variables, is_active)
values (
  'reminder_headcount_pending',
  'Herinnering nieuw aantal gasten bevestigen (logies)',
  'Aan de gekozen logiespartner die het nieuwe aantal gasten nog niet heeft bevestigd (docs/plan-logies-aantalwijziging.md). Herhalend, elke zeven dagen, maximaal drie keer.',
  'Herinnering: nieuw aantal gasten bevestigen voor {{customer_name}}',
  $body$
<h2 style="color:#0F4C5C;margin:0 0 16px;">Herinnering: nieuw aantal gasten</h2>

<p style="color:#4a5568;font-size:16px;margin:0 0 12px;">Hoi {{partner_name}},</p>

<p style="color:#4a5568;font-size:16px;line-height:1.6;margin:0 0 16px;">
  Wij hebben je <strong>{{days_since}} dagen geleden</strong> gevraagd het nieuwe aantal gasten te bevestigen voor <strong>{{customer_name}}</strong>, maar we hebben nog geen bevestiging van je ontvangen.
</p>

<div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0;">
  <p style="margin:4px 0;"><strong>Aankomst:</strong> {{arrival_date}}</p>
  <p style="margin:4px 0;"><strong>Vertrek:</strong> {{departure_date}}</p>
  <p style="margin:4px 0;"><strong>Nieuw aantal gasten:</strong> {{number_of_guests}}{{#if previous_number_of_guests}} (was {{previous_number_of_guests}}){{/if}}</p>
</div>

<p style="color:#4a5568;font-size:16px;line-height:1.6;margin:0 0 16px;">
  De klant heeft je offerte al gekozen; die blijft staan. Wil je in het portaal het nieuwe aantal bevestigen en, als dat nodig is, het totaal aanpassen? Bureau Vlieland beoordeelt je bevestiging en informeert de klant. Een nieuwe offerte is niet nodig.
</p>

<div style="margin:24px 0;">
  <a href="{{portal_url}}" style="display:inline-block;padding:12px 24px;background-color:#0F4C5C;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">Nieuw aantal bevestigen</a>
</div>

<p style="color:#666;font-size:14px;margin:16px 0 0;">
  Bureau Vlieland regelt de communicatie en facturatie richting de klant; wij staan tussen jou en de klant in. Heb je vragen? Beantwoord deze mail dan rechtstreeks.
</p>
$body$,
  '["partner_name","customer_name","arrival_date","departure_date","number_of_guests","previous_number_of_guests","days_since","portal_url"]'::jsonb,
  true
)
on conflict (id) do nothing;
