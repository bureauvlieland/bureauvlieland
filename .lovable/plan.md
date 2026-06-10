
# Logies-inkoopfacturen 1-op-1 doorzetten + commissie per soort regel + AI-classificatie

## Wat verandert

1. **Derde commissiepercentage per partner: "extras"** (F&B, faciliteiten, transport, overig).
   - Nieuw veld `partners.extras_commission_percentage` (NULL = valt terug op `accommodation_commission_percentage`, anders op 10%).
   - Zeezicht: 10% / 10% / **10%**. Badhotel Bruin: 10% / 10% / **0%**.
   - Tonen in `AdminPartners` als "10% / 10% / 0%" met labels act. / logies / extras.

2. **Inkoopfactuur-allocatie naar logies** in `AddPurchaseInvoiceDialog`.
   - Per factuurregel een doel-keuze: **program-onderdeel | logies-kamer | logies-extra | toeristenbelasting (uitsluiten) | niet doorberekenen**.
   - Bedragen 1-op-1 overgenomen (geen opslag). Commissie wordt achteraf via aparte commissiefactuur naar hotel verstuurd op basis van het juiste percentage per regel.

3. **AI-classificatie van factuurregels** — nieuw.
   - Bij het openen van de dialog (zodra een scan beschikbaar is en partner = logies-partner) roepen we een nieuwe edge function `classify-lodging-invoice-lines` aan via Lovable AI (`google/gemini-3-flash-preview`).
   - Input: factuurregels (description, qty, unit_price, vat_rate), partnernaam, en de geselecteerde quote (kamers, datums, aantal personen).
   - Output per regel: `suggested_target` ∈ `room | extra | tourist_tax | exclude`, `extra_category` ∈ `fb | facilities | transport | other` (alleen als target=extra), en `confidence` 0-1 + korte `reason`.
   - **Toeristenbelasting** wordt expliciet herkend ("toeristenbelasting", "tourist tax", "verblijfsbelasting", "city tax") en standaard op `exclude` gezet — die zit al in onze verkoopfactuur (`touristTax` in `adminInvoicingTotals.ts`) en mag dus nooit dubbel mee.
   - Heuristieken die in de prompt meegaan:
     - Overnachting / kamer / arrangement / "logies" / room rate → `room`
     - Ontbijt, lunch, diner, drank, koffie, borrel, F&B → `extra` / `fb`
     - Parkeren, sauna, wasruimte, conferentiezaal → `extra` / `facilities`
     - Shuttle, taxi, bagagevervoer → `extra` / `transport`
     - Toeristenbelasting / verblijfsbelasting / city tax → `exclude` (target=tourist_tax voor labeling)
     - Onbekend → suggest `extra` / `other` met lage confidence.
   - UI: per regel toont de suggestie als pre-selectie + badge "AI-suggestie (85%)". Admin kan altijd overrulen. Een "Pas alle AI-suggesties toe"-knop bovenaan; geweigerde suggesties blijven gewoon handmatig instelbaar.

4. **Live commissie-preview** onderin het allocatie-blok:
   `Kamer €X (10%) + F&B €Y (10%) + Facilities €Z (0%) = commissie €N` zodat de admin direct ziet wat de hotel-commissiefactuur straks wordt.

## Datamodel

```
partners.extras_commission_percentage           numeric NULL

accommodation_quotes.purchase_room_cost_incl_vat numeric NULL
accommodation_quotes.purchase_invoice_id         uuid NULL

accommodation_quote_extras.source                text NULL   -- 'partner_quote' | 'purchase_invoice'
accommodation_quote_extras.source_invoice_id     uuid NULL
```

Snapshot van de oorspronkelijke offerte `price_total` gaat naar `accommodation_quote_history` voor audit.

## Commissielogica (1 helper)

`src/lib/commissionRates.ts`
```
rateFor(partner, kind):
  activity  → partner.commission_percentage          ?? 10
  lodging   → partner.accommodation_commission_percentage ?? 10
  extras    → partner.extras_commission_percentage
            ?? partner.accommodation_commission_percentage
            ?? 10
```

- Kamer-regels → som overschrijft `accommodation_quotes.price_total`, commissie wordt op de quote zelf bewaard met `lodging`-percentage.
- Extra-regels → één `accommodation_quote_extras`-rij per inkoopregel, `commission_percentage = rateFor(partner, 'extras')` (snapshot), `pricing_type='fixed'`, `quantity=1`, `price_includes_vat=true`.
- Toeristenbelasting-regels → niets doen (alleen loggen in `project_communications` zodat de admin weet dat ze zijn herkend en weggelaten).

## Te raken bestanden

- **Migratie**: 5 nieuwe kolommen hierboven.
- `src/types/partner.ts` — `extras_commission_percentage` toevoegen.
- `src/pages/admin/AdminPartners.tsx` + partner-edit-form — derde commissieveld + kolomweergave 10% / 10% / 0%.
- `src/lib/commissionRates.ts` — nieuwe helper.
- **Nieuwe edge function** `supabase/functions/classify-lodging-invoice-lines/index.ts` — Lovable AI Gateway, tool-calling met JSON-schema (zoals scan-purchase-invoice-internal), admin-auth via JWT.
- `src/components/admin/AddPurchaseInvoiceDialog.tsx` — nieuwe "Doel"-kolom per regel, AI-suggesties laden, "Pas AI-suggesties toe"-knop.
- Nieuw: `src/components/admin/purchase-invoices/AccommodationAllocationBlock.tsx` — UI-blok per quote met kamer-totaal, extras-lijst (met categorie/VAT-dropdown per regel) en live commissie-preview.
- `src/hooks/usePurchaseInvoices.ts` — payload uitbreiden met `accommodation_allocations[]` (room rules + extra rules).
- **Nieuwe edge function** `apply-purchase-invoice-to-lodging` (service role) — snapshot in `accommodation_quote_history`, overschrijf `price_total`, vul `purchase_room_cost_incl_vat` + `purchase_invoice_id`, insert extras met juist `commission_percentage`, log naar `project_communications`.
- Commissiefactuur-flow (`AdminCommissionInvoices`, `PendingCommissionsCard`): som extras-commissies per quote optellen bij hotel-commissie (kleine query-aanpassing — leest nu alleen commissie op de quote, moet ook quote-extras meenemen waar `source='purchase_invoice'`).

## Out of scope

- Per-extra commissie overschrijven via UI (admin kan al direct in de quote-extras-rij wijzigen).
- BTW-herberekening (vorige fix blijft leidend: bedragen 1-op-1 uit PDF).
- AI-classificatie voor niet-logies-partners (alleen actief als `partner.partner_type='logies'`).
- Automatisch versturen van commissiefactuur — blijft handmatig in bestaande flow.
