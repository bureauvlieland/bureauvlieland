-- Partnerafspraken met akkoord in het partnerportaal
-- (docs/plan-bruiloftsdoorverwijzingen.md → Partnerafspraken).
--
-- Afspraken van Bureau Vlieland met partners (eerst: de doorverwijsregeling
-- voor bruiloften) staan als tekst in de admin, per versie. De partner leest
-- de tekst in het portaal en klikt op akkoord; vastgelegd worden wie, wanneer,
-- welke versie en een kopie van de tekst op dat moment. Dat is een
-- elektronische akkoordverklaring waar je bij een discussie op terug kunt vallen.
--
-- 1. partner_agreements: de afspraken, per (key, versie). Een wijziging is een
--    nieuwe versie; oude versies blijven staan. Alleen gepubliceerde versies
--    zijn voor partners zichtbaar; concepten alleen voor admins.
-- 2. partner_agreement_acceptances: het akkoord van een partner op één versie.
--    De trigger vult de kopie van de tekst en bewaakt dat alleen de partner
--    zelf (niet een meekijkende admin) akkoord geeft. Na het akkoord ontstaat
--    een werkbanktaak voor het bureau.
-- 3. Eerste afspraak als concept: de doorverwijsregeling bruiloften.

-- 1. Afspraken ------------------------------------------------------------

create table if not exists public.partner_agreements (
  id uuid primary key default gen_random_uuid(),
  -- vaste sleutel per afspraak, bijv. 'wedding_referral' of 'samenwerking'
  key text not null,
  version integer not null check (version >= 1),
  title text not null,
  -- korte toelichting op deze versie (wat is er veranderd), voor partner en admin
  summary text not null default '',
  -- de afspraak zelf, in markdown
  body_markdown text not null,
  effective_from date not null,
  -- voor wie de afspraak geldt
  applies_to text not null default 'all' check (applies_to in ('all', 'wedding_referral_partners')),
  status text not null default 'draft' check (status in ('draft', 'published', 'withdrawn')),
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (key, version)
);

create index if not exists partner_agreements_key_idx on public.partner_agreements (key, version desc);

grant select, insert, update, delete on public.partner_agreements to authenticated;
grant all on public.partner_agreements to service_role;

alter table public.partner_agreements enable row level security;

create trigger trg_partner_agreements_updated_at
  before update on public.partner_agreements
  for each row execute function public.update_updated_at_column();

-- Geldt een afspraak voor deze partner?
create or replace function public.partner_agreement_applies(_agreement_id uuid, _partner_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.partner_agreements a
      join public.partners p on p.id = _partner_id
     where a.id = _agreement_id
       and (
         a.applies_to = 'all'
         or (a.applies_to = 'wedding_referral_partners' and p.receives_wedding_referrals)
       )
  );
$$;

revoke all on function public.partner_agreement_applies(uuid, text) from public;
grant execute on function public.partner_agreement_applies(uuid, text) to authenticated, service_role;

create policy "Admins beheren partnerafspraken"
  on public.partner_agreements for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "Partners lezen gepubliceerde afspraken die voor hen gelden"
  on public.partner_agreements for select
  to authenticated
  using (
    status = 'published'
    and public.partner_agreement_applies(id, public.get_partner_id(auth.uid()))
  );

-- 2. Akkoorden -------------------------------------------------------------

create table if not exists public.partner_agreement_acceptances (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.partner_agreements(id) on delete restrict,
  partner_id text not null references public.partners(id) on delete cascade,
  -- de ingelogde gebruiker van de partner; de trigger vult dit uit auth.uid()
  accepted_by uuid,
  accepted_by_email text not null default '',
  accepted_at timestamptz not null default now(),
  -- kopie van de afspraak op het moment van akkoord (de trigger vult dit)
  version integer not null default 0,
  title_snapshot text not null default '',
  body_snapshot text not null default '',
  user_agent text not null default '',
  created_at timestamptz not null default now(),
  -- één akkoord per partner per versie
  unique (agreement_id, partner_id)
);

create index if not exists partner_agreement_acceptances_partner_idx
  on public.partner_agreement_acceptances (partner_id, accepted_at desc);

grant select, insert on public.partner_agreement_acceptances to authenticated;
grant all on public.partner_agreement_acceptances to service_role;

alter table public.partner_agreement_acceptances enable row level security;

create policy "Admins lezen akkoorden"
  on public.partner_agreement_acceptances for select
  to authenticated
  using (public.is_admin(auth.uid()));

create policy "Partners lezen eigen akkoorden"
  on public.partner_agreement_acceptances for select
  to authenticated
  using (partner_id = public.get_partner_id(auth.uid()));

create policy "Partners geven zelf akkoord"
  on public.partner_agreement_acceptances for insert
  to authenticated
  with check (partner_id = public.get_partner_id(auth.uid()));

-- Vult de kopie van de tekst en bewaakt wie akkoord geeft.
create or replace function public.partner_agreement_acceptance_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.partner_agreements%rowtype;
begin
  select * into a from public.partner_agreements where id = new.agreement_id;
  if not found then
    raise exception 'Afspraak niet gevonden';
  end if;
  if a.status <> 'published' then
    raise exception 'Deze afspraak is niet gepubliceerd';
  end if;
  if not public.partner_agreement_applies(a.id, new.partner_id) then
    raise exception 'Deze afspraak geldt niet voor deze partner';
  end if;

  -- Vanuit de browser: alleen de partner zelf, nooit een admin die meekijkt.
  if auth.uid() is not null and coalesce(auth.role(), '') <> 'service_role' then
    if public.is_admin(auth.uid()) then
      raise exception 'Een beheerder kan niet namens een partner akkoord geven' using errcode = 'insufficient_privilege';
    end if;
    if new.partner_id is distinct from public.get_partner_id(auth.uid()) then
      raise exception 'Alleen de partner zelf kan akkoord geven' using errcode = 'insufficient_privilege';
    end if;
    new.accepted_by := auth.uid();
    new.accepted_by_email := coalesce(nullif(new.accepted_by_email, ''), auth.jwt() ->> 'email', '');
  end if;

  new.accepted_at := now();
  new.version := a.version;
  new.title_snapshot := a.title;
  new.body_snapshot := a.body_markdown;
  return new;
end;
$$;

revoke all on function public.partner_agreement_acceptance_before_insert() from public;

create trigger trg_partner_agreement_acceptances_before_insert
  before insert on public.partner_agreement_acceptances
  for each row execute function public.partner_agreement_acceptance_before_insert();

-- Werkbanktaak voor het bureau zodra een partner akkoord geeft.
create or replace function public.partner_agreement_acceptance_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partner_name text;
  v_title text;
begin
  select name into v_partner_name from public.partners where id = new.partner_id;
  select title into v_title from public.partner_agreements where id = new.agreement_id;
  insert into public.admin_todos (title, description, priority, status, related_partner_id, auto_type, auto_entity_id)
  values (
    left(format('%s akkoord met "%s" (versie %s)', coalesce(v_partner_name, new.partner_id), coalesce(v_title, 'afspraak'), new.version), 200),
    format('Akkoord gegeven op %s door %s. Zie Systeem → Partnerafspraken.', to_char(new.accepted_at at time zone 'Europe/Amsterdam', 'DD-MM-YYYY HH24:MI'), coalesce(nullif(new.accepted_by_email, ''), 'de partner')),
    'low',
    'todo',
    new.partner_id,
    'partner_agreement_accepted',
    new.id::text
  );
  return new;
end;
$$;

revoke all on function public.partner_agreement_acceptance_after_insert() from public;

create trigger trg_partner_agreement_acceptances_after_insert
  after insert on public.partner_agreement_acceptances
  for each row execute function public.partner_agreement_acceptance_after_insert();

-- 3. Eerste afspraak: doorverwijsregeling bruiloften (concept, publiceren in de admin)

insert into public.partner_agreements (key, version, title, summary, body_markdown, effective_from, applies_to, status)
values (
  'wedding_referral',
  1,
  'Doorverwijsregeling bruiloften',
  'Eerste versie: wat Bureau Vlieland en de partner afspreken over doorverwezen bruiloftsaanvragen, de vergoeding en de melding van al bekende bruidsparen.',
  $md$
Deze regeling geldt tussen Bureau Vlieland en de partner voor bruiloftsaanvragen die Bureau Vlieland doorverwijst.

## 1. Doorverwijzing

Bureau Vlieland organiseert zelf geen bruiloften. Een bruiloftsaanvraag die bij Bureau Vlieland binnenkomt, wordt per e-mail aan het bruidspaar doorverwezen naar de partner, met de partner in cc. De datum van die e-mail is de **datum doorverwezen**. De partner neemt daarna zelf contact op met het bruidspaar.

## 2. Bruidspaar al bekend bij de partner

Was het bruidspaar al vóór de doorverwijzing in contact met de partner, dan meldt de partner dat **binnen vijf werkdagen** na de doorverwijsmail aan Bureau Vlieland, met de datum van het eerste contact. Blijft die melding uit, dan geldt de aanvraag als doorverwijzing van Bureau Vlieland. Wie het eerst aantoonbaar contact had, heeft de klant.

## 3. Vergoeding

Per geboekte bruiloft die via Bureau Vlieland is doorverwezen, betaalt de partner een vaste vergoeding, exclusief btw, op basis van het aantal daggasten:

| Daggasten | Vergoeding |
|---|---|
| tot en met 50 | € 350 |
| 51 tot en met 100 | € 550 |
| meer dan 100 | € 750 |

Voor een meerdaagse bruiloft komt daar € 250 bij. De staffel die geldt op de datum doorverwezen blijft voor die doorverwijzing gelden. Een wijziging van de staffel kondigt Bureau Vlieland vooraf aan; die geldt alleen voor nieuwe doorverwijzingen.

## 4. Looptijd

Een doorverwijzing geldt **18 maanden** na de datum doorverwezen. Boekt het bruidspaar binnen die termijn bij de partner, dan is de vergoeding verschuldigd, ook als de bruiloft zelf later plaatsvindt.

## 5. Melden en controleren

De partner laat Bureau Vlieland weten wanneer een doorverwezen bruidspaar boekt, met de trouwdatum, het aantal daggasten en of de bruiloft meerdaags is, uiterlijk bij de bevestiging aan het bruidspaar. Na het seizoen stuurt Bureau Vlieland een lijst van doorverwijzingen waarvan de trouwdatum voorbij is; de partner bevestigt binnen 14 dagen per doorverwijzing of die geboekt is, niet is doorgegaan of nog open staat.

## 6. Facturatie

Bureau Vlieland factureert de vergoeding na de boeking, of gebundeld na het seizoen. De betaaltermijn is 14 dagen. Wordt een geboekte bruiloft geannuleerd voordat die plaatsvindt en brengt de partner het bruidspaar daarvoor geen kosten in rekening, dan vervalt de vergoeding; een al betaalde vergoeding wordt gecrediteerd.

## 7. Gegevens van het bruidspaar

De partner gebruikt de gegevens van het bruidspaar alleen voor deze aanvraag en behandelt ze vertrouwelijk. Bureau Vlieland bewaart de gegevens van de doorverwijzing niet langer dan nodig en anonimiseert ze na afronding.

## 8. Duur en opzegging

Deze regeling geldt tot een van beide partijen haar met een maand opzegt. Doorverwijzingen die vóór het einde zijn gedaan, blijven onder deze regeling vallen.
$md$,
  '2026-10-01',
  'wedding_referral_partners',
  'draft'
)
on conflict (key, version) do nothing;
