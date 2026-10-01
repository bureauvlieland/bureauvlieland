-- Bruidsparen die al bij de partner bekend waren (docs/plan-bruiloftsdoorverwijzingen.md,
-- "Melding partner").
--
-- Wie het eerst aantoonbaar contact had, heeft de klant. De partner staat in
-- cc op de doorverwijsmail en meldt binnen vijf werkdagen als het bruidspaar
-- al bekend was; blijft die melding uit, dan geldt de doorverwijzing als
-- "bevestigd nieuw" (berekend, niet opgeslagen). Bij "al bekend" is de
-- vergoeding bij een boeking standaard nul, met de melding als reden.
--
-- 1. prior_contact_note: wat het bruidspaar zelf bij de intake zei over
--    eerder contact met partijen op Vlieland.
-- 2. partner_claim en bijbehorende datums en notitie: de melding van de partner.
-- 3. De standaardmail vraagt de partner om binnen vijf werkdagen te reageren.

alter table public.wedding_referrals
  add column if not exists prior_contact_note text not null default '',
  add column if not exists partner_claim text not null default 'none'
    constraint wedding_referrals_partner_claim_check check (partner_claim in ('none', 'already_known')),
  add column if not exists partner_claim_reported_at date,
  add column if not exists partner_claim_first_contact_at date,
  add column if not exists partner_claim_note text not null default '';

comment on column public.wedding_referrals.prior_contact_note is
  'Intake: wat het bruidspaar meldde over eerder contact met partijen op Vlieland.';
comment on column public.wedding_referrals.partner_claim is
  'Melding van de partner: none = geen melding (na 5 werkdagen "bevestigd nieuw"), already_known = bruidspaar was al bekend bij de partner.';
comment on column public.wedding_referrals.partner_claim_reported_at is
  'Datum waarop de partner meldde dat het bruidspaar al bekend was.';
comment on column public.wedding_referrals.partner_claim_first_contact_at is
  'Datum van het eerste contact volgens de partner.';

-- 3. Vraag aan de partner in de standaardmail, alleen als die zin er nog niet staat.
update public.email_templates
   set body_html = replace(
         body_html,
         '<p>U kunt {{partner_name}} ook zelf bereiken:</p>',
         '<p>Voor {{partner_name}} (in cc): kende u dit bruidspaar al? Laat het ons dan binnen vijf werkdagen weten, met de datum van het eerste contact. Horen wij niets, dan geldt dit als een doorverwijzing van Bureau Vlieland.</p>

<p>U kunt {{partner_name}} ook zelf bereiken:</p>'
       ),
       updated_at = now()
 where id = 'wedding_referral_customer'
   and body_html not ilike '%kende u dit bruidspaar al%'
   and body_html like '%<p>U kunt {{partner_name}} ook zelf bereiken:</p>%';
