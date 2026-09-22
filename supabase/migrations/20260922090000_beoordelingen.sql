-- Beoordelingen via de eigen applicatie (docs/plan-reviews-oogsten.md, fase 1).
--
-- 1. Elk programma krijgt een vaste beoordelingslink (review_token), los van
--    het portaal-token dat na 90 dagen verloopt: de nazorgmail gaat pas na
--    afloop en de link moet dan nog werken.
-- 2. Tabel customer_reviews: één beoordeling per programma, met de twee
--    toestemmingen (naam op de site, referentiepagina) en de publicatiestatus.
--    Admins lezen en beheren; de klant schrijft via de edge function
--    customer-review (service role). Publiek lezen komt in fase 2 via een
--    view met alleen de veilige kolommen, dus hier geen anon-rechten.
-- 3. Nazorgmail: één knop naar de eigen beoordelingspagina, Google als tweede
--    regel; automatisch versturen aan (besluit Erwin, 22 september 2026).
-- 4. Instelling voor de Tripadvisor-link (leeg = geen knop).

-- 1. Beoordelingslink per programma
alter table public.program_requests
  add column if not exists review_token text;

update public.program_requests
   set review_token = replace(gen_random_uuid()::text, '-', '')
 where review_token is null;

alter table public.program_requests
  alter column review_token set default replace(gen_random_uuid()::text, '-', ''),
  alter column review_token set not null;

create unique index if not exists program_requests_review_token_key
  on public.program_requests (review_token);

-- 2. Beoordelingen
create table if not exists public.customer_reviews (
  id uuid primary key default gen_random_uuid(),
  -- null voor bestaande citaten zonder programma (bron 'legacy' of 'manual')
  request_id uuid references public.program_requests(id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  -- "Wat sprak u het meest aan?" (publiceerbaar) en "Wat kan beter?" (intern)
  text_positive text not null default '',
  text_improve text not null default '',
  author_name text not null default '',
  author_role text not null default '',
  company text not null default '',
  consent_publish boolean not null default false,
  consent_reference boolean not null default false,
  consent_at timestamptz,
  consent_ip text,
  consent_version text not null default '2026-09',
  status text not null default 'new' check (status in ('new', 'published', 'hidden')),
  -- door de admin gekozen citaat; null = text_positive
  quote text,
  tags text[] not null default '{}',
  source text not null default 'portal' check (source in ('portal', 'legacy', 'manual')),
  google_clicked_at timestamptz,
  tripadvisor_clicked_at timestamptz,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- publiceren kan alleen met toestemming (bestaande citaten uitgezonderd)
  constraint customer_reviews_publish_needs_consent
    check (status <> 'published' or consent_publish or source <> 'portal')
);

create unique index if not exists customer_reviews_request_id_key
  on public.customer_reviews (request_id) where request_id is not null;

create index if not exists customer_reviews_status_idx
  on public.customer_reviews (status, created_at desc);

grant select, insert, update, delete on public.customer_reviews to authenticated;
grant all on public.customer_reviews to service_role;

alter table public.customer_reviews enable row level security;

create policy "Admins beheren beoordelingen"
  on public.customer_reviews for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create trigger trg_customer_reviews_updated_at
  before update on public.customer_reviews
  for each row execute function public.update_updated_at_column();

-- 3. Nazorgmail: één knop naar de eigen pagina, Google als tweede regel.
update public.email_templates
   set description = 'Bedankt-mail naar de klant na afloop van het programma, met de knop naar de eigen beoordelingspagina en Google als tweede mogelijkheid.',
       body_html = $new$
<p>Beste {{customer_name}},</p>

<p>Hartelijk dank dat u met uw gezelschap voor Vlieland en voor Bureau Vlieland heeft gekozen. We hopen dat u heeft genoten van uw {{#if program_date_label}}{{program_date_label}}{{else}}bezoek{{/if}} en dat alles naar wens is verlopen.</p>

<p>Zou u ons willen helpen door uw ervaring kort te delen? Het kost twee minuten, helpt ons om onze service te blijven verbeteren en helpt andere gasten bij hun keuze.</p>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
  <tr>
    <td>
      <a href="{{own_review_url}}" style="display:inline-block; background:#E36414; color:#ffffff; text-decoration:none; padding:12px 22px; border-radius:6px; font-weight:600;">
        Deel uw ervaring
      </a>
    </td>
  </tr>
</table>

<p style="color:#475569; font-size:14px;">Deelt u uw ervaring liever meteen op Google? Dat kan via <a href="{{google_review_url}}" style="color:#0F4C5C;">deze link</a>.</p>

<p style="color:#475569; font-size:14px;">Liever rechtstreeks reageren of een tip met ons delen? U kunt deze mail gewoon beantwoorden — uw bericht komt direct bij ons binnen{{#if reference_number}} en wordt automatisch gekoppeld aan {{reference_number}}{{/if}}.</p>

<p>Nogmaals bedankt voor uw vertrouwen. Tot een volgende keer op Vlieland!</p>

<p>Met hartelijke groet,<br>Het team van Bureau Vlieland</p>
$new$,
       updated_at = now()
 where id = 'customer_aftersales_review';

-- Automatisch versturen, drie dagen na de laatste uitgevoerde activiteit.
update public.app_settings
   set value = 'true'::jsonb, updated_at = now()
 where id = 'customer_aftersales_auto_send';

-- De eigen link wordt nu per programma opgebouwd; de losse instelling vervalt.
delete from public.app_settings where id = 'customer_aftersales_review_url';

-- 4. Tripadvisor-link voor de bedankpagina (leeg = geen knop)
insert into public.app_settings (id, category, label, description, value_type, value)
values (
  'customer_review_tripadvisor_url',
  'system',
  'Tripadvisor-link voor beoordelingen',
  'Schrijflink van de Tripadvisor-vermelding van Bureau Vlieland. Leeg = geen Tripadvisor-knop op de bedankpagina na een beoordeling.',
  'text',
  '""'::jsonb
)
on conflict (id) do nothing;
