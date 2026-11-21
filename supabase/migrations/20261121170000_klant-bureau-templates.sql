-- Notificaties fase 3, WP9 (docs/plan-notificaties.md §5 Fase 3; docs/notificaties-audit-inhoud.md Deel A en C):
-- klant- en bureautemplates die iets anders zeiden dan de code doet, zonder
-- referentie in het onderwerp, met "partner" waar de klant "aanbieder" leest,
-- of met een kop en voet die de huisstijlwrapper al toevoegt.
--
-- Elke replace() werkt op de exacte huidige zin (gecontroleerd tegen de live
-- tabel op 21 november). Staat die er niet meer, dan verandert replace() niets.
-- Onderwerpen mogen {{#if …}} bevatten: replaceVariables() verwerkt
-- conditionals ook in het onderwerp.

-- ---------------------------------------------------------------------------
-- booking_confirmed_customer (update-customer-program)
-- De code levert `reservation_notice` (het gele "Onder voorbehoud"-blok) en
-- plakte dat vóór de template omdat de template het woord niet bevatte. De
-- template kent het blok nu zelf; zonder voorbehoud blijft de tekst
-- "definitief". De handtekeningtabel krijgt een kop en een uitleg.
update public.email_templates
set subject = '{{#if reservation_notice}}Uw akkoord is vastgelegd (onder voorbehoud) — {{reference_number}}{{else}}Uw boeking is definitief — {{reference_number}}{{/if}}',
    body_html = replace(
      replace(
        replace(
          body_html,
          '<h2 style="color:#1e3a5f;">Uw boeking is definitief!</h2>',
          '{{#if reservation_notice}}<h2 style="color:#1e3a5f;">Uw akkoord en handtekening zijn vastgelegd</h2>{{else}}<h2 style="color:#1e3a5f;">Uw boeking is definitief</h2>{{/if}}'
        ),
        '<p>Hartelijk dank voor uw boeking bij Bureau Vlieland. Hieronder vindt u de bevestiging van uw programma. Alle activiteiten zijn nu definitief in de planning vastgelegd.</p>',
        '{{#if reservation_notice}}<p>Hartelijk dank voor uw akkoord. Uw handtekening is vastgelegd. Een deel van uw programma wacht nog op bevestiging van de aanbieder; dat leest u hieronder.</p>{{reservation_notice}}{{else}}<p>Hartelijk dank voor uw boeking bij Bureau Vlieland. Hieronder vindt u de bevestiging van uw programma. Alle onderdelen zijn nu definitief vastgelegd.</p>{{/if}}'
      ),
      '{{#if booking_summary}}{{booking_summary}}{{/if}}',
      '{{#if booking_summary}}<div style="margin-top:16px; padding:16px; background:#f5f5f5; border-radius:4px;"><p style="margin:0 0 8px 0; font-weight:bold; color:#1e3a5f;">Uw digitale handtekening</p>{{booking_summary}}<p style="margin:8px 0 0 0; font-size:13px; color:#666;">Dit is het bewijs van uw digitale akkoord op de algemene voorwaarden van Bureau Vlieland{{partner_terms_note}}.</p></div>{{/if}}'
    ),
    variables = '["customer_name","reference_number","booking_summary","partner_terms_note","reservation_notice","portal_link"]'::jsonb,
    updated_at = now()
where id = 'booking_confirmed_customer';

-- ---------------------------------------------------------------------------
-- program_request_bureau (send-program-request)
-- "Handling fee: € 0" was altijd nul en de facturatiezin was intern jargon.
-- Klantnaam in het onderwerp, "Aan zet"-regel en een knop naar de Werkbank
-- (de aanvraag staat daar als taak; het project-id is bij verzending nog niet
-- bekend in de code).
update public.email_templates
set subject = 'Nieuwe programma-aanvraag van {{customer_name}} ({{number_of_people}} personen)',
    body_html = replace(
      replace(
        replace(
          replace(
            replace(
              body_html,
              '<h2>Nieuwe Programma Aanvraag</h2>',
              '<h2>Nieuwe programma-aanvraag</h2>'
            ),
            '<p><strong>Email:</strong> {{customer_email}}</p>',
            '<p><strong>E-mail:</strong> {{customer_email}}</p>'
          ),
          '<h3>Programma Details</h3>',
          '<h3>Programma</h3>'
        ),
        '<p><strong>Handling fee:</strong> € {{bureau_fee}}</p>',
        ''
      ),
      '<p style="background:#f8f9fa;padding:10px 14px;border-left:3px solid #0F4C5C;font-size:13px;color:#334155;"><strong>Facturatie:</strong> Bureau Vlieland factureert centraal alle onderdelen aan de klant (bureau-centraal model). De onderstaande splitsing gaat over wie het onderdeel <em>uitvoert</em>, niet over wie factureert.</p>',
      ''
    )
    || '<p style="margin-top:20px;"><strong>Aan zet:</strong> Bureau Vlieland — beoordeel de aanvraag en stuur binnen 5 werkdagen een voorstel.</p><p style="margin:16px 0;"><a href="{{admin_url}}" style="display:inline-block;padding:12px 20px;background:#0F4C5C;color:#ffffff;text-decoration:none;border-radius:6px;">Open de Werkbank</a></p>',
    variables = '["customer_name","customer_company","customer_email","customer_phone","number_of_people","selected_date","bureau_items","partner_items","self_arranged_items","notes","admin_url"]'::jsonb,
    updated_at = now()
where id = 'program_request_bureau'
  and position('Open de Werkbank' in body_html) = 0;

-- ---------------------------------------------------------------------------
-- program_request_customer (send-program-request)
-- Nooit aangepast aan het formulier /programma-op-maat (oktober 2026): dat
-- stuurt geen onderdelen mee, alleen aantal, datum of periode en een
-- samenvatting van wat de klant nodig heeft (in `notes`). De sitebelofte is
-- "binnen 5 werkdagen een voorstel" (src/content/promises.ts). Betaal- en
-- fee-zinnen weg (er is nog geen prijs), geen emoji's, ondertekening als
-- overal.
update public.email_templates
set subject = 'Uw aanvraag is ontvangen — Bureau Vlieland',
    body_html = $body$
<p>Beste {{customer_name}},</p>
<p>Hartelijk dank voor uw aanvraag bij Bureau Vlieland. Wij gaan ermee aan de slag: <strong>binnen 5 werkdagen ontvangt u een voorstel op maat</strong>. Daarvoor checken wij de beschikbaarheid bij de aanbieders en maken wij uw programma kloppend. Heeft u ondertussen vragen, beantwoord dan gewoon deze e-mail.</p>

<div style="background-color:#f7fafc;padding:20px;border-radius:8px;margin:20px 0;">
  <h3 style="margin-top:0;color:#2d3748;">Uw aanvraag</h3>
  <p style="margin:0 0 6px;"><strong>Datum:</strong> {{selected_date}}</p>
  <p style="margin:0;"><strong>Aantal personen:</strong> {{number_of_people}}</p>
</div>

{{#if coordinated_items}}
<div style="margin:20px 0;">
  <h3 style="color:#2d3748;">Aangevraagde onderdelen</h3>
  <p style="color:#718096;font-size:14px;">Bureau Vlieland regelt deze onderdelen voor u en houdt u op de hoogte:</p>
  <ul style="padding-left:20px;">{{coordinated_items}}</ul>
</div>
{{/if}}

{{#if self_arranged_items}}
<div style="background-color:#fffbeb;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #f59e0b;">
  <h3 style="margin-top:0;color:#92400e;">Zelf te regelen</h3>
  <p style="color:#78350f;font-size:14px;">Onderstaande onderdelen regelt u zelf:</p>
  {{self_arranged_items}}
</div>
{{/if}}

{{#if notes}}
<div style="margin:20px 0;">
  <h3 style="color:#2d3748;">Wat u ons heeft doorgegeven</h3>
  <p style="color:#4a5568;background:#f7fafc;padding:15px;border-radius:8px;">{{notes}}</p>
</div>
{{/if}}

{{#if portal_url}}
<div style="background-color:#edf2f7;padding:20px;border-radius:8px;margin:20px 0;text-align:center;">
  <h3 style="margin-top:0;color:#2d3748;">Uw persoonlijke programmapagina</h3>
  <p style="color:#4a5568;">Hier volgt u de status van uw aanvraag en kunt u wensen aanvullen of aanpassen.</p>
  <a href="{{portal_url}}" style="display:inline-block;background-color:#0F4C5C;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:10px;">Bekijk uw aanvraag</a>
  <p style="color:#718096;font-size:12px;margin-top:15px;">Deze link is persoonlijk en 90 dagen geldig.</p>
</div>
{{/if}}

<p>Heeft u nog vragen? Mail naar <a href="mailto:hallo@bureauvlieland.nl" style="color:#0F4C5C;">hallo@bureauvlieland.nl</a> of bel 0562 700 208.</p>
<p>Met vriendelijke groet,<br><strong>Bureau Vlieland</strong></p>
$body$,
    variables = '["customer_name","selected_date","number_of_people","coordinated_items","self_arranged_items","notes","portal_url"]'::jsonb,
    updated_at = now()
where id = 'program_request_customer';

-- ---------------------------------------------------------------------------
-- accommodation_quote_notification (notify-accommodation-quote, admin-knop
-- "Doorsturen"). "U ontvangt automatisch bericht bij nieuwe offertes" klopt
-- niet: de mail gaat alleen uit als het bureau hem doorstuurt. De code geeft
-- aankomst, vertrek, nachten en gasten al mee; die tonen we nu.
update public.email_templates
set subject = 'Nieuwe logiesofferte ontvangen: {{accommodation_name}}',
    body_html = replace(
      replace(
        replace(
          replace(
            body_html,
            '<p style="color:#718096;font-size:14px;text-align:center;margin:0;">U ontvangt automatisch bericht bij nieuwe offertes.</p>',
            ''
          ),
          'We hebben een nieuwe offerte ontvangen voor uw logies-aanvraag:',
          'We hebben een offerte ontvangen voor uw logiesaanvraag:'
        ),
        '<h3 style="margin:0 0 12px;color:#166534;">🏠 {{accommodation_name}}</h3>',
        '<h3 style="margin:0 0 12px;color:#166534;">{{accommodation_name}}</h3>'
      ),
      '<tr><td style="padding:6px 0;color:#666;">Totaalprijs:</td>',
      '{{#if arrival_date}}<tr><td style="padding:6px 0;color:#666;">Aankomst:</td><td style="padding:6px 0;"><strong>{{arrival_date}}</strong></td></tr>{{/if}}{{#if departure_date}}<tr><td style="padding:6px 0;color:#666;">Vertrek:</td><td style="padding:6px 0;"><strong>{{departure_date}}</strong></td></tr>{{/if}}{{#if number_of_guests}}<tr><td style="padding:6px 0;color:#666;">Aantal gasten:</td><td style="padding:6px 0;"><strong>{{number_of_guests}}</strong>{{#if number_of_nights}} ({{number_of_nights}} nacht(en)){{/if}}</td></tr>{{/if}}<tr><td style="padding:6px 0;color:#666;">Totaalprijs:</td>'
    ),
    variables = '["customer_name","accommodation_name","arrival_date","departure_date","number_of_guests","number_of_nights","price_total","price_per_person_per_night","valid_until","description","portal_link"]'::jsonb,
    updated_at = now()
where id = 'accommodation_quote_notification'
  and position('{{arrival_date}}' in body_html) = 0;

update public.email_templates
set body_html = replace(
      body_html,
      'Bekijk alle details en vergelijk met eventuele andere offertes in uw persoonlijke omgeving:',
      'Bekijk alle details in uw persoonlijke omgeving en laat ons weten of u deze offerte wilt vastleggen:'
    ),
    updated_at = now()
where id = 'accommodation_quote_notification';

-- ---------------------------------------------------------------------------
-- status_confirmed / status_alternative / status_unavailable
-- (update-partner-item-status). De klant leest in het portaal "aanbieder",
-- niet "partner". Elke mail zegt nu wát de klant doet (of dat hij niets hoeft
-- te doen). Onderwerp met dossiernummer; de code geeft {{reference_number}}
-- vanaf nu mee.
update public.email_templates
set subject = 'Uw activiteit {{activity_name}} is bevestigd{{#if reference_number}} ({{reference_number}}){{/if}}',
    body_html = replace(
      replace(
        replace(
          replace(
            body_html,
            'Een activiteit uit uw programma is bevestigd door de partner:',
            'Een activiteit uit uw programma is bevestigd door de aanbieder:'
          ),
          '<p style="margin:0 0 8px;color:#718096;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Partner</p>',
          '<p style="margin:0 0 8px;color:#718096;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Aanbieder</p>'
        ),
        '<strong>Toelichting van partner:</strong>',
        '<strong>Toelichting van de aanbieder:</strong>'
      ),
      'Bekijk alle details en de voortgang van uw programma in uw persoonlijke portaal:',
      'Wat u nu doet: open uw portaal en geef uw akkoord op dit onderdeel als daarom wordt gevraagd (bijvoorbeeld bij een bevestigde prijs). Wordt er niets gevraagd, dan hoeft u niets te doen. In het portaal ziet u ook de voortgang van de rest van uw programma.'
    ),
    variables = '["customer_name","activity_name","partner_name","quoted_price","status_note","portal_link","actor_line","reference_number"]'::jsonb,
    updated_at = now()
where id = 'status_confirmed';

update public.email_templates
set subject = 'Alternatief voorstel voor {{activity_name}}{{#if reference_number}} ({{reference_number}}){{/if}}',
    body_html = replace(
      replace(
        replace(
          body_html,
          '<p style="margin:0 0 8px;color:#718096;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Partner</p>',
          '<p style="margin:0 0 8px;color:#718096;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Aanbieder</p>'
        ),
        '<strong>Toelichting van partner:</strong>',
        '<strong>Toelichting van de aanbieder:</strong>'
      ),
      'Bekijk het voorstel in uw persoonlijke portaal en laat ons weten of u akkoord gaat of een ander tijdstip wenst.',
      'Wat u nu doet: open uw portaal en kies of u met dit voorstel akkoord gaat of liever een ander tijdstip wilt. Zolang u niet kiest, blijft dit onderdeel open.'
    ),
    variables = '["customer_name","partner_name","activity_name","proposed_date","proposed_time","quoted_price","status_note","portal_link","actor_line","reference_number"]'::jsonb,
    updated_at = now()
where id = 'status_alternative';

update public.email_templates
set subject = 'Helaas: {{activity_name}} is niet beschikbaar{{#if reference_number}} ({{reference_number}}){{/if}}',
    body_html = replace(
      replace(
        replace(
          replace(
            body_html,
            '<h2 style="margin:0 0 20px;color:#0F4C5C;font-size:20px;">Update, {{customer_name}}</h2>',
            '<h2 style="margin:0 0 20px;color:#0F4C5C;font-size:20px;">Helaas, {{customer_name}}</h2>'
          ),
          '<p style="margin:0 0 8px;color:#718096;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Partner</p>',
          '<p style="margin:0 0 8px;color:#718096;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Aanbieder</p>'
        ),
        '<strong>Toelichting van partner:</strong>',
        '<strong>Toelichting van de aanbieder:</strong>'
      ),
      'Wij helpen u graag met het vinden van een geschikt alternatief. Neem contact op of bekijk uw programma in het portaal.',
      'Wij zoeken een geschikt alternatief en nemen contact met u op. U hoeft nu niets te doen; in uw portaal ziet u de stand van zaken.'
    ),
    variables = '["customer_name","activity_name","partner_name","status_note","portal_link","actor_line","reference_number"]'::jsonb,
    updated_at = now()
where id = 'status_unavailable';

-- ---------------------------------------------------------------------------
-- cancellation_customer (cancel-program-request). De knop stuurde naar de
-- wizard /programma-samenstellen; de voordeur is sinds oktober
-- /programma-op-maat. "succesvol" is systeemtaal. Onderwerp toont het
-- dossiernummer zodra de code {{reference_number}} meegeeft.
update public.email_templates
set subject = 'Uw programma-aanvraag is geannuleerd{{#if reference_number}} ({{reference_number}}){{/if}}',
    body_html = replace(
      replace(
        replace(
          replace(
            body_html,
            'Uw aanvraag voor <strong>{{dates}}</strong> is succesvol geannuleerd.',
            'Uw aanvraag voor <strong>{{dates}}</strong> is geannuleerd.'
          ),
          'Wilt u toch een programma samenstellen? U kunt altijd een nieuwe aanvraag indienen via onze website.',
          'Wilt u op een later moment toch naar Vlieland? U kunt altijd een nieuwe aanvraag doen.'
        ),
        '<a href="{{programma_url}}" style="display:inline-block;padding:14px 32px;background-color:#0F4C5C;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;border-radius:6px;">Nieuw programma samenstellen</a>',
        '<a href="{{programma_url}}" style="display:inline-block;padding:14px 32px;background-color:#0F4C5C;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;border-radius:6px;">Nieuwe aanvraag doen</a>'
      ),
      '<h2 style="color:#0F4C5C;margin:0 0 16px;">Aanvraag geannuleerd</h2>',
      '<h2 style="color:#0F4C5C;margin:0 0 16px;">Uw aanvraag is geannuleerd</h2>'
    ),
    variables = '["customer_name","dates","cancellation_reason","reference_number","programma_url"]'::jsonb,
    updated_at = now()
where id = 'cancellation_customer';

-- ---------------------------------------------------------------------------
-- chat_reply_visitor (notify-new-chat-reply). Het vaste template-onderwerp
-- won altijd van het onderwerp met referentie uit de code. De referentie is
-- nu een variabele; de aanhef "Beste {{visitor_name}}" blijft, ook voor een
-- logiespartner (één neutrale toon).
update public.email_templates
set subject = '{{#if reference_number}}Nieuw bericht van Bureau Vlieland ({{reference_number}}){{else}}Nieuw bericht van Bureau Vlieland{{/if}}',
    variables = '["visitor_name","message_preview","chat_url","portal_link","reference_number"]'::jsonb,
    updated_at = now()
where id = 'chat_reply_visitor';

-- ---------------------------------------------------------------------------
-- chat_notification_bureau (notify-new-chat). Bron per kanaal (klantportaal,
-- partnerportaal, WhatsApp, website), dossiernummer als variabele en een
-- knop naar het gesprek in het Berichtencentrum.
update public.email_templates
set subject = 'Nieuw chatbericht van {{visitor_name}} ({{source_label}}){{#if reference_number}} — {{reference_number}}{{/if}}',
    body_html = replace(
      replace(
        body_html,
        '<p><strong>Bron:</strong> {{source_label}}</p>',
        '<p><strong>Bron:</strong> {{source_label}}</p>{{#if reference_number}}<p><strong>Dossier:</strong> {{reference_number}}</p>{{/if}}'
      ),
      '<p><a href="{{chat_url}}">Ga naar chat →</a></p>',
      '<p><strong>Aan zet:</strong> Bureau Vlieland — beantwoord het bericht.</p><p><a href="{{chat_url}}">Open het gesprek in het Berichtencentrum →</a></p>'
    ),
    variables = '["visitor_name","visitor_email","source_label","reference_number","message_preview","chat_url"]'::jsonb,
    updated_at = now()
where id = 'chat_notification_bureau';

-- ---------------------------------------------------------------------------
-- inbound_reply_to_customer (inbound-email). De template had een eigen kop
-- "Bureau Vlieland" en een voet met het e-mailadres; de wrapper zet beide al
-- neer, dus stonden ze dubbel. "als reactie op uw communicatie" is stijf.
update public.email_templates
set body_html = replace(
      replace(
        replace(
          body_html,
          E'<div style="text-align: center; margin-bottom: 30px;">\n<h2 style="color: #1a365d; margin: 0;">Bureau Vlieland</h2>\n</div>\n',
          ''
        ),
        E'<hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />\n\n<p style="font-size: 12px; color: #999; text-align: center;">\nBureau Vlieland<br />\n📧 hallo@bureauvlieland.nl\n</p>\n',
        ''
      ),
      'Er is een nieuw bericht binnengekomen van <strong>{{partner_name}}</strong> als reactie op uw communicatie.',
      'Er is een nieuw bericht van <strong>{{partner_name}}</strong> over uw reservering {{reference_number}}.'
    ),
    updated_at = now()
where id = 'inbound_reply_to_customer';

-- ---------------------------------------------------------------------------
-- arrival_reminder (send-arrival-reminder). "kaartjes" leest als tickets, die
-- apart gaan; het programma bevat kaarten (plattegronden). Dossiernummer in
-- het onderwerp.
update public.email_templates
set subject = 'Over een paar dagen bent u op Vlieland — uw programma en aankomstinformatie{{#if reference_number}} ({{reference_number}}){{/if}}',
    body_html = replace(
      body_html,
      'In de bijlage vindt u het volledige programma met alle tijden, locaties en kaartjes.',
      'In de bijlage vindt u het volledige programma met alle tijden, locaties en kaarten.'
    ),
    updated_at = now()
where id = 'arrival_reminder';

-- ---------------------------------------------------------------------------
-- guest_details_reminder (send-guest-details-reminder). Een gegevensverzoek
-- is geen "laatste keer meedenken". Dossiernummer in het onderwerp.
update public.email_templates
set subject = 'Gastenlijst en wensen voor uw verblijf op Vlieland{{#if reference_number}} ({{reference_number}}){{/if}}',
    body_html = replace(
      body_html,
      'Wij willen graag voor de laatste keer met u meedenken over de invulling.',
      'Om alles goed voor te bereiden hebben wij nog een paar gegevens van u nodig.'
    ),
    updated_at = now()
where id = 'guest_details_reminder';
