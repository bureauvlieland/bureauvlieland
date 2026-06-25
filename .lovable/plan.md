## Doel
Vervolgfacturen (bijv. FV-BV-2605-0001-002) moeten voor de klant-boekhouding volledig zelfstandig leesbaar zijn: alle projectposten, BTW-uitsplitsing, "Reeds gefactureerd" met factuurnummers, en een netto te betalen bedrag met correct BTW-deel over alléén het restant.

## Wijzigingen

### 1. `src/pages/admin/AdminInvoicePreview.tsx`
- Slot-mode short-circuit in `buildPdfBlob` (regels ~523–555) verwijderen: geen losse "Slotfactuur"-regel meer.
- `mode=slot` blijft geaccepteerd voor backwards compat maar rendert identiek aan `full`.
- `priorInvoices` altijd doorgeven aan de renderer.
- Scherm-preview onder de slot-tak vervangen door dezelfde volledige tabel als full-mode, zodat scherm en PDF identiek zijn.

### 2. `src/lib/invoicePdfRenderer.ts` — BTW-logica
Renderer berekent en toont twee BTW-blokken:

1. **BTW over projecttotaal** (informatief, helpt klant projectadministratie sluitend te maken):
   - Per tarief: excl, BTW, incl over het hele project.

2. **BTW over deze factuur** (fiscaal leidend op deze factuur):
   - Per BTW-tarief de pro-rata aandeel berekenen:
     - `aandeel_tarief = (project_incl_tarief / project_incl_totaal)`
     - `restant_incl_tarief = netto_te_betalen × aandeel_tarief`
     - `restant_excl_tarief = restant_incl_tarief / (1 + tarief)`
     - `restant_btw_tarief = restant_incl_tarief − restant_excl_tarief`
   - Som van `restant_btw_tarief` over alle tarieven = BTW die op deze factuur wordt aangegeven.
   - Afrondingsverschillen opvangen door laatste tariefregel te corrigeren zodat totaal exact klopt.

Layout onderaan PDF:
```
Projecttotaal incl. BTW          € X
  BTW 21% / 9% / 0% over project (specificatie)
Reeds gefactureerd
  FV-…-001 · 12-06-2026          − € Y
Te betalen                        € Z
  waarvan BTW 21%                 € a
  waarvan BTW  9%                 € b
  waarvan BTW  0%                 € c
```

### 3. Edge case: laatste factuur met afrondingsverschil
Als `netto_te_betalen` door eerdere afrondingen ±0,01 afwijkt, wordt het verschil op de hoogste BTW-categorie gecorrigeerd zodat het totaal van "waarvan BTW" exact gelijk is aan projecttotaal-BTW − reeds-gefactureerde-BTW.

### 4. Geen DB-wijzigingen
`bureau_invoices` en bestaande `priorInvoices`-koppeling werken al; alleen presentatie en BTW-berekening op de PDF veranderen.

## Resultaat
- Klant ziet de volledige projectspecificatie voor zijn boekhouding.
- Klant ziet duidelijk welke BTW hij op déze factuur als voorbelasting boekt (alleen over het restant).
- Optelling van BTW over alle deelfacturen = BTW over het projecttotaal, zonder dubbeltellingen.
