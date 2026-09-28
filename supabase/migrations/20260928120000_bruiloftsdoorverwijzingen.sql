-- Doorverwijzingen van bruiloftsaanvragen (docs/plan-bruiloftsdoorverwijzingen.md, fase 1).
--
-- Bureau Vlieland voert geen bruiloften meer uit; aanvragen gaan naar een
-- partner en per geboekte bruiloft ontvangt het bureau een vaste vergoeding.
--
-- 1. partners: welke partner doorverwijzingen ontvangt, en op welk adres.
-- 2. wedding_referral_fee_schedules: de staffel (bedragen excl. btw) met een
--    ingangsdatum, zodat een tariefwijziging eerdere doorverwijzingen niet
--    raakt. De vergoeding wordt bij "geboekt" op de doorverwijzing zelf
--    vastgelegd.
-- 3. wedding_referrals: de doorverwijzing zelf, met bruidspaar, partner,
--    data, status, vergoeding en factuurstatus. Persoonsgegevens van
--    particulieren: alleen admins, en te anonimiseren na afronding.
-- 4. Automatisch vervallen: 18 maanden na de datum doorverwezen zonder
--    boeking. Dagelijkse cron plus dezelfde functie vanuit de admin-pagina.

-- 1. Partners ---------------------------------------------------------------

alter table public.partners
  add column if not exists receives_wedding_referrals boolean not null default false,
  add column if not exists wedding_referral_email text;

comment on column public.partners.receives_wedding_referrals is
  'Partner ontvangt doorverwezen bruiloftsaanvragen; alleen deze partners zijn te kiezen bij een doorverwijzing.';
comment on column public.partners.wedding_referral_email is
  'Apart e-mailadres voor bruiloftsdoorverwijzingen. Leeg = contact_email, anders het loginadres.';

-- Island Events en Paal 50 (Island Events wordt zo nodig door Erwin als partner aangemaakt).
update public.partners
   set receives_wedding_referrals = true
 where id = 'paal-50' or name ilike 'island events%';

-- Beide beschermtriggers: een partner mag deze admin-velden niet zelf wijzigen.
CREATE OR REPLACE FUNCTION public.guard_partner_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF NEW.auth_user_id IS DISTINCT FROM auth.uid()
     AND OLD.auth_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN NEW;
  END IF;

  IF NEW.commission_percentage IS DISTINCT FROM OLD.commission_percentage
     OR NEW.accommodation_commission_percentage IS DISTINCT FROM OLD.accommodation_commission_percentage
     OR NEW.partner_token IS DISTINCT FROM OLD.partner_token
     OR NEW.is_active IS DISTINCT FROM OLD.is_active
     OR NEW.partner_type IS DISTINCT FROM OLD.partner_type
     OR NEW.iban IS DISTINCT FROM OLD.iban
     OR NEW.bank_iban IS DISTINCT FROM OLD.bank_iban
     OR NEW.bic IS DISTINCT FROM OLD.bic
     OR NEW.bank_account_name IS DISTINCT FROM OLD.bank_account_name
     OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.reference_number IS DISTINCT FROM OLD.reference_number
     OR NEW.map_api_key IS DISTINCT FROM OLD.map_api_key
     OR NEW.is_public IS DISTINCT FROM OLD.is_public
     OR NEW.receives_wedding_referrals IS DISTINCT FROM OLD.receives_wedding_referrals
     OR NEW.wedding_referral_email IS DISTINCT FROM OLD.wedding_referral_email
  THEN
    RAISE EXCEPTION 'Partners cannot modify restricted fields (commissions, token, role, bank details, email, reference, map_api_key, visibility, wedding referrals).'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.protect_partner_self_update_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin(auth.uid()) OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Alleen relevant als de partner zichzelf update via 'Partners can update own data via auth'
  IF NEW.auth_user_id IS NULL OR NEW.auth_user_id <> auth.uid() THEN
    RETURN NEW;
  END IF;

  IF NEW.id                                  IS DISTINCT FROM OLD.id
     OR NEW.auth_user_id                     IS DISTINCT FROM OLD.auth_user_id
     OR NEW.is_active                        IS DISTINCT FROM OLD.is_active
     OR NEW.partner_type                     IS DISTINCT FROM OLD.partner_type
     OR NEW.commission_percentage            IS DISTINCT FROM OLD.commission_percentage
     OR NEW.accommodation_commission_percentage IS DISTINCT FROM OLD.accommodation_commission_percentage
     OR NEW.extras_commission_percentage     IS DISTINCT FROM OLD.extras_commission_percentage
     OR NEW.map_api_key                      IS DISTINCT FROM OLD.map_api_key
     OR NEW.is_public                        IS DISTINCT FROM OLD.is_public
     OR NEW.pays_by_direct_debit             IS DISTINCT FROM OLD.pays_by_direct_debit
     OR NEW.email                            IS DISTINCT FROM OLD.email
     OR NEW.receives_wedding_referrals       IS DISTINCT FROM OLD.receives_wedding_referrals
     OR NEW.wedding_referral_email           IS DISTINCT FROM OLD.wedding_referral_email
  THEN
    RAISE EXCEPTION 'Partner mag rechten/financiële/admin-velden niet wijzigen op eigen partnerrecord';
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Staffel ----------------------------------------------------------------

create table if not exists public.wedding_referral_fee_schedules (
  id uuid primary key default gen_random_uuid(),
  -- geldt voor doorverwijzingen met een datum doorverwezen op of na deze dag
  effective_from date not null unique,
  -- oplopend op max_guests; de laatste trede heeft max_guests null (= meer dan de vorige grens)
  -- bijv. [{"max_guests":50,"fee":350},{"max_guests":100,"fee":550},{"max_guests":null,"fee":750}]
  tiers jsonb not null,
  -- toeslag voor een meerdaagse bruiloft, excl. btw
  multi_day_surcharge numeric(10,2) not null default 0,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wedding_referral_fee_schedules_tiers_is_array
    check (jsonb_typeof(tiers) = 'array' and jsonb_array_length(tiers) >= 1),
  constraint wedding_referral_fee_schedules_surcharge_positive
    check (multi_day_surcharge >= 0)
);

grant select, insert, update, delete on public.wedding_referral_fee_schedules to authenticated;
grant all on public.wedding_referral_fee_schedules to service_role;

alter table public.wedding_referral_fee_schedules enable row level security;

create policy "Admins beheren de staffel voor bruiloftsdoorverwijzingen"
  on public.wedding_referral_fee_schedules for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create trigger trg_wedding_referral_fee_schedules_updated_at
  before update on public.wedding_referral_fee_schedules
  for each row execute function public.update_updated_at_column();

insert into public.wedding_referral_fee_schedules (effective_from, tiers, multi_day_surcharge, note)
values (
  '2026-01-01',
  '[{"max_guests":50,"fee":350},{"max_guests":100,"fee":550},{"max_guests":null,"fee":750}]'::jsonb,
  250,
  'Eerste staffel: tot en met 50 daggasten € 350, 51 tot en met 100 € 550, meer dan 100 € 750; meerdaags + € 250. Bedragen excl. btw.'
)
on conflict (effective_from) do nothing;

-- 3. Doorverwijzingen -------------------------------------------------------

create table if not exists public.wedding_referrals (
  id uuid primary key default gen_random_uuid(),
  -- bruidspaar (persoonsgegevens; worden geanonimiseerd na afronding)
  couple_names text not null,
  couple_email text,
  couple_phone text,
  -- koppeling aan de oorspronkelijke aanvraag, als die in het systeem staat
  request_id uuid references public.program_requests(id) on delete set null,
  sales_inbox_id uuid references public.sales_inbox(id) on delete set null,
  partner_id text not null references public.partners(id) on delete restrict,
  requested_at date not null,
  referred_at date not null,
  -- 18 maanden na referred_at; de trigger hieronder vult hem als hij leeg is
  expires_at date not null,
  expected_wedding_date date,
  -- 'month' = alleen maand/jaar bekend; expected_wedding_date staat dan op de eerste van de maand
  expected_wedding_precision text not null default 'day'
    check (expected_wedding_precision in ('day', 'month')),
  estimated_guests integer check (estimated_guests is null or estimated_guests >= 0),
  notes text not null default '',
  status text not null default 'referred'
    check (status in ('referred', 'booked', 'not_proceeded', 'expired')),
  status_changed_at timestamptz not null default now(),
  -- na afloop
  final_wedding_date date,
  final_day_guests integer check (final_day_guests is null or final_day_guests >= 0),
  is_multi_day boolean not null default false,
  -- vergoeding excl. btw, vastgelegd op het moment van "geboekt"
  fee_schedule_id uuid references public.wedding_referral_fee_schedules(id) on delete restrict,
  fee_calculated_amount numeric(10,2),
  fee_amount numeric(10,2),
  fee_override_note text not null default '',
  invoice_status text not null default 'not_applicable'
    check (invoice_status in ('not_applicable', 'to_invoice', 'invoiced', 'paid')),
  invoice_number text,
  invoice_date date,
  invoice_paid_at date,
  anonymized_at timestamptz,
  -- fase 2: de verzonden doorverwijsmail
  referral_email_log_id uuid references public.email_log(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- alleen "geboekt" levert een vergoeding op en is te factureren
  constraint wedding_referrals_fee_only_when_booked
    check (status = 'booked' or (fee_amount is null and fee_calculated_amount is null)),
  constraint wedding_referrals_invoice_only_when_booked
    check (status = 'booked' or invoice_status = 'not_applicable'),
  constraint wedding_referrals_expires_after_referral
    check (expires_at >= referred_at)
);

create index if not exists wedding_referrals_partner_idx
  on public.wedding_referrals (partner_id, referred_at desc);
create index if not exists wedding_referrals_open_idx
  on public.wedding_referrals (expires_at) where status = 'referred';
create index if not exists wedding_referrals_request_idx
  on public.wedding_referrals (request_id) where request_id is not null;

grant select, insert, update, delete on public.wedding_referrals to authenticated;
grant all on public.wedding_referrals to service_role;

alter table public.wedding_referrals enable row level security;

create policy "Admins beheren bruiloftsdoorverwijzingen"
  on public.wedding_referrals for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create trigger trg_wedding_referrals_updated_at
  before update on public.wedding_referrals
  for each row execute function public.update_updated_at_column();

create or replace function public.wedding_referrals_before_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.expires_at is null then
    new.expires_at := (new.referred_at + interval '18 months')::date;
  end if;
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    new.status_changed_at := now();
  end if;
  return new;
end;
$$;

create trigger trg_wedding_referrals_before_write
  before insert or update on public.wedding_referrals
  for each row execute function public.wedding_referrals_before_write();

-- 4. Automatisch vervallen --------------------------------------------------

-- Zet "doorverwezen" op "vervallen" zodra de vervaldatum verstreken is.
-- Geeft het aantal gewijzigde rijen terug. Vanuit de cron zonder gebruiker;
-- vanuit de admin alleen door een admin.
create or replace function public.expire_wedding_referrals()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  if auth.uid() is not null and not public.is_admin(auth.uid()) then
    raise exception 'Alleen admins' using errcode = 'insufficient_privilege';
  end if;

  update public.wedding_referrals
     set status = 'expired'
   where status = 'referred'
     and expires_at < current_date;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.expire_wedding_referrals() from public;
grant execute on function public.expire_wedding_referrals() to authenticated, service_role;

select cron.unschedule('wedding-referrals-expire-daily')
 where exists (select 1 from cron.job where jobname = 'wedding-referrals-expire-daily');

select cron.schedule(
  'wedding-referrals-expire-daily',
  '15 3 * * *',
  $$select public.expire_wedding_referrals();$$
);
