## Probleem

Zolang een project bij de klant op status "Offerte" staat, is het programma nog niet goedgekeurd. Pas ná klantgoedkeuring gaan onderdelen ter beoordeling naar partners. Op dit moment sturen we echter aantal-wijziging-mails naar partners ongeacht die status — zie Trattoria Oliva die een "Aantal gasten gewijzigd" mail kreeg voor BV-2606-0028, terwijl het item in hun portal nog op "Offerte" staat (`customer_approved_at` = null).

## Regel

Aantal-wijziging-mails (item + logies) alleen versturen voor onderdelen/quotes die al door de klant zijn goedgekeurd. Vóór klantgoedkeuring is er nog geen boeking en wordt een nieuwe headcount automatisch meegenomen zodra de klant alsnog akkoord geeft.

Concreet per record:

- **Programma-item**: `customer_approved_at IS NOT NULL` OF `customer_accepted_at IS NOT NULL`.
- **Logies-quote**: `status = 'selected'` (klant heeft partij gekozen). `submitted` / `forwarded` = nog geen keuze → geen mail.

## Wijzigingen

### 1. `supabase/functions/update-customer-program/index.ts` (auto-flow bij klantwijziging aantal)
Filter bij het ophalen van `partnerItems` uitbreiden met `customer_approved_at NOT NULL OR customer_accepted_at NOT NULL`. Voor logies: alleen quotes met `status='selected'` doorgeven aan de mail-flow. De interne reset van submitted quotes naar `pending` blijft ongewijzigd (workflow), alleen zonder partner-mail.

### 2. `supabase/functions/notify-headcount-change-bulk/index.ts` (server-side guard)
Bij het inladen van items ook `customer_approved_at, customer_accepted_at` selecteren en items zonder een van beide overslaan met reden `not_customer_approved`. Voor `accommodation_quote_ids`: alleen mailen als quote-status `selected` is. Zo blijft de regel gelden ook als ergens verouderde item-id's worden meegegeven.

### 3. `supabase/functions/notify-partner-headcount-change/index.ts` (single-item admin-actie)
Zelfde guard: item overslaan als beide velden `null`. Response: `{ success: true, new_total, email_skipped: "not_customer_approved" }` zodat de admin-UI geen fout toont; wél toast "geen mail nodig — nog niet goedgekeurd door klant".

### 4. `src/components/admin/NotifyHeadcountChangeDialog.tsx` (admin UI)
- Ook `customer_approved_at, customer_accepted_at` ophalen.
- Items zonder klant-akkoord filteren uit de lijst (met tekstuele hint boven de partner-sectie: "Alleen onderdelen die de klant al heeft goedgekeurd — offerte-items volgen automatisch bij goedkeuring.").
- Logies-quotes query beperken tot `status='selected'`.
- Default-selectie (alle overgebleven aan) blijft.

### 5. Tests
Kleine utility `shouldNotifyPartnerOfHeadcountChange(item)` in `src/lib/` toevoegen die de regel uitwoont, met unit-tests voor: not-approved → false, customer_approved_at gezet → true, customer_accepted_at gezet → true, cancelled item → false, bureau-item → false. Hergebruik dezelfde regel in de edge functions (dupliceren als plain check, want edge functions delen geen code met src/lib).

## Buiten scope

- Prijswijziging-mails en item-verwijdering-mails (aparte flows, niet aan de orde).
- Definitie van `customer_approved_at` / de "Offerte → Definitief" overgang.
- Partner-portaal copy of status-labels.
