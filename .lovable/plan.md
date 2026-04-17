

## Diagnose

**1. Financieel Overzicht (screenshot)**
`FinancialOverviewCard` rekent nu uitsluitend met `quoted_price` / `admin_price_override`. De definitieve factuurregels uit `program_item_billing_lines` (die je per onderdeel hebt vastgelegd) worden hier genegeerd, terwijl `AdminInvoicePreview` ze al wél gebruikt. Daardoor matcht het overzicht niet meer met de factuur zodra je nacalculatie hebt ingevoerd.

**2. PDF van de factuur**
- `html2canvas` rendert op `scale: 2` waardoor het preview-formaat (text-[13px]) klein/wazig wordt op A4. Body komt eigenlijk overeen met ~9pt op print.
- Veel cijfers (`Aantal`, `Prijs`, `Bedrag`) gebruiken `text-right` maar getallen wisselen lengte → kolommen ogen rommelig zonder tabular-nums.
- Categorie-headers in lichtblauw (#f1f5f9) verdwijnen bij het canvas-renderen soms half.
- Headerbalk donkerblauw + witte tekst geeft contrast-issues op sommige printers.
- Geen pagina-marge / herhaling van header op pagina 2.

## Plan

### A. `FinancialOverviewCard` — billing lines verwerken
- Nieuwe prop `linesByItem: Record<string, ProgramItemBillingLine[]>` (ophalen via `useItemBillingLinesBatch` in de parent `AdminRequestDetail`).
- Per item: indien `linesByItem[item.id]` bestaat → toon **subregels** onder het item (omschrijving + bedrag + BTW%) en gebruik som van `amount_incl_vat` als itemtotaal i.p.v. `getLineTotal`.
- Visuele indicator naast itemnaam: kleine groene badge "definitief" wanneer billing lines aanwezig.
- BTW-breakdown onderaan: bij billing lines per BTW-tarief sommeren over `amount_excl_vat` en `vat_amount` (groep-afronding, geen regel-afronding) — voorkomt cent-verschillen met de factuur.

### B. `AdminRequestDetail` — lines doorgeven
- `useItemBillingLinesBatch(items.map(i=>i.id))` invoegen en doorgeven aan `FinancialOverviewCard`.

### C. `AdminInvoicePreview` — PDF opmaak verbeteren
- **Font/leesbaarheid:** preview-container van `text-[13px]` → `text-[11px]` met `leading-snug`; tabel `text-[10.5px]` zodat exporteerd PDF op A4 een prettige 9–10pt geeft (na html2canvas `scale: 2`).
- **Tabular numbers:** `font-variant-numeric: tabular-nums` op alle prijs/aantal/bedrag-kolommen → kolommen lijnen netjes uit.
- **Kolombreedtes vastzetten:** `Omschrijving` flex, `Aantal` 60px, `Prijs` 90px, `Bedrag` 90px (i.p.v. tailwind w-24/28 die in canvas wisselen).
- **Categorie-headers:** lichtere achtergrond + duidelijke top-border; tekst `text-[10px]` uppercase met meer letter-spacing.
- **Header company:** logo-blok + bedrijfsnaam links, "FACTUUR" rechts in 24pt.
- **Tabel header:** donkerblauwe rij vervangen door dunne dubbele border boven/onder + uppercase grijze tekst → printvriendelijker en minder zwaar.
- **Subregels (billing lines):** in plaats van eigen rij per regel → **één hoofdregel per item** met onderaan kleine indented subregels (omschrijving + bedrag + BTW%); itemtotaal staat naast de hoofdrij. Dit voorkomt visueel "exploderen" van facturen met veel splits.
- **Totalenblok:** breder (96 i.p.v. 72) + subtotaal/BTW/totaal met duidelijke scheiding; BTW-regels per tarief met "BTW 9% over €X.XX" voor transparantie.
- **PDF-render verbeteringen:**
  - `html2canvas` `scale: 3` voor scherpere tekst (tradeoff: bestand wat groter, prima voor facturen).
  - Pagina-breaks: detecteer wanneer items niet meer op pagina passen → splits tabel per categorie i.p.v. één lange image (alternatief: `windowHeight` setting voor betere chunking).
  - Margins in PDF: `addImage` met 10mm offset i.p.v. 0 zodat content niet tot aan de rand loopt.
- **Footer:** vaste bedrijfsgegevens-rij in 8.5pt grijs; ruimte voor "Op alle leveringen zijn onze algemene voorwaarden van toepassing."

### Bestanden
- `src/components/admin/FinancialOverviewCard.tsx` — billing-lines integratie + sub-rendering
- `src/pages/admin/AdminRequestDetail.tsx` — `useItemBillingLinesBatch` + prop doorgeven
- `src/pages/admin/AdminInvoicePreview.tsx` — opmaak/typografie/render-pijplijn

### Buiten scope
- Klantportaal `PriceSummaryCard` ook updaten met billing lines (volgende stap — financieel overzicht eerst stabiel krijgen).
- Echte logo-image in PDF header (vereist asset-keuze).
- PDF-templating naar server-side rendering (langere refactor; canvas-aanpak blijft voorlopig).

