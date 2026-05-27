## Wat ik aantref

### 1. Bestaande partnerfacturen Vlieland Outdoor Center

Er staan 6 rijen in `partner_purchase_invoices` voor `vlieland-outdoor-center`, allemaal status `pending` en zonder PDF (`file_path = NULL`) — registratie was per-item gebeurd vóór de verzamelfactuur-flow. Bijbehorende `partner_purchase_invoice_allocations`: **0 rijen** (alle koppeling loopt nu nog via denormalized velden op `program_request_items`).


| Factuurnr | Project                       | Bedrag incl | Item                   |
| --------- | ----------------------------- | ----------- | ---------------------- |
| Arcadia   | BV-2602-0002 Artcadia/Katalys | €363,00     | Locatiehuur Strandtent |
| Arcadia   | BV-2602-0002 Artcadia/Katalys | €338,80     | Lasergamen             |
| 2026-0004 | BV-… Salure B.V.              | €1.297,73   | Strandspektakel        |
| 2026-0003 | BV-… Salure B.V.              | €363,00     | Locatiehuur Strandtent |
| 2026-0002 | BV-… RMD Trainingen           | €163,35     | Beach Golf             |
| 2026-0001 | BV-… RMD Trainingen           | €217,80     | Powerkiten / Vliegeren |


Op de 6 corresponderende `program_request_items` staan `invoiced_number / invoiced_date / invoiced_amount` en `commission_status = 'pending'`.

### 2. Audit "Te factureren"-bedragen

`PartnerFinance.tsx` (regels 312-333) berekent het te-factureren-totaal puur op basis van `quoted_price`. De UI-change van vorige iteratie heeft alleen het **label** ("Akkoord partner" i.p.v. "(schatting)") aangepast in `AdminQuotePriceEditor`, maar **niet** het databron-veld. Gevolg: zodra een item `confirmed` is zonder dat de partner een prijs heeft ingetypt, valt het bedrag in het partnerportaal weg (€0) — terwijl admin én klant het wél verwacht op basis van `admin_price_override × pers × dagen`.

Concreet voor Vlieland Outdoor Center, items met `status='confirmed'` zonder `quoted_price`:


| Project                       | Item            | Bedrag-bron                       | Verwacht    |
| ----------------------------- | --------------- | --------------------------------- | ----------- |
| BV-2602-0002 Artcadia/Katalys | Strandspektakel | admin_price_override €32,50 × 14p | **€455,00** |


En in pipeline (`status='pending'`, dus nog niet meegerekend — wel relevant zodra partner bevestigt):


| Project                               | Item                          | Verwacht                          |
| ------------------------------------- | ----------------------------- | --------------------------------- |
| BV-2602-0005 Bouwbedrijf Kreeft       | Strandspektakel (×2)          | €30 × 64p, €30 × 20p              |
| BV-2603-0016 Gemeente                 | Branding Raften               | €25 × 6p                          |
| BV-2604-0003 Kuiper Bouw              | Strandspektakel               | €30 × 52p                         |
| BV-2604-0003 Kuiper Bouw              | Powerkiten/Vliegeren (×2)     | €35 × 22p, €35 × 30p              |
| BV-2605-0002 Dap NWF                  | Strandspektakel + Beach Golf  | €32,50 × 17p / €20 × 17p          |
| BV-2605-0003                          | Strandspektakel + Locatiehuur | €30 × 16p / €150 totaal           |
| BV-2605-0008 vd Velden                | Strandspektakel               | €32,50 × 10p                      |
| BV-2604-0007 / BV-2605-0005 Blokarten | `on_request`, geen override   | **op aanvraag — blijft leeg, OK** |


## Plan

### Stap A — Reset 6 VOC-facturen (data-fix)

Via `insert`-tool één migratie:

1. `DELETE FROM partner_purchase_invoices WHERE id IN (<6 ids>)` (geen allocations om eerst op te ruimen).
2. `UPDATE program_request_items SET invoiced_number=NULL, invoiced_date=NULL, invoiced_amount=NULL, invoiced_file_path=NULL, commission_status='not_applicable', commission_amount=NULL, commission_percentage=NULL WHERE id IN (<6 item-ids>)`.

Resultaat: deze items komen weer in "Nog te factureren" terecht en kunnen via de nieuwe verzamelfactuur-flow worden ingediend.

### Stap B — "Te factureren"-bedrag berekenen met fallback

Probleem: `toBeInvoicedItems.reduce(... i.quoted_price ...)` mist confirmed items zonder partnerprijs. Oplossing: gebruik de bestaande centrale helper `getItemLineTotal()` uit `src/lib/portalPricing.ts` (die al fallback `admin_price_override × persons × days` bevat) als bron voor zowel de tegel-som als de regel-per-regel weergave.

Wijzigingen in `src/pages/PartnerFinance.tsx`:

- Importeer `getItemLineTotal` en helper voor effective people/days.
- Bouw helper `getEffectiveBillableAmount(item) = item.quoted_price ?? getItemLineTotal(item, people, days)`.
- Vervang `i.quoted_price || 0` in regels 332, 349-350, 497, 535, 680, 724 door deze helper.
- Label-hint per regel: bij fallback toon klein "ca. (admin-inschatting)"-pillje zodat partner ziet waar het bedrag vandaan komt, en kan kiezen tussen "Verzamelfactuur registreren" met aanpasbaar bedrag of "Gefactureerd via e-mail".

Wijziging in `RegisterCollectivePartnerInvoiceDialog.tsx`:

- Default-amount per regel komt nu uit dezelfde helper i.p.v. uitsluitend `quoted_price`. Partner kan bedrag altijd nog aanpassen (al ondersteund).

Items van het type `on_request` zónder override (Blokarten) blijven bewust leeg — geen schatting beschikbaar.

### Stap C — Verifiëren

- Na migratie: VOC ziet 6 oude facturen weg én Strandspektakel BV-2602-0002 staat onder "Nog te factureren" met €455,00.
- Admin `/admin/facturatie` toont geen openstaande inkoopfacturen meer voor deze 6 lijnen.
- `useInvoicingReadyCount`-badge blijft kloppen (gebaseerd op `program_requests.completion_status`, niet beïnvloed).

## Technisch overzicht

- **Data**: `partner_purchase_invoices` DELETE × 6, `program_request_items` UPDATE × 6 — via `insert`-tool (geen schema-wijziging nodig).
- **Code**: `src/pages/PartnerFinance.tsx` (display + totalen), `src/components/partner-portal/RegisterCollectivePartnerInvoiceDialog.tsx` (default-amount). Edge functions en types blijven ongewijzigd.
- **Geen wijziging** in `update-partner-item-status`: we vullen `quoted_price` niet automatisch met de schatting in DB (blijft een echte partner-input). De fallback is puur op leeslaag — daardoor blijft het verschil tussen "bevestigde prijs" en "admin-inschatting" auditable.

## Open vraag

Wil je dat ik bij Stap A `commission_status` op `'not_applicable'` zet (zoals nu standaard) of bewust op `NULL` zodat de commissie-berekening straks bij hernieuwde facturatie schoon opnieuw begint? Voorstel: `'not_applicable'` — dat is consistent met items die nog nooit gefactureerd zijn.  
  
Not applicable doen graag. 