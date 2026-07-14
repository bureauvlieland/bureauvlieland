# Maatwerk-offerteaanvraag via portal

## Uitgangspunt

Op basis van je feedback: geen losse entiteit, maar een **ad-hoc `program_request_item`** dat via de bestaande partner-flow loopt. Nieuw is dat de partner **regel voor regel** een gespecificeerde offerte indient (net als een echte offerte-PDF), met **eigen BTW per regel**. Bureau Vlieland houdt de commissie (10% over ex-BTW totaal), centrale facturatie blijft ongewijzigd.

## Flow (end-to-end)

```text
BV admin                  Partner (portal)              Klant
--------                  ----------------              -----
1. "+ Maatwerk-item"  ->  2. Ziet aanvraag met
   in projectdetail          vrije-tekst briefing
   - titel, dag,          -> 3. Voegt N regels toe:
   - vrije briefing,         omschrijving, aantal,
   - partner, dag,           eenheidsprijs, BTW%
   - deadline             -> 4. Dient in            ->  5. Ziet één regel in
                                                          programma met totaal
                             partner ziet later          + uitklapbare specificatie
                             admin-akkoord           ->  6. Accepteert / vraagt
                                                          aanpassing
```

## Datamodel (minimaal)

Nieuwe tabel `program_request_item_quote_lines`:
- `program_request_item_id` (fk)
- `sort_order`, `description`, `quantity`, `unit`, `unit_price_incl_vat`, `vat_rate`
- `created_by_partner_id`, timestamps

Uitbreiding `program_request_items`:
- `is_custom_quote boolean default false` — markeert maatwerk-item
- `custom_briefing text` — vrije tekst van BV richting partner
- bestaande `quoted_price` = som van regels incl. BTW (auto-berekend via trigger of app-code, in lijn met huidige pricing rules)

Geen nieuwe workflow-status: hergebruikt bestaande `pending` → `quoted` → `accepted` op het item.

## UI-wijzigingen

**Admin projectdetail** — nieuwe knop "Maatwerk-item toevoegen":
- Sheet met: titel, dag, partner-select, briefing (rich text), deadline
- Bij opslaan: `program_request_item` (is_custom_quote=true) + bestaande partner-notify edge function (hergebruik `notify-partner-quote-request` template met briefing-veld)

**Partner portal** — bestaande "openstaande offerte-aanvraag" krijgt bij `is_custom_quote=true`:
- Briefing bovenaan (readonly)
- Regel-editor: tabel met rijen (+ knop, verwijder-knop) — omschrijving, aantal, eenheidsprijs incl. BTW, BTW% dropdown (0/9/21)
- Live totaal ex/incl BTW onderaan
- "Offerte indienen" knop — schrijft regels + zet `quoted_price` + `partner_status='quoted'`
- Stupid-simple: één scherm, geen tabs, mobile-first, autosave-draft

**Admin akkoord** — in bestaande partner-quote-review UI: toon regeltabel, akkoord-knop hergebruikt

**Klantportaal (`CustomerProgramItem`)** — bij accepted maatwerk-item:
- Toon één regel met titel + totaal
- Uitklap "Specificatie" met de regels (zonder BTW-uitsplitsing — consistent met huidige formal weergave; BTW-breakdown alleen op factuur-PDF)

## Facturatie & commissie

- Commissie 10% over som van (regel.excl_btw): geen wijziging in `program_item_billing_lines` logica, alleen inputbron
- Purchase-invoice matching en bureau-facturatie ongewijzigd — item gedraagt zich als elk ander partner-item

## Edge functions

- Hergebruik `notify-partner-quote-request` (uitbreiden met `custom_briefing` in template)
- Hergebruik `notify-admin-quote-received` bij indienen
- Geen nieuwe function

## Tests

Unit tests:
- `customQuoteLines.test.ts` — totaal ex/incl BTW berekening, gemengde BTW-tarieven, negatieve/lege input-guards
- `customQuoteCommission.test.ts` — 10% commissie over ex-BTW som
- Uitbreiding `customerPortalPendingChanges.test.ts` — accept/reject van maatwerk-item

Manual QA (via preview):
1. Admin maakt maatwerk-item in BV-2606-0004 voor Zuiver Traiteur
2. Partner logt in, ziet briefing, voegt 3 regels toe (0%, 9%, 21%), dient in
3. Admin ziet regels, accordeert
4. Klant ziet item + specificatie, accepteert
5. Facturatie-preview toont juiste bureau-factuur incl. commissie

## Buiten scope (bewust)

- Publiceren van maatwerk-item als herbruikbare `building_block` — kan later manueel via bestaande "concept-blok" flow
- Bijlagen bij offerteregels (kan v2)
- Onderhandelings-tegenvoorstel op regelniveau (klant kan wel hele item afwijzen met opmerking, bestaande flow)

## Bestanden (indicatief)

- migration: nieuwe tabel + 2 kolommen op `program_request_items` + GRANTs + RLS (partner ziet alleen eigen regels via item)
- `src/components/admin/AdminAddCustomItemSheet.tsx` (nieuw)
- `src/components/partner-portal/PartnerCustomQuoteEditor.tsx` (nieuw)
- `src/components/partner-portal/PartnerBlockSheet.tsx` (branch voor custom)
- `src/components/customer-portal/CustomerProgramItem.tsx` (specificatie-uitklap)
- `src/pages/admin/AdminRequestDetail.tsx` (knop + regeltabel bij review)
- edge function `notify-partner-quote-request` (template uitbreiden)
- tests zoals hierboven
