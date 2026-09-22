-- Opvolging van beoordelingen (docs/plan-reviews-oogsten.md, fase 4).
--
-- 1. Eén herinnering voor Google, zeven dagen na een beoordeling zonder klik
--    op de Google-knop: instelling (uitzetbaar), aantal dagen, mailtemplate
--    en een kolom om de herinnering per beoordeling over te slaan.
-- 2. Deelnemers om een Google-review vragen: een instelling (standaard uit,
--    besluit Erwin: eerst alleen de opdrachtgever) die op de
--    deelnemerspagina na afloop een knop naar Google toont.

alter table public.customer_reviews
  add column if not exists reminder_skipped_at timestamptz;

comment on column public.customer_reviews.reminder_skipped_at is
  'Gezet door admin: geen Google-herinnering sturen voor deze beoordeling.';

-- 1. Instellingen
insert into public.app_settings (id, category, label, description, value_type, value)
values
  (
    'customer_review_reminder_enabled',
    'reminders',
    'Google-herinnering na een beoordeling',
    'Eén herinnering aan klanten die hun beoordeling invulden maar niet op de Google-knop klikten, met hun eigen tekst erbij. Uit = geen herinnering; per beoordeling overslaan kan bij Content → Beoordelingen.',
    'boolean',
    'true'::jsonb
  ),
  (
    'customer_review_reminder_days',
    'reminders',
    'Dagen tot de Google-herinnering',
    'Aantal dagen na de beoordeling waarna de herinnering gaat. Standaard 7.',
    'number',
    '7'::jsonb
  ),
  (
    'participant_google_review_enabled',
    'features',
    'Deelnemers om een Google-review vragen',
    'Toont op de deelnemerspagina na afloop van het programma een knop naar Google. Standaard uit: eerst alleen de opdrachtgever (besluit 22 september 2026).',
    'boolean',
    'false'::jsonb
  )
on conflict (id) do nothing;

-- 2. Mailtemplate van de herinnering
insert into public.email_templates (id, name, description, subject, body_html, variables, is_active)
values (
  'customer_review_google_reminder',
  'Beoordeling — herinnering voor Google',
  'Eén herinnering, zeven dagen na een ingevulde beoordeling zonder klik op de Google-knop, met de eigen tekst van de klant om over te nemen.',
  'Deelt u uw ervaring ook op Google?{{#if reference_number}} ({{reference_number}}){{/if}}',
  $body$
<p>Beste {{customer_name}},</p>

<p>Een week geleden vulde u onze beoordeling in over uw programma op Vlieland. Dank daarvoor; wij lezen elke beoordeling.</p>

<p>Wilt u uw ervaring ook op Google delen? Andere groepen kiezen daar vaak op, en het kost u een minuut.{{#if review_text}} Uw eigen tekst kunt u zo overnemen:{{/if}}</p>

{{#if review_text}}
<blockquote style="margin:16px 0; padding:12px 16px; border-left:3px solid #E36414; background:#F8FAFC; color:#0F172A;">{{review_text}}</blockquote>
{{/if}}

<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
  <tr>
    <td>
      <a href="{{google_review_url}}" style="display:inline-block; background:#E36414; color:#ffffff; text-decoration:none; padding:12px 22px; border-radius:6px; font-weight:600;">
        Plaats uw review op Google
      </a>
    </td>
  </tr>
</table>

<p style="color:#475569; font-size:14px;">Uw tekst staat ook op <a href="{{own_review_url}}" style="color:#0F4C5C;">uw beoordelingspagina</a>, met een kopieerknop. Dit is de enige herinnering die u van ons krijgt; een review plaatsen is geheel vrijblijvend.</p>

<p>Met hartelijke groet,<br>Het team van Bureau Vlieland</p>
$body$,
  '["customer_name","reference_number","review_text","google_review_url","own_review_url"]'::jsonb,
  true
)
on conflict (id) do nothing;
