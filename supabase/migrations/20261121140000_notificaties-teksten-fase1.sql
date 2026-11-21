-- Notificaties fase 1 (docs/plan-notificaties.md §5, docs/notificaties-audit-inhoud.md):
-- tekstreparaties in e-mailtemplates. Eén standaardzin voor de facturatie aan
-- partners (inboxroute invoices@ met referentie), geen upload- of inkoop@-
-- instructies meer, en geen onware "alle aanbieders zijn geïnformeerd"-claims.
--
-- Elke replace() werkt op de exacte huidige zin; staat die er niet (al eerder
-- aangepast), dan verandert replace() niets.

-- program_request_partner (approve-quote-item): inkoop@ → standaardzin.
-- De aanroepende code geeft geen reference_number mee, dus zonder variabele.
update public.email_templates
set body_html = replace(
  body_html,
  $old$Stuur jouw factuur na uitvoering naar <a href="mailto:inkoop@reply.bureauvlieland.nl">inkoop@reply.bureauvlieland.nl</a>.$old$,
  $new$Mail na uitvoering de pdf van je factuur naar <a href="mailto:invoices@reply.bureauvlieland.nl">invoices@reply.bureauvlieland.nl</a>, met onze referentie (het BV-nummer) erop. Wij factureren centraal aan de klant.$new$
), updated_at = now()
where id = 'program_request_partner';

-- booking_confirmed_partner (update-customer-program): upload/inkoop@ → standaardzin.
-- update-customer-program geeft vanaf nu {{reference_number}} mee.
update public.email_templates
set body_html = replace(
  body_html,
  $old$Bureau Vlieland factureert centraal aan de klant — stuur jouw factuur dus niet rechtstreeks naar de klant. Je factureert ná uitvoering aan Bureau Vlieland: upload de factuur in je <a href="{{portal_url}}">partnerportaal</a> of mail de PDF naar <a href="mailto:inkoop@reply.bureauvlieland.nl">inkoop@reply.bureauvlieland.nl</a>. Vermeld het referentienummer voor snelle verwerking.$old$,
  $new$Mail na uitvoering de pdf van je factuur naar <a href="mailto:invoices@reply.bureauvlieland.nl">invoices@reply.bureauvlieland.nl</a>, met onze referentie {{reference_number}} erop. Wij factureren centraal aan de klant.$new$
), updated_at = now()
where id = 'booking_confirmed_partner';

-- partner_invitation: inkoop@ → standaardzin (geen referentie beschikbaar bij
-- een uitnodiging), en de gedateerde "eerste jaar"-zin weg.
update public.email_templates
set body_html = replace(
  replace(
    body_html,
    $old$Bureau Vlieland verzorgt <strong>centraal de facturatie aan de klant</strong>. Jij stuurt jouw factuur (voor de geoffreerde prijs) naar <a href="mailto:inkoop@reply.bureauvlieland.nl">inkoop@reply.bureauvlieland.nl</a> — niet rechtstreeks naar de klant. Bureau Vlieland brengt vervolgens commissie$old$,
    $new$Mail na uitvoering de pdf van je factuur naar <a href="mailto:invoices@reply.bureauvlieland.nl">invoices@reply.bureauvlieland.nl</a>, met onze referentie (het BV-nummer) erop. Wij factureren centraal aan de klant. Stuur je factuur dus niet rechtstreeks naar de klant. Bureau Vlieland brengt vervolgens commissie$new$
  ),
  $old$Dit is het eerste jaar dat we met dit nieuwe systeem werken. Jouw feedback is daarom bijzonder waardevol.$old$,
  $new$Jouw feedback is voor ons waardevol.$new$
), updated_at = now()
where id = 'partner_invitation';

-- accommodation_selected_partner (select-accommodation-quote): "apart bericht
-- via het partnerportaal" komt nooit → standaardzin. De code geeft geen
-- reference_number mee; logiesaanvragen hebben een LOG-nummer.
update public.email_templates
set body_html = replace(
  body_html,
  $old$Factureer het verblijf aan <strong>Bureau Vlieland</strong>. Je ontvangt hierover apart bericht via het partnerportaal.$old$,
  $new$Mail na uitvoering de pdf van je factuur naar <a href="mailto:invoices@reply.bureauvlieland.nl">invoices@reply.bureauvlieland.nl</a>, met onze referentie (het LOG-nummer) erop. Wij factureren centraal aan de klant.$new$
), updated_at = now()
where id = 'accommodation_selected_partner';

-- cancellation_customer: bij admin-annulering gaat er niet automatisch iets uit.
update public.email_templates
set body_html = replace(
  body_html,
  $old$Alle {{providers_count}} betrokken aanbieder(s) zijn automatisch op de hoogte gesteld.$old$,
  $new$Wij informeren de betrokken aanbieders.$new$
), updated_at = now()
where id = 'cancellation_customer';

-- date_change_customer: neutraal; update-customer-program vult has_accommodation nu wel.
update public.email_templates
set body_html = replace(
  body_html,
  $old$Alle betrokken aanbieder(s){{#if has_accommodation}} en logiespartner(s){{/if}} zijn op de hoogte gesteld en wij wachten op hun bevestiging.$old$,
  $new$Wij informeren de betrokken aanbieders{{#if has_accommodation}} en logiespartner(s){{/if}} en wachten op hun bevestiging.$new$
), updated_at = now()
where id = 'date_change_customer';

-- item_added_partner: de template houdt de labels; update-customer-program geeft
-- vanaf nu platte waarden mee (geen dubbel "Voorkeurstijd: Voorkeurstijd:").
-- Typo "partnerportaa" herstellen.
update public.email_templates
set body_html = replace(
  body_html,
  $old$via het partnerportaa en$old$,
  $new$via het partnerportaal en$new$
), updated_at = now()
where id = 'item_added_partner';

-- item_changes_partner: actor-neutraal (ook de admin publiceert via deze template).
update public.email_templates
set body_html = replace(
  body_html,
  $old$De klant <strong>{{customer_name}}</strong> heeft wijzigingen doorgevoerd in een aanvraag waarvoor jij eerder benaderd bent.$old$,
  $new$Er zijn wijzigingen in het programma van <strong>{{customer_name}}</strong>, een aanvraag waarvoor jij eerder benaderd bent.$new$
), updated_at = now()
where id = 'item_changes_partner';
