## Doel
Subtiel maar consistent communiceren dat Bureau Vlieland trotse ambassadeur is van Waddenzee Werelderfgoed. Versterkt het duurzaamheidsverhaal en past natuurlijk bij de natuurbijdrage-uitleg.

## Aanpak — herbruikbare badge-component
Eén nieuwe component `src/components/WaddenAmbassadeurBadge.tsx` met varianten (`compact` / `stacked` / `icon`) en optionele info-popover. Logo komt uit `src/assets/ambassadeur-waddenzee-werelderfgoed.png` (geüpload bestand wordt gekopieerd).

### Popover-tekst
> "Het ambassadeursprogramma Waddenzee Werelderfgoed is een initiatief van het ministerie van LNV, naar voorbeeld uit Duitsland en Denemarken. Het verbindt organisaties in het Nederlandse waddengebied die kennis hebben van de Werelderfgoed-status én duurzaam ondernemen."

Met link naar `waddenzeewerelderfgoed.nl/ambassadeurs`.

## Plaatsingen (3 stuks, subtiel)

### 1. Footer website — `src/components/Footer.tsx`
Onderaan de bottom-bar (naast © + Algemene Voorwaarden) een kleine `compact` badge met info-popover. Zichtbaar op alle pagina's, niet opdringerig.

### 2. Klantportal sidebar — `src/components/customer-portal/ProgramSidebar.tsx`
Direct onder het bestaande "Toeristenbelasting / Natuurbijdrage"-blok een dunne scheidslijn + `compact` badge. Versterkt het verhaal: "wij dragen bij aan natuurbeheer én zijn ambassadeur".

### 3. Offerte & factuur PDF — `src/pages/admin/AdminInvoicePreview.tsx` (en analoog `AdminQuotePreview.tsx` indien identieke footer)
Klein logo (`icon` variant, ~40px) onderaan de PDF-footer naast de bedrijfsgegevens / KvK-regel. Geen popover (PDF), maar wél de tekst "Trotse ambassadeur Waddenzee Werelderfgoed" eronder.

## Niet in scope
- Geen aparte landingspagina of uitgebreid blok op Over Ons (kan later).
- Geen wijziging aan e-mailtemplates (kan in vervolgstap; ferry/bevestigingsmails behouden hun huidige opmaak).
- Geen instelling om het uit te zetten — staat altijd aan zolang Bureau Vlieland ambassadeur is.

## Bestanden
- **Nieuw**: `src/assets/ambassadeur-waddenzee-werelderfgoed.png` (kopie van upload)
- **Nieuw**: `src/components/WaddenAmbassadeurBadge.tsx`
- **Bewerken**: `src/components/Footer.tsx`, `src/components/customer-portal/ProgramSidebar.tsx`, `src/pages/admin/AdminInvoicePreview.tsx`
