-- Doorverwijsmails bruiloften: nieuwe tekst voor het bruidspaar, een persoonlijke
-- mail aan de partner en de "al bekend"-link
-- (docs/plan-bruiloftsdoorverwijzingen.md → Mail aan de partner).
--
-- 1. wedding_referrals krijgt een geheim token voor de link in de partnermail,
--    het tijdstip en de herkomst van een melding "al bekend", en de verwijzing
--    naar de verzonden partnermail (zoals de klantmail al had).
-- 2. De mail aan het bruidspaar krijgt de nieuwe tekst en de Nederlandse
--    placeholders. LET OP: dit vervangt de bestaande tekst, ook als die in de
--    admin is aangepast.
-- 3. Nieuw sjabloon wedding_referral_partner: de mail aan de partner met alle
--    gegevens van het bruidspaar en de link om "al bekend" te melden.

-- 1. Kolommen ---------------------------------------------------------------

-- Een token per doorverwijzing; bestaande rijen krijgen er ook een. Niet te raden
-- (122 bits willekeur), net als review_token.
alter table public.wedding_referrals
  add column if not exists claim_token text not null default replace(gen_random_uuid()::text, '-', '');

create unique index if not exists wedding_referrals_claim_token_key
  on public.wedding_referrals (claim_token);

alter table public.wedding_referrals
  add column if not exists partner_claim_submitted_at timestamptz,
  add column if not exists partner_claim_source text
    constraint wedding_referrals_partner_claim_source_check check (partner_claim_source in ('admin', 'link')),
  add column if not exists partner_email_log_id uuid references public.email_log(id) on delete set null;

comment on column public.wedding_referrals.claim_token is
  'Geheim token in de link van de partnermail ("al bekend" melden); de link werkt tot vijf werkdagen na de doorverwijsmail.';
comment on column public.wedding_referrals.partner_claim_submitted_at is
  'Tijdstip waarop de partner "al bekend" meldde (via de link); leeg bij een handmatige invoer door de admin.';
comment on column public.wedding_referrals.partner_claim_source is
  'Herkomst van de melding: link = door de partner via de mail, admin = handmatig vastgelegd.';
comment on column public.wedding_referrals.partner_email_log_id is
  'De verzonden mail aan de partner (email_log), naast referral_email_log_id voor de mail aan het bruidspaar.';

-- 2. Mail aan het bruidspaar -----------------------------------------------

insert into public.email_templates (id, name, description, subject, body_html, variables, is_active)
values (
  'wedding_referral_customer',
  'Bruiloft — doorverwijzing naar partner',
  'Mail aan het bruidspaar waarin Bureau Vlieland de aanvraag doorverwijst naar een partner; de partner staat in cc. Voorzet in het dialoog "Doorverwijzen naar…", daar nog te bewerken. De partner krijgt gelijktijdig een eigen mail (wedding_referral_partner).',
  'Uw bruiloft op Vlieland',
  $body$
<p>Beste {{voornaam}},</p>

<p>Wat leuk dat u aan Vlieland denkt voor uw bruiloft{{#if trouwdatum}} op {{trouwdatum}}{{/if}}! Een mooiere plek om elkaar het jawoord te geven kunnen we ons haast niet voorstellen.</p>

<p>Voor bruiloften werken wij samen met {{partner_naam}}, die u graag verder helpt. Wij hebben uw aanvraag aan hen doorgegeven{{#if aantal_gasten}}, inclusief de ongeveer {{aantal_gasten}} gasten waar u op rekent,{{/if}} en hen in deze mail meegenomen. Zo kunnen zij snel persoonlijk contact met u opnemen.</p>

<p>U kunt {{partner_naam}} ook zelf bereiken via {{partner_email}}.</p>

<p>Veel plezier met de voorbereidingen!</p>

<p>Met hartelijke groet,<br>Het team van Bureau Vlieland</p>
$body$,
  '["voornaam","trouwdatum","partner_naam","aantal_gasten","partner_email"]'::jsonb,
  true
)
on conflict (id) do update
  set name = excluded.name,
      description = excluded.description,
      subject = excluded.subject,
      body_html = excluded.body_html,
      variables = excluded.variables,
      updated_at = now();

-- 3. Mail aan de partner ----------------------------------------------------

-- Lege velden (telefoon, datum, gasten, overnachtingen) vallen weg; alleen naam
-- en e-mailadres staan er altijd. {{aanvraagtekst}} en de andere waarden worden
-- door de edge function al ontsmet.
insert into public.email_templates (id, name, description, subject, body_html, variables, is_active)
values (
  'wedding_referral_partner',
  'Bruiloft — nieuwe aanvraag voor de partner',
  'Persoonlijke mail aan de partner op hetzelfde moment als de doorverwijsmail aan het bruidspaar: alle gegevens van het bruidspaar en de link om te melden dat het bruidspaar al bekend was. Wordt automatisch verstuurd, niet per keer te bewerken.',
  'Nieuwe bruiloftsaanvraag: {{naam_klant}}{{#if trouwdatum}}, {{trouwdatum}}{{/if}}',
  $body$
<p>Hoi {{partner_contactpersoon}},</p>

<p>Zojuist heb ik {{naam_klant}} met jullie in contact gebracht; jullie staan in cc bij die mail. Hieronder alles wat het bruidspaar bij ons heeft ingevuld, zodat je meteen goed beslagen ten ijs komt.</p>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0; font-size:15px; line-height:1.6;">
  <tr><td style="padding:2px 16px 2px 0; color:#475569; vertical-align:top; white-space:nowrap;">Naam:</td><td style="padding:2px 0;">{{naam_klant}}</td></tr>
  <tr><td style="padding:2px 16px 2px 0; color:#475569; vertical-align:top; white-space:nowrap;">E-mail:</td><td style="padding:2px 0;"><a href="mailto:{{email_klant}}" style="color:#0F4C5C;">{{email_klant}}</a></td></tr>
  {{#if telefoon_klant}}<tr><td style="padding:2px 16px 2px 0; color:#475569; vertical-align:top; white-space:nowrap;">Telefoon:</td><td style="padding:2px 0;">{{telefoon_klant}}</td></tr>{{/if}}
  {{#if trouwdatum}}<tr><td style="padding:2px 16px 2px 0; color:#475569; vertical-align:top; white-space:nowrap;">Gewenste datum:</td><td style="padding:2px 0;">{{trouwdatum}}</td></tr>{{/if}}
  {{#if aantal_gasten}}<tr><td style="padding:2px 16px 2px 0; color:#475569; vertical-align:top; white-space:nowrap;">Aantal gasten:</td><td style="padding:2px 0;">{{aantal_gasten}}</td></tr>{{/if}}
  {{#if overnachtingen}}<tr><td style="padding:2px 16px 2px 0; color:#475569; vertical-align:top; white-space:nowrap;">Overnachtingen:</td><td style="padding:2px 0;">{{overnachtingen}}</td></tr>{{/if}}
</table>

{{#if aanvraagtekst}}
<p style="margin:0 0 6px;"><strong>Aanvraag zoals ingevuld:</strong></p>
<div style="margin:0 0 20px; padding:12px 16px; border-left:3px solid #E36414; background:#F8FAFC; color:#0F172A;">{{aanvraagtekst}}</div>
{{/if}}

<p>Was dit bruidspaar al bij jullie bekend? Klik dan binnen vijf werkdagen (uiterlijk {{uiterlijk_datum}}) op onderstaande link en vul de datum van jullie eerste contact in. Dan valt deze aanvraag buiten onze doorverwijsafspraak. Hoor ik niets, dan noteer ik hem als doorverwijzing van Bureau Vlieland.</p>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
  <tr>
    <td>
      <a href="{{al_bekend_link}}" style="display:inline-block; background:#E36414; color:#ffffff; text-decoration:none; padding:12px 22px; border-radius:6px; font-weight:600;">
        Dit bruidspaar was al bij ons bekend
      </a>
    </td>
  </tr>
</table>

<p>Veel succes ermee!</p>

<p>Groet,<br>Erwin Soolsma<br>Bureau Vlieland</p>
$body$,
  '["partner_contactpersoon","naam_klant","email_klant","telefoon_klant","trouwdatum","aantal_gasten","overnachtingen","aanvraagtekst","uiterlijk_datum","al_bekend_link"]'::jsonb,
  true
)
on conflict (id) do nothing;
