
# Herpositionering Klantportaal "Jouw Programma"

## ✅ STATUS: GEÏMPLEMENTEERD

Deze herpositionering is volledig geïmplementeerd op 29 januari 2026.

---

## Samenvatting
Een volledige herpositionering van de klantomgeving met focus op zakelijke tone of voice, partnerschap in plaats van platform-gevoel, en een verbeterde visuele hiërarchie. De wijzigingen omvatten een nieuw programma-overzicht, een herschreven logies-banner, een verbeterd statusblok en een waarschuwingsflow bij bevestigen zonder logies.

---

## Geïmplementeerde wijzigingen

### ✅ 1. Nieuw: Programma-overzicht blok (bovenkant)
**Bestand:** `src/components/customer-portal/ProgramOverviewCard.tsx` (nieuw)

- Nieuw overzichtsblok met zakelijke titel en subtekst
- Toont datum, groepsgrootte, programma-type, en logies-status
- Geïntegreerd in Desktop- en MobileProgramView

---

### ✅ 2. Logies-banner herschreven
**Bestand:** `src/components/customer-portal/AccommodationSection.tsx`

**Nieuwe tekst:**
- Titel: "Meerdaags verblijf? Wij helpen graag met passende logies."
- Subtekst: "Een sterk programma begint met comfortabele en beschikbare accommodatie. Wij vragen vrijblijvend offertes aan bij geschikte locaties en voegen deze toe aan uw programma."
- Knop: "Logies laten regelen"
- Microcopy: "Vrijblijvend. U ontvangt binnen 2 werkdagen passende voorstellen."

---

### ✅ 3. Statusblok met checklist-variant
**Bestanden:** `src/components/customer-portal/StatusSummary.tsx`, `src/components/customer-portal/ProgramSidebar.tsx`

Nieuwe "checklist" variant met:
- ✓ Activiteiten bevestigd
- ✓ Facturatiegegevens compleet
- ○ Logies geregeld (alleen bij meerdaags)
- ○ Voorwaarden geaccepteerd

---

### ✅ 4. Waarschuwing bij bevestigen zonder logies
**Bestand:** `src/components/customer-portal/AccommodationWarningDialog.tsx` (nieuw)

- Toont bij ondertekenen van meerdaags programma zonder geselecteerde logies
- Twee opties: "Logies laten regelen via Bureau Vlieland" of "Doorgaan zonder logies"
- Geïntegreerd in AcceptTermsCard

---

### ✅ 5. Logies-sectie conditioneel tonen
**Bestanden:** `DesktopProgramView.tsx`, `MobileProgramView.tsx`

- Logies-sectie wordt nu alleen getoond bij meerdaagse programma's (selectedDates.length > 1)
- ProgramOverviewCard staat altijd bovenaan

---

## Bestandsoverzicht

| Bestand | Type | Status |
|---------|------|--------|
| `ProgramOverviewCard.tsx` | Nieuw | ✅ Geïmplementeerd |
| `AccommodationWarningDialog.tsx` | Nieuw | ✅ Geïmplementeerd |
| `AccommodationSection.tsx` | Aangepast | ✅ Tekst herschreven |
| `StatusSummary.tsx` | Uitgebreid | ✅ Checklist variant toegevoegd |
| `ProgramSidebar.tsx` | Aangepast | ✅ Nieuwe variant + props |
| `DesktopProgramView.tsx` | Aangepast | ✅ Overview card + conditionele logies |
| `MobileProgramView.tsx` | Aangepast | ✅ Overview card + conditionele logies |
| `AcceptTermsCard.tsx` | Aangepast | ✅ Warning dialog geïntegreerd |

---

## Tone of Voice Transformatie

**Kernprincipe:** "Wij begeleiden uw zakelijke verblijf"

| Aspect | Oud | Nieuw |
|--------|-----|-------|
| Positionering | Platform/Marketplace | Partner/Regisseur |
| Actie-taal | "Selecteer", "Zoek", "Begin met" | "Wij verzorgen", "Wij regelen", "Wij stemmen af" |
| Relatie | Transactioneel | Begeleidend |
| Gevoel | Zelf bouwen | Samen zorgeloos |

**Kernboodschap:**
> "Stel samen, wij begeleiden."
