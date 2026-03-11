

# Slimme statusberichten en afwijsredenen bij logiesaanvragen

## Probleem

Wanneer alle benaderde partners hebben afgewezen (bv. 5 van 5), toont het systeem nog steeds "U ontvangt een email zodra er offertes binnenkomen." Dat is misleidend — er komen geen offertes meer. Daarnaast worden de redenen van afwijzing niet getoond aan de klant.

## Aanpak

### 1. Intelligente statusberichten op basis van situatie

Drie scenario's in de "wachtend" state:

| Situatie | Bericht |
|---|---|
| Alle afgewezen (`declined >= requested`) | Rode/oranje waarschuwing: "Helaas hebben alle benaderde partners afgewezen. Bureau Vlieland zoekt naar alternatieven en neemt contact met u op." |
| Deels afgewezen, nog wachtend | Huidige tekst behouden + "Wij wachten nog op X partner(s)." |
| Nog niemand gereageerd | Huidige tekst behouden |

De progress bar wordt aangepast: bij alle afgewezen geen progress bar meer, maar een duidelijke call-to-action of informatief blok.

### 2. Afwijsredenen tonen

- **Data**: De `partner_notes` van declined quotes bevatten de afwijsreden. Deze worden nu niet opgehaald in het klantportaal.
- **Query aanpassen**: In `useCustomerProgram.ts` ook `declined` quotes ophalen (naast submitted/selected/expired).
- **UI**: Onder het statusbericht een beknopt overzicht tonen van afwijsredenen (geanonimiseerd — alleen de reden, niet de partnernaam), bv:
  - "Geen beschikbaarheid op de gevraagde data"
  - "Groep te groot voor de accommodatie"
- Gegroepeerd als een compact lijstje met een `Info` icoon.

### 3. Bestanden die worden aangepast

- **`src/hooks/useCustomerProgram.ts`** — Query uitbreiden om declined quotes op te halen
- **`src/components/customer-portal/AccommodationSection.tsx`** — State 4 (wachtend) opsplitsen in sub-states; afwijsredenen tonen
- **`src/components/accommodation-portal/AccommodationStatusBanner.tsx`** — Zelfde logica doorvoeren voor het logiesportaal
- **`src/types/accommodation.ts`** — Eventueel type uitbreiden als nodig

### Technische details

De declined quotes worden gefilterd en alleen hun `partner_notes` wordt gebruikt voor weergave. Partnernamen worden niet getoond aan de klant om de relatie neutraal te houden. Dubbele redenen worden gededupliceerd.

