-- Referentiepagina's (docs/plan-reviews-oogsten.md, fase 3).
--
-- 1. Tabel reference_cases: één referentiepagina per programma, met een
--    momentopname van het programma (dagen, onderdelen, foto's van de
--    bouwstenen), het citaat uit de beoordeling en de tekst die Erwin
--    redigeert. Statussen: concept → verstuurd (akkoord gevraagd) →
--    akkoord → gepubliceerd, of verborgen. Publiceren kan alleen na akkoord
--    van de klant (vastgelegd met tijdstip, naam en IP).
-- 2. View published_reference_cases: alleen gepubliceerde pagina's en alleen
--    de inhoud; het akkoordtoken en de terugkoppeling blijven binnen.
-- 3. E-mailtemplate reference_case_approval: de mail "Mag deze
--    referentiepagina online?" met de link naar de akkoordpagina.

create table if not exists public.reference_cases (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.program_requests(id) on delete set null,
  review_id uuid references public.customer_reviews(id) on delete set null,
  slug text not null unique,
  title text not null default '',
  intro text not null default '',
  -- alinea's, gescheiden door een lege regel
  body text not null default '',
  quote text not null default '',
  quote_author text not null default '',
  quote_role text not null default '',
  company text not null default '',
  group_size integer,
  -- eerste dag van het programma
  program_date date,
  days integer not null default 1,
  -- [{ label, value }]
  facts jsonb not null default '[]'::jsonb,
  -- [{ day_index, label, date, items: [{ time, name, category, block_id, image_url, provider }] }]
  program jsonb not null default '[]'::jsonb,
  -- [{ url, alt, block_id }]
  photos jsonb not null default '[]'::jsonb,
  block_ids text[] not null default '{}',
  landing_path text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'approved', 'published', 'hidden')),
  approval_token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  approval_sent_at timestamptz,
  approved_at timestamptz,
  approved_name text,
  approved_ip text,
  feedback text,
  feedback_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reference_cases_publish_needs_approval
    check (status <> 'published' or approved_at is not null)
);

create index if not exists reference_cases_status_idx
  on public.reference_cases (status, published_at desc);

grant select, insert, update, delete on public.reference_cases to authenticated;
grant all on public.reference_cases to service_role;

alter table public.reference_cases enable row level security;

create policy "Admins beheren referentiepagina's"
  on public.reference_cases for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create trigger trg_reference_cases_updated_at
  before update on public.reference_cases
  for each row execute function public.update_updated_at_column();

-- 2. Publieke view (alleen inhoud, alleen gepubliceerd)
create or replace view public.published_reference_cases as
select
  id, slug, title, intro, body, quote, quote_author, quote_role, company,
  group_size, program_date, days, facts, program, photos, block_ids,
  landing_path, published_at, updated_at
from public.reference_cases
where status = 'published';

grant select on public.published_reference_cases to anon, authenticated, service_role;

-- 3. Akkoordmail
insert into public.email_templates (id, name, description, subject, body_html, variables, is_active)
values (
  'reference_case_approval',
  'Referentiepagina — akkoord vragen',
  'Vraagt de klant om akkoord op de concept-referentiepagina over zijn programma; de pagina komt pas online na dat akkoord.',
  'Mag deze referentiepagina over uw programma online?{{#if reference_number}} ({{reference_number}}){{/if}}',
  $body$
<p>Beste {{customer_name}},</p>

<p>Bij uw beoordeling gaf u aan dat wij een referentiepagina over uw programma op Vlieland mogen maken. Die staat nu klaar als concept: <strong>{{title}}</strong>.</p>

<p>Bekijkt u de pagina even? Op dezelfde pagina kunt u met één klik akkoord geven, of ons laten weten wat u anders wilt.</p>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
  <tr>
    <td>
      <a href="{{approval_url}}" style="display:inline-block; background:#E36414; color:#ffffff; text-decoration:none; padding:12px 22px; border-radius:6px; font-weight:600;">
        Bekijk de pagina en geef akkoord
      </a>
    </td>
  </tr>
</table>

<p style="color:#475569; font-size:14px;">De pagina komt pas online na uw akkoord. Later weghalen kan altijd; één mail aan ons is genoeg. Deze link is persoonlijk; deel hem niet met anderen.</p>

<p>Met hartelijke groet,<br>Het team van Bureau Vlieland</p>
$body$,
  '["customer_name","reference_number","title","approval_url"]'::jsonb,
  true
)
on conflict (id) do nothing;
