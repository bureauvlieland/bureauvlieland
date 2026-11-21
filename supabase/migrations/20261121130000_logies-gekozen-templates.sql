-- Audit notificaties fase 1 (docs/plan-notificaties.md, docs/notificaties-audit-inhoud.md):
-- templates accommodation_selected_customer / accommodation_selected_partner.
--
-- 1. Dubbel euroteken: de template had "€ {{price_total}}" terwijl de code het
--    bedrag al als formatCurrencyNL (met €) levert, net als bij de partnertemplate
--    en alle andere bedragvariabelen. Het €-teken gaat uit de template.
-- 2. Contactbelofte: klant las "de accommodatie neemt contact op", partner las
--    "Bureau Vlieland neemt contact met de gast op". Werkwijze (plan-logieskeuze,
--    plan-logies-aantalwijziging): het bureau zit ertussen, de partner krijgt geen
--    gastgegevens; na de keuze (klant tekende de logiesvoorwaarden) is de
--    reservering definitief. Beide mails zeggen nu dat Bureau Vlieland het
--    aanspreekpunt is en de afhandeling regelt.
-- 3. Voorwaarden-akkoordblok ({{terms_accepted_block}}) krijgt een vaste plek in
--    de klanttemplate, zodat select-accommodation-quote het niet meer achteraf
--    hoeft in te voegen.

update public.email_templates
set body_html = replace(
      body_html,
      '<strong style="font-size:20px;color:#0F4C5C;">€ {{price_total}}</strong>',
      '<strong style="font-size:20px;color:#0F4C5C;">{{price_total}}</strong>'
    ),
    updated_at = now()
where id = 'accommodation_selected_customer';

update public.email_templates
set body_html = replace(
      body_html,
      'De accommodatie neemt binnenkort contact met u op om de reservering definitief te maken.',
      'Uw reservering is definitief. Bureau Vlieland is uw aanspreekpunt en regelt de verdere afhandeling met de accommodatie. Heeft u vragen over uw verblijf, beantwoord dan gewoon deze mail.'
    ),
    updated_at = now()
where id = 'accommodation_selected_customer';

update public.email_templates
set body_html = replace(
      body_html,
      E'</p>\n\n<div style="background-color:#f0f9ff;padding:20px;border-radius:8px;margin:20px 0;text-align:center;">',
      E'</p>\n\n{{terms_accepted_block}}\n\n<div style="background-color:#f0f9ff;padding:20px;border-radius:8px;margin:20px 0;text-align:center;">'
    ),
    updated_at = now()
where id = 'accommodation_selected_customer'
  and position('{{terms_accepted_block}}' in body_html) = 0;

update public.email_templates
set body_html = replace(
      body_html,
      'Bureau Vlieland neemt contact met de gast op over de verdere afhandeling.',
      'Bureau Vlieland is het aanspreekpunt voor de gast en regelt de verdere afhandeling met je. Vragen over deze boeking? Reageer op deze mail.'
    ),
    updated_at = now()
where id = 'accommodation_selected_partner';
