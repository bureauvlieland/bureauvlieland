# Eén akkoord in plaats van twee — én admin-labels die kloppen

## Wat de klant nu ervaart

De klant geeft op dit moment op meerdere momenten "akkoord":

1. **Voorstel-akkoord** (`ProgramIntroCard`) — "Ik ga akkoord met dit voorstel" → triggert beschikbaarheidscheck bij partners. Zet alleen `quote_status` op `akkoord_ontvangen` + logt het akkoord, maar **niet** `customer_approved_at` / `customer_accepted_at` op de losse items.
2. **Per-onderdeel akkoord** (`CustomerProgramItem`) — pas hier worden `customer_approved_at` én `customer_accepted_at` per item gezet.
3. **Voorwaarden-akkoord** (`AcceptTermsCard`) — definitieve juridische handtekening (`terms_accepted_at`). Blijft ongewijzigd.

## Wat admin nu ervaart (het tweede probleem in deze vraag)

Op `/admin` blijft de Status-kolom op elk item "Wacht op klant-akkoord" tonen, ook nadat de klant op het voorstel akkoord heeft gegeven en de partners al zijn aangeschreven. Reden: `deriveItemDisplayStatus` in `src/lib/itemStatus.ts` leunt op `customer_accepted_at` op item-niveau, en dat veld blijft leeg zolang de klant niet ook nog per kaartje op "Akkoord" klikt. Dit is exact de verwarring die in de screenshot zichtbaar is — en het is **niet** het voorwaarden-akkoord.

## Voorstel: voorstel-akkoord telt als akkoord op alle onderdelen

Het akkoord op het voorstel is meteen ook akkoord op alle dán bekende onderdelen. De klant hoeft per item alléén nog te bevestigen wanneer er ná dat moment iets **substantieels** verandert. Admin ziet dat consistent terug.

### Nieuw gedrag — klantportaal

- **Bij voorstel-akkoord** zetten we per item (behalve `cancelled` en `self_arranged`) zowel `customer_approved_at` als `customer_accepted_at` op `now()`. Conform de project-memory ("Both `customer_approved_at` & `customer_accepted_at` set together").
- **Per-item "Akkoord"-knop verdwijnt** zolang er niets substantieels verandert. Het kaartje toont rustig de partnerstatus + "Akkoord gegeven"-vinkje.
- **Per-item akkoord komt alléén terug bij een substantiële wijziging na het voorstel-akkoord:**
  - Partner stelt een **andere datum** of **tijdverschuiving > 30 minuten** voor.
  - Admin past de **prijs** aan (`priceChangeNeedsAttention`-logica blijft).
  - Admin voegt **een nieuw onderdeel** toe ná het voorstel-akkoord (heeft geen `customer_approved_at`).
  - Partner meldt **niet beschikbaar** zonder alternatief.
- **Kleine tijdverschuiving (≤ 30 min)** vraagt géén nieuw akkoord. We tonen wel een rustige notitie op het kaartje ("Tijd aangepast door aanbieder: 11:00 → 11:15") en updaten `customer_approved_at` automatisch zodat de nieuwe tijd als bevestigd geldt.
- **Voorwaarden-akkoord (stap 3) blijft ongewijzigd.**

### Nieuw gedrag — admin

- Zodra de klant het voorstel heeft geaccepteerd zijn alle item-rijen `customer_accepted_at != null` → de Status-kolom toont automatisch **"Klant akkoord"** in plaats van "Wacht op klant-akkoord". Geen aparte aanpassing nodig in `itemStatus.ts`; dat valt vanzelf goed door punt hierboven.
- De "Verstuurd"-chip onder de partnerstatus blijft staan (los van klant-as).
- De banner "Klant moet gegevens aanleveren" blijft van toepassing zolang `terms_accepted_at` of facturatiegegevens ontbreken — dat gaat over voorwaarden + facturatie, niet over programma-akkoord.

### Taal & visuele rust

- Voorstel-knop wordt: **"Akkoord op voorstel — start beschikbaarheidscheck"**. Onder de knop in kleine letters: *"Hiermee gaat u akkoord met de getoonde onderdelen en prijzen. Wijzigt er iets wezenlijks, dan vragen we opnieuw uw bevestiging. Definitieve boeking volgt bij ondertekening van de voorwaarden."*
- Items krijgen na voorstel-akkoord een groen vinkje + partnerstatus, geen actieknop.
- Sidebar "Status programma" toont "Uw akkoord: 4 van 4 geaccordeerd" direct na voorstel-akkoord, en telt "actie nodig" alleen voor items die écht een nieuwe bevestiging vragen.

## Technische uitvoering

```text
ProgramIntroCard "Akkoord op voorstel" klik:
  → bestaande beschikbaarheidsaanvraag-flow
  → + UPDATE program_request_items
      SET customer_approved_at = now(),
          customer_accepted_at = now()
      WHERE request_id = ?
        AND status != 'cancelled'
        AND block_type != 'self_arranged'
        AND customer_approved_at IS NULL

isQuoteItemAwaitingCustomerApproval (aangescherpt):
  return true alleen als:
    - customer_approved_at IS NULL  (nieuw / nog geen akkoord)
    - OF priceChangeNeedsAttention
    - OF status = 'unavailable'
    - OF (status in ('alternative','counter_proposed')
          EN (datum gewijzigd OF |proposed_time - oorspronkelijke tijd| > 30 min))

Kleine tijdverschuiving (≤ 30 min) door partner:
  - geen knop op kaartje
  - rustige melding "Tijd aangepast door aanbieder: 11:00 → 11:15"
  - customer_approved_at + customer_accepted_at worden opnieuw op now() gezet
    zodat confirmed_time = proposed_time

itemStatus.ts:
  - Geen wijziging nodig. Doordat customer_accepted_at nu bij voorstel-akkoord
    al gezet is, kantelt het admin-label automatisch naar "Klant akkoord".
```

## Bestanden die geraakt worden

- `src/components/customer-portal/ProgramIntroCard.tsx` — knoptekst + helper-tekst
- `src/pages/CustomerProgram.tsx` (en/of `useCustomerProgram` hook) — bulk-update bij voorstel-akkoord
- `src/lib/customerQuoteApproval.ts` — drempel-logica + kleine-tijdverschuiving-regel
- `src/components/customer-portal/CustomerProgramItem.tsx` — knop-conditie + "tijd aangepast"-melding
- `src/hooks/useProgramStatus.ts` + sidebar-telling — "actie nodig" herijken

Bij implementatie controleer ik in de admin-view dat het label voor het bestaande project van Manon van der Veen (BV-2604-0010) na deze fix terecht naar "Klant akkoord" springt — desgewenst migreer ik bestaande projecten waar `quote_status = 'akkoord_ontvangen'` maar items nog `customer_accepted_at IS NULL` hebben.
