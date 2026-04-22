

## Factuur-PDF herbouwen naar A4 + juridisch volledige bedrijfsgegevens

### Probleem
- Huidige PDF gebruikt `jsPDF.html()` wat onbetrouwbaar pagineert (afgeknipte tekst, geen marges, dubbele tekst).
- Wettelijk verplichte gegevens ontbreken: volledig bezoekadres (straat + postcode + plaats apart), telefoon, website, IBAN, KvK, BTW, juridische naam (B.V.), leverdatum.
- Layout volgt niet de Snelstart-conventie die Bureau Vlieland gewend is.

### Aanpak
Twee delen: **(1)** ontbrekende bedrijfsgegevens uitbreiden in `app_settings`. **(2)** factuur-PDF volledig herschrijven met native jsPDF (geen html2canvas), met de Snelstart-look.

---

### 1. Bedrijfsgegevens uitbreiden in `app_settings`

Migratie voegt nieuwe rijen toe (categorie `bureau`):

| id | Voorbeeldwaarde | Doel |
|---|---|---|
| `bureau_legal_name` | "Bureau Vlieland B.V." | Juridische naam (B.V.) |
| `bureau_street` | "Sikkelduin 11" | Straat + huisnummer |
| `bureau_postal_code` | "8899 CG" | Postcode |
| `bureau_city` | "Vlieland" | Plaats |
| `bureau_phone` | "+31 562 700 208" | Telefoon |
| `bureau_website` | "bureauvlieland.nl" | Website |
| `bureau_payment_term_days` | 14 | Standaard betaaltermijn (number) |

`bureau_address` (legacy losse string) wordt niet verwijderd maar genegeerd; de losse velden vormen voortaan de bron van waarheid. Bestaande velden `bureau_company_name`, `bureau_iban`, `bureau_kvk_number`, `bureau_vat_number`, `bureau_admin_email` blijven gebruikt.

Toelichting: deze worden zichtbaar in **Beheer → Instellingen** zodat je ze zelf kunt invullen/aanpassen — geen hardcoded gegevens.

---

### 2. PDF compleet herschrijven (`AdminInvoicePreview.tsx` `buildPdfBlob`)

`jsPDF.html()` weg. Nieuwe `renderInvoicePdf(pdf, data)` tekent native met `pdf.text()`, `pdf.line()`, `pdf.rect()`, `pdf.addImage()`. Voordelen: scherp, geen schaalproblemen, automatische paginering met herhaalde header.

**Layout — Pagina 1**

```text
┌────────────────────────────────────────────────────────────┐
│ [LOGO]                              Bureau Vlieland B.V.   │  ← top header
│                                     Sikkelduin 11          │     20mm hoog
│                                     8899 CG Vlieland       │
│                                     t  +31 562 700 208     │
│                                     e  erwin@…             │
│                                     i  bureauvlieland.nl   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Factuur                                                   │  ← "Factuur" titel
│                                                            │
│  Klantnaam (bedrijf)             Factuurnummer  FV-…-001   │
│  Contactpersoon                  Factuurdatum   07-11-2026 │
│  Straat                          Vervaldatum    21-11-2026 │
│  Postcode + plaats               Betalingstermijn 14 dagen │
│  BTW-nr klant (indien)           Klantnummer    BV-2602-…  │
│                                  Leverdatum     03-07-2026 │
│                                                            │
│ ┌── Betaalgegevens ─────────────────────────────────────┐  │
│ │ Te betalen      € 6.428,03 (voor 21-11-2026)          │  │
│ │ Naar IBAN       NL68 INGB 0774 1221 37                │  │
│ │ Op naam van     Bureau Vlieland B.V.                  │  │
│ │ Omschrijving    Factuur FV-2602-0006-001              │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                            │
│  Omschrijving               Aantal    Prijs      Totaal    │  ← regels-tabel
│  ──────────────────────────────────────────────────────    │
│  [CATEGORIE-LABEL]                                         │
│   Item 1 / activiteit         9      40,00       360,00    │
│   Item 2 …                                                 │
│   …                                                        │
│                                                            │
│ ── pagina-overgang ──                                      │
│                                          IBAN …  KvK …     │  ← footer
└────────────────────────────────────────────────────────────┘
```

**Pagina 2+** herhaalt automatisch:
- Verkleinde header (logo + bedrijfsadres rechts)
- "Factuur" + factuurnummer + klant
- Vervolg van regels-tabel met dezelfde kolomkoppen

**Onderaan laatste pagina** — totalenblok exact als Snelstart:

```text
Btw %    Grondslag    Bedrag           Totaal excl. btw   €  5.654,26
0,00         25,23      0,00           Totaal btw         €    773,77
9,00      3.402,71    306,24           Te betalen         €  6.428,03
21,00     2.226,32    467,53                                         
```

**Eronder** — juridische / betalings-block over volle breedte:

```text
Voorwaarden: Betaling binnen 14 dagen na factuurdatum onder vermelding van het 
factuurnummer FV-2602-0006-001. Op deze factuur zijn onze algemene voorwaarden 
van toepassing (bureauvlieland.nl/voorwaarden).

Bureau Vlieland B.V.   IBAN NL68 INGB 0774 1221 37   BTW NL864565045B01   KvK 88285774
```

**Vaste footer op elke pagina** (klein, grijs, gecentreerd):
`Pagina X / Y   •   Bureau Vlieland B.V.   •   bureauvlieland.nl`

**A4 specs**:
- Formaat A4 portrait (210×297 mm)
- Marges: 18mm links/rechts, 18mm top, 22mm bottom (footer-ruimte)
- Lettertypes jsPDF builtin: `helvetica` normal/bold (geen custom font nodig)
- Lijnkleuren: donkerblauw `#1e3a5f` voor scheidingslijnen, lichtgrijs `#e2e8f0` voor rij-separators
- Logo: `src/assets/logo.png` ingelezen via `import` + base64 conversie, ~30mm breed top-left

**Pagineringsalgoritme**:
1. Bouw eerst alle regels op als array (categorie-headers + item-rijen + accommodatie + extras + coördinatie/heffingen).
2. Bereken per rij de hoogte (1-3 regels tekst, ~5mm per regel).
3. Loop: als `currentY + rowHeight > pageHeight - bottomMargin - totalsHeight (alleen laatste pagina)`, roep `pdf.addPage()` + render headerVervolg.
4. Totalenblok komt op de laatste pagina; als er geen ruimte is voor totalenblok, forceer extra pagina.

**Inhoud van regels** (ongewijzigd t.o.v. huidige preview, alleen gerenderd):
- Programma-items per categorie, met billing_lines als subrijen.
- Logies (1 regel met aantal nachten in toelichting).
- Extra's bij logies (per extra een regel).
- Coördinatie & bijdragen: coördinatiekosten, opslag centrale facturatie, toeristenbelasting, natuurbijdrage.

**HTML-preview blijft bestaan** (read-only on-screen), maar de PDF wordt onafhankelijk getekend zodat de gedownloade/verstuurde PDF altijd consistent en scherp is. De preview blijft ook gesynced doordat dezelfde bron-data en `calculateTotals()` worden gebruikt.

---

### Bestanden die wijzigen

- **Migratie** (nieuwe app_settings rijen): `bureau_legal_name`, `bureau_street`, `bureau_postal_code`, `bureau_city`, `bureau_phone`, `bureau_website`, `bureau_payment_term_days`.
- `src/pages/admin/AdminInvoicePreview.tsx` — `buildPdfBlob` herschreven naar native jsPDF rendering; nieuwe `renderInvoicePdf()` helper inline. HTML-preview krijgt ook de nieuwe velden in de header zodat preview = PDF.
- `src/pages/admin/AdminAppSettings.tsx` (of vergelijkbaar instellingenscherm) — toont nieuwe velden in sectie "Bedrijfsgegevens" zodat je ze kunt vullen. Als er geen UI-sectie bestaat, voegen we er één toe.
- `src/lib/appSettings.ts` (FALLBACK_SETTINGS) — defaults voor de nieuwe sleutels.
- `src/types/appSettings.ts` — type-uitbreiding voor `AppSettingsMap`.

### Niet in scope

- Geen wijziging aan factuur-totaal/regels-berekening (die is in vorige iteratie al gesynchroniseerd).
- Geen e-mailtemplate-wijziging (bijlage-PDF wordt automatisch de nieuwe versie).
- Geen creditfactuur-/herinneringslayout — alleen reguliere factuur.

