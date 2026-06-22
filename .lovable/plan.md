## Vastgestelde workflow

```text
1. Aanvraag binnen
2. Bureau Vlieland bouwt programma + zet prijzen/tijden
3. Bureau publiceert offerte → klant
4. Klant geeft akkoord
5. Partners ontvangen hun onderdelen ter beoordeling (status = pending)
6. Partner bevestigt of stelt alternatief voor
7. Bureau/klant accordeert eventuele aanpassingen + voorwaarden
8. Status = confirmed → uitvoeren → factureren
```

Stap 5 mag **nooit** worden overgeslagen. Op dit moment gebeurt dat wél: items waar Bureau de prijs invult komen direct op `status=confirmed` / `item_quote_status=bevestigd`, zonder dat de partner ze ooit gezien heeft. Voorbeeld: BV-2606-0011 "Koffie & Gebak aan boord" (Rederij Doeksen) — admin-prijs €7,75 p.p., klantakkoord op 12 juni, partner heeft nooit ingelogd, item staat tóch als "Klant akkoord" in zijn portal en verschijnt nergens in zijn werkbank.

## Wat ik ga aanpassen

### A. Status-transities afdwingen (database)

Bestaande trigger `guard_item_status_consistency` blokkeert alleen het scenario *skip_partner_notification = true*. Uitbreiden zodat een niet-bureau-item (`block_type <> 'bureau'`, `provider_id <> 'bureau'`) **nooit** naar `confirmed` / `bevestigd` mag zonder partner-handeling:

```text
ALLOW confirmed/bevestigd ONLY IF
   block_type = 'bureau'                              -- bureau-interne kost
OR provider_id = 'bureau'                             -- ferries/bikes managed
OR quoted_at IS NOT NULL                              -- partner heeft geofferd
OR partner_price_change_acknowledged_at IS NOT NULL   -- partner heeft prijs gezien
```

Anders → `RAISE EXCEPTION` met hint "Item moet eerst door de partner worden bevestigd."

Dit voorkomt dat het patroon zich herhaalt, ongeacht via welke admin-flow het item wordt opgeslagen.

### B. Publish-flow: items echt naar partner sturen

Bij `program_published_at` / wanneer de klant akkoord geeft (`customer_approved_at` wordt gezet), moet voor elk niet-bureau-item dat nog `quoted_at IS NULL` heeft:

- `status` blijven op `pending` (niet upgraden naar `confirmed`)
- `item_quote_status` op `'in_afstemming'` (niet `'bevestigd'`)
- partner-notificatie via bestaande edge function `notify-partner-new-item` (of equivalent) versturen aan `partners.contact_email`, tenzij `skip_partner_notification = true`

Aanpassen op één van deze plekken (uitzoeken in build): de publish/akkoord-flow in `supabase/functions/publish-program/*` of `update-partner-item-status`/`customer-approve-quote`. Geen wijziging aan de UI-knoppen die admin gebruikt — alleen aan de waarden die worden weggeschreven.

### C. Bestaande "vastgelopen" items terugzetten

Eenmalige opschoning voor reeds gepubliceerde, klant-akkoorde items waar partner nooit naar gekeken heeft:

```text
UPDATE program_request_items SET
  status = 'pending',
  item_quote_status = 'in_afstemming',
  status_updated_at = now()
WHERE quoted_at IS NULL
  AND partner_price_change_acknowledged_at IS NULL
  AND status IN ('confirmed','accepted')
  AND item_quote_status = 'bevestigd'
  AND block_type <> 'bureau'
  AND provider_id <> 'bureau'
  AND skip_partner_notification = false
  AND EXISTS ( customer_approved_at IS NOT NULL voor de request )
```

Plus voor elk geraakt project één partner-notificatie sturen ("Bureau Vlieland heeft een onderdeel naar u doorgezet, gelieve te bevestigen.") — via dezelfde edge function als bij B, met dedupe op `email_log.metadata.item_id` zodat partners niet meerdere keren een mail krijgen.

### D. Partnerportal-UI: zichtbaarheid

Met A+B is `status='pending'` voldoende: het item valt automatisch onder de bestaande **"Beoordeel deze aanvraag"** bucket in `PartnerWerkbankList.tsx` (regel 90) en in het projectdetail toont `PartnerProjectItemRow` de bestaande "Te beoordelen"-status met de bestaande **Bevestigen** / **Niet beschikbaar** / **Tegenvoorstel** knoppen. Geen nieuwe componenten nodig — bestaande logica werkt zodra de data klopt.

Eén kleine UI-aanpassing: als `admin_price_override IS NOT NULL` op een pending item, banner tonen *"Bureau Vlieland stelt voor: €X,XX p.p. — Bevestig of stel een tegenvoorstel"*. Hergebruikt bestaande price-change banner-logic in `PartnerProjectItemRow.tsx` (regels 79–212 hebben al `openPriceChange` + `submitAcceptPriceChange/submitCounterPrice`).

### Bestanden die geraakt worden

- Migration: trigger `guard_item_status_consistency` uitbreiden + eenmalige UPDATE-statement
- `supabase/functions/publish-program/index.ts` (of equivalent — uitzoeken bij build) — geen confirmed/bevestigd meer op non-bureau-items
- `supabase/functions/customer-approve-quote/index.ts` (of equivalent) — idem
- `src/components/partner-portal/PartnerProjectItemRow.tsx` — kleine banner-tekst-aanpassing voor admin_price_override op pending items
- Geen wijziging aan `PartnerWerkbankList.tsx` (bestaande pending-bucket vangt deze items vanzelf op)

### Buiten scope

- Admin-zijde UI (de admin mag prijzen blijven invullen; alleen het automatisch op `bevestigd` zetten verdwijnt)
- Wijziging van bureau-managed items (ferries/bikes, block_type=bureau, provider_id=bureau) — blijven direct confirmed
- Wijziging van logies-flow (accommodation_quotes) — die volgt al de partner-akkoord-stap

### Vragen voordat ik bouw

1. **Notificatiemail bij opschoning (C)**: één bulk-mail per partner met alle items, of één mail per item? Voorkeur: één per partner per project, omdat het hier maar om een handvol gevallen gaat.
2. **Counter-proposal op prijs**: mag een partner een tegenvoorstel op de admin-prijs doen (knop bestaat al), of wil je dat alle prijswijzigingen vanaf nu een tegenvoorstel-flow naar Bureau triggeren in plaats van directe acceptatie? Voorkeur: bestaande gedrag behouden — partner accepteert of doet tegenvoorstel.
