

## Plan: Logiespartners opnieuw aanvragen en herinneren

### Wat er verandert

De huidige logica blokkeert alle partners die al een quote-record hebben. Dit wordt versoepeld zodat:

1. **Partners met status `pending` worden selecteerbaar** - voor het sturen van een herinnering
2. **Partners met status `declined`, `rejected`, `expired` worden selecteerbaar** - voor opnieuw aanvragen
3. **Alleen partners met status `submitted` of `selected` blijven geblokkeerd** - daar loopt al een actieve offerte

De badge per partner wordt dynamisch op basis van de bestaande quote-status:

| Quote status | Badge | Selecteerbaar? |
|---|---|---|
| `pending` | "Wacht op reactie" (geel) | Ja |
| `submitted` | "Offerte ontvangen" (groen) | Nee |
| `selected` | "Geselecteerd" (blauw) | Nee |
| `declined` | "Afgewezen" (rood) | Ja |
| `expired` | "Verlopen" (grijs) | Ja |
| `rejected` | "Afgewezen" (rood) | Ja |
| Geen quote | - | Ja |

### Technische wijzigingen

**1. Frontend: `src/pages/admin/AdminAccommodationDetail.tsx`**

- `requestedPartnerIds` wordt vervangen door een lookup-map die per partner de quote-status opslaat
- De `alreadyRequested` check wordt: alleen blokkeren als status `submitted` of `selected`
- Badge tekst wordt dynamisch op basis van quote-status
- Knoptekst wordt "Herinnering versturen" als er al pending partners geselecteerd zijn

**2. Edge Function: `supabase/functions/send-accommodation-quote-request/index.ts`**

- Voor elke partner: check of er al een `accommodation_quotes` record bestaat voor deze `request_id + partner_id`
- **Bestaande quote met status `pending`**: Geen nieuw record, alleen email versturen (herinnering)
- **Bestaande quote met status `declined`/`expired`/`rejected`**: UPDATE status terug naar `pending`, reset `submitted_at` etc., en verstuur email
- **Geen bestaande quote**: INSERT nieuw record (huidige gedrag)

Dit zorgt ervoor dat je zowel herinneringen kunt sturen als opnieuw kunt aanvragen, zonder dubbele records aan te maken.
