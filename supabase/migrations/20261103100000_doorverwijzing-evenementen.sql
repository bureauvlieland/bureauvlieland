-- Doorverwijzingen van evenementen naast bruiloften
-- (docs/plan-bruiloftsdoorverwijzingen.md → Evenementen doorverwijzen).
--
-- Vraag van Erwin: een algemene aanvraag voor een evenement (geen bruiloft) die
-- via bureauvlieland.nl binnenkomt ook kunnen doorzetten naar een partner
-- (Paal 50), met een eigen tekst in de mail aan de klant en in de mail aan de
-- partner. De flow (partner in cc, eigen partnermail met "al bekend"-link,
-- vijf werkdagen, staffel bij een boeking) blijft dezelfde.
--
-- 1. wedding_referrals.referral_kind: bruiloft (standaard, alle bestaande rijen)
--    of evenement. Bepaalt welke sjablonen de doorverwijsknop gebruikt en hoe
--    de admin en de meldpagina de klant noemen.
-- 2. Sjabloon event_referral_customer: mail aan de klant, partner in cc.
-- 3. Sjabloon event_referral_partner: mail aan de partner met alle gegevens en
--    de link om "al bekend" te melden.
-- Beide sjablonen zijn bij Email Templates te bewerken; de migratie overschrijft
-- een bestaande (aangepaste) tekst niet.

-- 1. Kolom ------------------------------------------------------------------

alter table public.wedding_referrals
  add column if not exists referral_kind text not null default 'wedding'
    constraint wedding_referrals_referral_kind_check check (referral_kind in ('wedding', 'event'));

comment on column public.wedding_referrals.referral_kind is
  'Soort doorverwijzing: wedding = bruiloft (sjablonen wedding_referral_*), event = ander evenement (sjablonen event_referral_*).';

-- 2. Mail aan de klant --------------------------------------------------------

insert into public.email_templates (id, name, description, subject, body_html, variables, is_active)
values (
  'event_referral_customer',
  'Evenement — doorverwijzing naar partner',
  'Mail aan de klant waarin Bureau Vlieland een aanvraag voor een evenement (geen bruiloft) doorverwijst naar een partner; de partner staat in cc. Voorzet in het dialoog "Doorverwijzen naar…" met soort "Evenement", daar nog te bewerken. De partner krijgt gelijktijdig een eigen mail (event_referral_partner).',
  'Uw evenement op Vlieland',
  $body$
<p>Beste {{voornaam}},</p>

<p>Dank voor uw aanvraag voor een evenement op Vlieland{{#if datum}} op {{datum}}{{/if}}. Wat leuk dat u aan het eiland denkt!</p>

<p>Voor dit soort evenementen werken wij samen met {{partner_naam}}, die u graag verder helpt. Wij hebben uw aanvraag aan hen doorgegeven{{#if aantal_gasten}}, inclusief de ongeveer {{aantal_gasten}} gasten waar u op rekent,{{/if}} en hen in deze mail meegenomen. Zo kunnen zij snel persoonlijk contact met u opnemen.</p>

<p>U kunt {{partner_naam}} ook zelf bereiken via {{partner_email}}.</p>

<p>Wij wensen u een mooi evenement op Vlieland!</p>

<p>Met hartelijke groet,<br>Het team van Bureau Vlieland</p>
$body$,
  '["voornaam","datum","partner_naam","aantal_gasten","partner_email"]'::jsonb,
  true
)
on conflict (id) do nothing;

-- 3. Mail aan de partner ------------------------------------------------------

-- Lege velden (telefoon, datum, gasten, overnachtingen) vallen weg; alleen naam
-- en e-mailadres staan er altijd. {{aanvraagtekst}} en de andere waarden worden
-- door de edge function al ontsmet.
insert into public.email_templates (id, name, description, subject, body_html, variables, is_active)
values (
  'event_referral_partner',
  'Evenement — nieuwe aanvraag voor de partner',
  'Persoonlijke mail aan de partner op hetzelfde moment als de doorverwijsmail aan de klant (evenement, geen bruiloft): alle gegevens van de klant en de link om te melden dat de klant al bekend was. Wordt automatisch verstuurd, niet per keer te bewerken.',
  'Nieuwe aanvraag evenement: {{naam_klant}}{{#if datum}}, {{datum}}{{/if}}',
  $body$
<p>Hoi {{partner_contactpersoon}},</p>

<p>Zojuist heb ik {{naam_klant}} met jullie in contact gebracht voor een evenement op Vlieland; jullie staan in cc bij die mail. Hieronder alles wat de klant bij ons heeft ingevuld, zodat je meteen goed beslagen ten ijs komt.</p>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0; font-size:15px; line-height:1.6;">
  <tr><td style="padding:2px 16px 2px 0; color:#475569; vertical-align:top; white-space:nowrap;">Naam:</td><td style="padding:2px 0;">{{naam_klant}}</td></tr>
  <tr><td style="padding:2px 16px 2px 0; color:#475569; vertical-align:top; white-space:nowrap;">E-mail:</td><td style="padding:2px 0;"><a href="mailto:{{email_klant}}" style="color:#0F4C5C;">{{email_klant}}</a></td></tr>
  {{#if telefoon_klant}}<tr><td style="padding:2px 16px 2px 0; color:#475569; vertical-align:top; white-space:nowrap;">Telefoon:</td><td style="padding:2px 0;">{{telefoon_klant}}</td></tr>{{/if}}
  {{#if datum}}<tr><td style="padding:2px 16px 2px 0; color:#475569; vertical-align:top; white-space:nowrap;">Gewenste datum:</td><td style="padding:2px 0;">{{datum}}</td></tr>{{/if}}
  {{#if aantal_gasten}}<tr><td style="padding:2px 16px 2px 0; color:#475569; vertical-align:top; white-space:nowrap;">Aantal gasten:</td><td style="padding:2px 0;">{{aantal_gasten}}</td></tr>{{/if}}
  {{#if overnachtingen}}<tr><td style="padding:2px 16px 2px 0; color:#475569; vertical-align:top; white-space:nowrap;">Overnachtingen:</td><td style="padding:2px 0;">{{overnachtingen}}</td></tr>{{/if}}
</table>

{{#if aanvraagtekst}}
<p style="margin:0 0 6px;"><strong>Aanvraag zoals ingevuld:</strong></p>
<div style="margin:0 0 20px; padding:12px 16px; border-left:3px solid #E36414; background:#F8FAFC; color:#0F172A;">{{aanvraagtekst}}</div>
{{/if}}

<p>Was deze klant al bij jullie bekend? Klik dan binnen vijf werkdagen (uiterlijk {{uiterlijk_datum}}) op onderstaande link en vul de datum van jullie eerste contact in. Dan valt deze aanvraag buiten onze doorverwijsafspraak. Hoor ik niets, dan noteer ik hem als doorverwijzing van Bureau Vlieland.</p>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
  <tr>
    <td>
      <a href="{{al_bekend_link}}" style="display:inline-block; background:#E36414; color:#ffffff; text-decoration:none; padding:12px 22px; border-radius:6px; font-weight:600;">
        Deze klant was al bij ons bekend
      </a>
    </td>
  </tr>
</table>

<p>Veel succes ermee!</p>

<p>Groet,<br>Erwin Soolsma<br>Bureau Vlieland</p>
$body$,
  '["partner_contactpersoon","naam_klant","email_klant","telefoon_klant","datum","aantal_gasten","overnachtingen","aanvraagtekst","uiterlijk_datum","al_bekend_link"]'::jsonb,
  true
)
on conflict (id) do nothing;
