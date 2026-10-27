# Meting: doet het Berichtencentrum zijn werk?

Het Berichtencentrum (`docs/plan-berichtencentrum.md`) moet één getal omlaag
brengen: hoe lang een klant of partner wacht op antwoord. Dit document is de
nulmeting van 27 oktober 2026 en de twee queries om over een maand hetzelfde
te meten. Ze draaien in de SQL-editor van Supabase (project
`utshmnyrjzwtrpttxdlw`) en gebruiken alleen `answered_at` op
`project_communications`, de enige bron voor "beantwoord" sinds fase 1.

## 1. Reactietijd per maand

```sql
select
  to_char(date_trunc('month', communication_date), 'YYYY-MM') as maand,
  count(*) as inkomend,
  count(*) filter (where answered_at is not null) as beantwoord,
  round((percentile_cont(0.5) within group
    (order by extract(epoch from (answered_at - communication_date)) / 3600)
    filter (where answered_at is not null))::numeric, 1) as mediaan_uren,
  round((percentile_cont(0.9) within group
    (order by extract(epoch from (answered_at - communication_date)) / 3600)
    filter (where answered_at is not null))::numeric, 1) as p90_uren,
  count(*) filter (where answered_at is not null
    and answered_at - communication_date <= interval '24 hours') as binnen_24u
from project_communications
where direction = 'inbound'
  and communication_type in ('email', 'email_in', 'email_out')
  and communication_date >= now() - interval '12 months'
group by 1
order by 1;
```

Nulmeting (27 oktober 2026):

| Maand | Inkomend | Beantwoord | Mediaan (uur) | P90 (uur) | Binnen 24 uur |
|---|---|---|---|---|---|
| 2026-05 | 7 | 7 | 877 | 917 | 0 |
| 2026-06 | 27 | 27 | 31 | 171 | 11 |
| 2026-07 | 13 | 7 | 94 | 248 | 2 |
| 2026-08 | 14 | 14 | 81 | 486 | 4 |
| 2026-09 | 8 | 7 | 100 | 267 | 0 |
| 2026-10 | 4 | 2 | 10 | 18 | 2 |

Kanttekening: `answered_at` is tot fase 0 met de hand gezet (knop of
sneltoets `m`), soms dagen na het echte antwoord. De cijfers tot oktober
zijn daardoor eerder te hoog dan te laag. Sinds fase 0 zet een verstuurd
antwoord `answered_at` zelf, dus vanaf november meet dit de echte reactietijd.

Doel: mediaan onder de 24 uur en P90 onder de 72 uur, in een maand met
minstens tien inkomende mails.

## 2. Wat er nu open staat

```sql
select
  count(*) as gesprekken_open,
  count(*) filter (where now() - oudste > interval '3 days') as langer_dan_3_dagen,
  round((extract(epoch from max(now() - oudste)) / 3600)::numeric, 1) as langst_wachtend_uren
from (
  select
    coalesce(request_id::text, accommodation_id::text, lower(contact_email)) as gesprek,
    min(communication_date) as oudste
  from project_communications c
  where direction = 'inbound'
    and communication_type in ('email', 'email_in', 'email_out')
    and answered_at is null
    and archived_at is null
    and communication_date >= now() - interval '90 days'
    and not exists (select 1 from program_requests p
                    where p.id = c.request_id and p.archived_at is not null)
    and not exists (select 1 from accommodation_requests a
                    where a.id = c.accommodation_id and a.archived_at is not null)
  group by 1
) s;
```

Dit is dezelfde definitie als de teller "Te beantwoorden" in de interface
(`src/lib/openConversations.ts`), per gesprek geteld. Nulmeting: 1 gesprek
open, 0 langer dan 3 dagen, langst wachtend 56 uur.

Doel: op een willekeurig moment nul gesprekken langer dan 3 dagen open.

## Wanneer kijken

Eind november 2026, en daarna elke maand bij de roadmap. Zet de uitkomst
onder de nulmeting in dit document, met de datum.
