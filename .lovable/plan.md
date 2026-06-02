## Probleem (BV-2605-0001, Luxe Lunchbuffet)

- Partner heeft bevestigd: **€32 p.p. × 14 personen = €448 totaal** (`quoted_price=448`, `override_people=13` is al door admin meegeschoven, `admin_price_override=32`).
- Klant heeft het aantal verlaagd naar **13 personen**. Daardoor klopt `quoted_price` (totaal) niet meer met de afgesproken p.p.-prijs:
  - Systeem leest 448 als groepstotaal → toont €448 (≈ €34,46 p.p.).
  - Berekening admin × people = 32 × 13 = €416 → "Inconsistente prijs"-banner.
- Wat we eigenlijk willen: **p.p.-prijs is de afspraak** (€32). Bij headcount-wijziging hoort het totaal automatisch mee te bewegen en de partner een nette notificatie te krijgen.

## Oplossing in het kort

Voor items met `price_type ∈ {per_person, per_person_per_day}` waarvoor de partner al een prijs bevestigd heeft, wordt **de bevestigde p.p.-prijs** de bron van waarheid. Wijzigt het aantal personen (programma of override), dan:

1. Detecteert het systeem dat `quoted_price` niet meer overeenkomt met `p.p. × huidige aantal × dagen`.
2. Toont in admin (banner + popover) een actieknop: **"Behoud €32 p.p. en pas totaal aan naar €416 — informeer partner"**.
3. Bij klik: edge function herberekent `quoted_price`, logt timeline-event, en stuurt partner een vriendelijke e-mail.

Geen automatische stille mutatie — admin moet bevestigen, zodat er bewuste communicatie naar de partner gaat.

## Wijzigingen

### 1. Detectie-helper — `src/lib/portalPricing.ts`
Nieuwe helper `getHeadcountMismatch(item, programPeople, numberOfDays)`:
- Vereist `price_type` per persoon en bestaand `quoted_price`.
- Leidt p.p.-prijs af: voorkeur `admin_price_override`; anders `quoted_price / (override_people ?? eerdere people)`.
- Geeft terug `{ unitPrice, oldTotal, newTotal, peopleNow, peopleThen }` als verschil > €0,01, anders `null`.

### 2. Admin UI — `src/pages/admin/AdminRequestDetail.tsx` + `AdminPriceOverridePopover`
- In de inconsistentie-waarschuwing en in de prijs-popover: extra knop **"Pas totaal aan naar nieuwe aantal & informeer partner"** wanneer `getHeadcountMismatch` resultaat geeft.
- Knop opent een korte bevestigingsdialog met:
  - Samenvatting (oude p.p., nieuw aantal, nieuw totaal).
  - Optioneel toelichting-veld dat in de mail naar de partner komt.
- Klik → call edge function (zie 3), daarna refetch + toast.

### 3. Edge function — `supabase/functions/notify-partner-headcount-change/index.ts` (nieuw)
- Input: `item_id`, optioneel `note`, `origin`.
- Server-side opnieuw berekenen: `new_total = unit_pp × effective_people × days`.
- Update item:
  - `quoted_price = new_total`
  - `admin_price_override = unit_pp` (zodat banner sluit)
  - `admin_price_override_updated_at = now`
  - `partner_price_change_acknowledged_at = now` (wij erkennen het namens de afspraak; partner moet alleen ack van een nieuwe p.p.-prijs, niet van een aantal-wijziging).
- E-mail naar `provider_email`/partner contact_email, NL-formeel "je", met:
  - "Het aantal gasten voor *programma X op datum Y* is gewijzigd naar N. De afgesproken prijs van €32 p.p. blijft staan; het nieuwe totaal komt daarmee uit op €416."
  - Link naar partnerportaal.
- `logEmail` met `template_name='partner_headcount_change'`, `actor='admin → partner (aantalwijziging)'`.
- Skip bij `isBureauItem`.

### 4. Timeline-/communicatielog
Project-communications entry "Aantal personen aangepast — totaal partner aangepast naar €416 (€32 p.p.)".

### 5. Niet-doen (bewust)
- Geen automatische trigger bij iedere wijziging van `program_requests.number_of_people` (mailstorm-risico, admin moet aan zet zijn).
- Voor `price_type = total` geldt deze flow niet; daar blijft de huidige inconsistentie-banner staan (totaal is daar de afspraak, niet p.p.).
- Geen schema-migratie nodig — alle benodigde velden bestaan al.

## Verificatie
- Op item `2eba093b…` (Luxe Lunchbuffet, BV-2605-0001): knop verschijnt; na bevestiging is `quoted_price=416`, `admin_price_override=32`, banner weg, partner heeft mail.
- Bestaande tests in `src/lib/__tests__/portalPricing.consistency.test.ts` blijven groen; nieuwe testcase voor `getHeadcountMismatch` toegevoegd.